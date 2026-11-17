/**
 * Private, ephemeral image-driven discovery for Tumblr Time Machine.
 *
 * Cloudflare bindings: TM_DB (D1), AI (Workers AI).
 * Authenticated through the project's private pseudo-account session.
 * Post metadata and generated vectors are cached for at most 60 hours;
 * never bulk-mirror Tumblr or archive media bytes.
 */
import {isAccountAuthorized} from "./account.js";
import {VISUAL_MODEL,VISUAL_DIMENSIONS,normalizedVector,safePost,scoreCandidates} from "../../src/visualRanking.js";

const RETENTION=60*60*60,MAX_POSTS=5,DAILY_BUDGET=120;
const output=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{
 "Content-Type":"application/json;charset=utf-8","Cache-Control":"private,no-store",
 "X-Content-Type-Options":"nosniff"
}});
const configured=env=>Boolean(env?.TM_DB&&env?.AI);
const appReady=env=>configured(env)&&typeof env.TM_DB.prepare==="function"&&typeof env.AI.run==="function";
const now=()=>Math.floor(Date.now()/1000);
async function prepare(db){
 await db.prepare("CREATE TABLE IF NOT EXISTS tm_visual_posts (id TEXT PRIMARY KEY, blog TEXT NOT NULL, timestamp INTEGER NOT NULL, expires_at INTEGER NOT NULL, payload TEXT NOT NULL, vector TEXT NOT NULL, visual INTEGER NOT NULL DEFAULT 0)").run();
 await db.prepare("CREATE INDEX IF NOT EXISTS idx_tm_visual_expires ON tm_visual_posts(expires_at)").run();
 await db.prepare("CREATE TABLE IF NOT EXISTS tm_visual_budget (day TEXT PRIMARY KEY, indexed INTEGER NOT NULL DEFAULT 0)").run();
}
const sameOrigin=req=>{const origin=req.headers.get("Origin");return !!origin&&origin===new URL(req.url).origin};
function safeMedia(url){
 if(typeof url!=="string"||url.length>1900)return null;
 try{
  const u=new URL(url);
  if(u.protocol!=="https:"||u.username||u.password||u.port)return null;
  const host=u.hostname.toLowerCase();
  if(!(host==="media.tumblr.com"||host.endsWith(".media.tumblr.com")||host==="static.tumblr.com"||host.endsWith(".static.tumblr.com")))return null;
  return u.toString();
 }catch{return null}
}
async function imageData(url){
 const safe=safeMedia(url);if(!safe)return null;
 try{
  const res=await fetch(safe,{redirect:"error",signal:AbortSignal.timeout(7000)});
  if(!res.ok)return null;
  const type=(res.headers.get("content-type")||"").split(";")[0].trim();
  if(!["image/jpeg","image/png","image/webp"].includes(type))return null;
  const length=Number(res.headers.get("content-length")||0);
  if(length>1250000)return null;
  const bytes=new Uint8Array(await res.arrayBuffer());
  if(!bytes.length||bytes.length>1250000)return null;
  let str="";for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return "data:"+type+";base64,"+btoa(str);
 }catch{return null}
}
function extract(result){
 const candidate=result?.data?.[0]?.embedding||result?.data?.[0]?.values||result?.data?.[0]||
  result?.embedding||result?.result?.data?.[0]?.embedding||result?.result?.embedding;
 if(Array.isArray(candidate))return normalizedVector(candidate);
 if(Array.isArray(candidate?.[0]))return normalizedVector(candidate[0]);
 return null;
}
function describe(post){
 const raw=[post.title,post.tags.join(" "),post.text,post.quote].filter(Boolean).join(". ").slice(0,700);
 return "title: "+(post.title||"none")+" | text: "+(raw||"Tumblr photo");
}
async function embed(env,post){
 const uri=await imageData(post.images?.[0]);
 if(uri){
  try{
   const result=await env.AI.run(VISUAL_MODEL,{
    messages:[{role:"user",content:[
     {type:"text",text:describe(post).slice(0,480)},
     {type:"image_url",image_url:{url:uri}}
    ]}],dimensions:VISUAL_DIMENSIONS
   });
   const vector=extract(result);if(vector)return {vector,visual:true};
  }catch{}
 }
 // Even when the original Tumblr image is gone or an unsupported animated GIF,
 // an ordinary caption can still contribute to retrieval. Never present it as
 // an image embedding.
 const result=await env.AI.run(VISUAL_MODEL,{input:[describe(post)],dimensions:VISUAL_DIMENSIONS});
 const vector=extract(result);
 return vector?{vector,visual:false}:null;
}
async function cleanup(db){
 await db.prepare("DELETE FROM tm_visual_posts WHERE expires_at<=?").bind(now()).run();
}
async function remaining(db){
 const day=new Date().toISOString().slice(0,10);
 await db.prepare("INSERT OR IGNORE INTO tm_visual_budget(day,indexed) VALUES(?,0)").bind(day).run();
 const row=await db.prepare("SELECT indexed FROM tm_visual_budget WHERE day=?").bind(day).first();
 return {day,left:Math.max(0,DAILY_BUDGET-(Number(row?.indexed)||0))};
}
async function indexBatch(db,env,posts){
 await prepare(db);await cleanup(db);
 const all=posts.map(safePost).filter(Boolean).slice(0,MAX_POSTS);
 if(!all.length)return {indexed:0,skipped:0,total:0,visual:0};
 const query=await db.prepare("SELECT id FROM tm_visual_posts WHERE id IN ("+all.map(()=>"?").join(",")+")").bind(...all.map(p=>p.id)).all();
 const old=new Set((query.results||[]).map(r=>r.id));
 const missing=all.filter(p=>!old.has(p.id));
 const budget=await remaining(db);
 if(!budget.left)return {indexed:0,skipped:all.length,total:all.length,visual:0,rateLimited:true};
 const target=missing.slice(0,budget.left);
 // Reserve capacity before performing expensive inference. A guest or untrusted
 // client cannot reach this endpoint because the owner cookie is verified.
 await db.prepare("UPDATE tm_visual_budget SET indexed=indexed+? WHERE day=?").bind(target.length,budget.day).run();
 const collected=[];
 for(const post of target){
  try{
   const data=await embed(env,post);if(!data)continue;
   collected.push({post,...data});
  }catch{} // Partial results are useful if one media item has gone missing.
 }
 if(collected.length){
  const records=collected.map(x=>db.prepare(
   "INSERT INTO tm_visual_posts(id,blog,timestamp,expires_at,payload,vector,visual) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET blog=excluded.blog,timestamp=excluded.timestamp,expires_at=excluded.expires_at,payload=excluded.payload,vector=excluded.vector,visual=excluded.visual"
  ).bind(x.post.id,x.post.blog,x.post.timestamp,now()+RETENTION,
   JSON.stringify(x.post),JSON.stringify(x.vector),x.visual?1:0));
  await db.batch(records);
 }
 return {indexed:collected.length,visual:collected.filter(x=>x.visual).length,skipped:all.length-collected.length,total:all.length};
}
async function recommendations(db,query){
 await prepare(db);await cleanup(db);
 const before=Math.min(now()+1,Number(query.get("before")||now()+1));
 if(!Number.isSafeInteger(before)||before<1230768000)return output({error:"Invalid historical date"},400);
 const seed=String(query.get("seed")||"");
 if(seed&&!/^\d{5,25}$/.test(seed))return output({error:"Invalid post ID"},400);
 const limit=Math.max(1,Math.min(48,Number(query.get("limit")||28)));
 const rows=await db.prepare("SELECT id,payload,vector,visual FROM tm_visual_posts WHERE timestamp<? AND expires_at>? ORDER BY expires_at DESC LIMIT 750").bind(before,now()).all();
 const items=(rows.results||[]).map(row=>{
  try{return {post:JSON.parse(row.payload),vector:JSON.parse(row.vector),visual:!!row.visual}}catch{return null}
 }).filter(Boolean);
 if(!items.length)return output({items:[],indexed:0,method:"embeddinggemma-2",ready:true});
 const byID=new Map(items.map(x=>[String(x.post.id),x]));
 const profile=await db.prepare("SELECT kind,item_id FROM tm_items WHERE kind IN ('like','save') ORDER BY updated_at DESC LIMIT 24").all();
 const ids=(profile.results||[]).map(x=>String(x.item_id));
 const anchors=ids.map(id=>byID.get(id)?.vector).filter(Boolean).slice(0,12);
 const seedVector=byID.get(seed)?.vector||null;
 if(seed&&!seedVector)return output({items:[],indexed:items.length,reason:"seed_not_indexed",ready:true});
 const excluded=new Set(ids);if(seed)excluded.add(seed);
 const results=scoreCandidates(items,{
  anchorVectors:seed?[]:anchors,seedVector,before,
  excludeIds:[...excluded],limit,rotation:Number(query.get("rotation")||0)
 });
 return output({items:results,indexed:items.length,anchors:anchors.length,
  visualCount:items.filter(x=>x.visual).length,
  method:"embeddinggemma-2-cosine-mmr",ready:true});
}
export async function onRequestGet({request,env}){
 const params=new URL(request.url).searchParams,mode=params.get("mode")||"recommend";
 if(mode==="status"){
  const status={configured:appReady(env),dbReady:!!env?.TM_DB,aiReady:!!env?.AI,model:VISUAL_MODEL};
  if(env?.TM_DB)try{
   await prepare(env.TM_DB);
   const r=await env.TM_DB.prepare("SELECT COUNT(*) AS total FROM tm_visual_posts WHERE expires_at>?").bind(now()).first();
   status.indexed=Number(r?.total)||0;
  }catch{status.indexed=0}
  return output(status);
 }
 if(!appReady(env))return output({error:"Visual discovery requires the D1 TM_DB and Workers AI AI bindings",code:"not_configured"},503);
 if(!await isAccountAuthorized(request,env))return output({error:"Sign in to use personalized visual discovery"},401);
 try{return await recommendations(env.TM_DB,params)}
 catch{return output({error:"Visual discovery index temporarily unavailable"},503)}
}
export async function onRequestPost({request,env}){
 if(!appReady(env))return output({error:"Visual discovery needs an AI binding and TM_DB"},503);
 if(!sameOrigin(request))return output({error:"Invalid request origin"},403);
 if(!await isAccountAuthorized(request,env))return output({error:"Sign in to index your discovery posts"},401);
 if(!/^application\/json/.test(request.headers.get("Content-Type")||""))return output({error:"Invalid content type"},415);
 if(Number(request.headers.get("Content-Length")||0)>40000)return output({error:"Request too large"},413);
 let body;try{const raw=await request.text();if(raw.length>40000)throw Error();body=JSON.parse(raw)}catch{return output({error:"Invalid input"},400)}
 if(body?.action!=="index"||!Array.isArray(body.posts)||body.posts.length>MAX_POSTS)return output({error:"Invalid discovery batch"},400);
 try{return output({ok:true,...await indexBatch(env.TM_DB,env,body.posts)})}
 catch{return output({error:"Image embedding index unavailable"},503)}
}
