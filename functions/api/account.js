/**
 * One private, synchronized Tumblr-style profile for the existing Pages site.
 * REQUIREMENTS: Cloudflare Pages binding TM_DB (D1 database) and encrypted
 * environment secret TM_ACCOUNT_PASSWORD (16+ characters recommended).
 *
 * There is no connection to a real Tumblr account, and no registration of
 * public site visitors. Profile actions are protected by signed HttpOnly
 * cookies and restricted to the one owner.
 */
const NAME="Wesley1337",COOKIE="__Host-tm_session",MONTH=60*60*24*30;
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{
 "Content-Type":"application/json;charset=utf-8","Cache-Control":"private,no-store",
 "X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer",...extra
}});
const enc=new TextEncoder();
const validID=id=>typeof id==="string"&&id.length>0&&id.length<=125&&!/[\x00-\x1f]/.test(id);
const validBlog=v=>typeof v==="string"&&/^[a-z0-9_-]{1,64}$/.test(v);
const secretOk=env=>typeof env?.TM_ACCOUNT_PASSWORD==="string"&&env.TM_ACCOUNT_PASSWORD.length>=12;
async function schema(db){
 await Promise.all([
  db.prepare("CREATE TABLE IF NOT EXISTS tm_profile (name TEXT PRIMARY KEY, avatar TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL DEFAULT 0)").run(),
  db.prepare("CREATE TABLE IF NOT EXISTS tm_items (kind TEXT NOT NULL, item_id TEXT NOT NULL, payload TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL, PRIMARY KEY(kind,item_id))").run(),
  db.prepare("CREATE TABLE IF NOT EXISTS tm_login_limits (key TEXT PRIMARY KEY, attempt_count INTEGER NOT NULL DEFAULT 0, window_start INTEGER NOT NULL DEFAULT 0)").run()
 ]);
 await db.prepare("INSERT OR IGNORE INTO tm_profile (name,avatar,updated_at) VALUES (?,'',0)").bind(NAME).run();
}
const settings=env=>({configured:Boolean(env?.TM_DB&&secretOk(env)),storageReady:Boolean(env?.TM_DB),passwordReady:secretOk(env),handle:NAME});
const cryptHash=async value=>new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(String(value))));
async function safePassword(a,b){
 const [x,y]=await Promise.all([cryptHash(a),cryptHash(b)]);
 let diff=0;for(let i=0;i<32;i++)diff|=x[i]^y[i];
 return diff===0;
}
const b64url=bytes=>btoa(Array.from(bytes,b=>String.fromCharCode(b)).join("")).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const unb64=v=>Uint8Array.from(atob(v.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
async function signingKey(secret){
 return crypto.subtle.importKey("raw",enc.encode("TumblrPrivateSessionV1:"+secret),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]);
}
async function makeSession(secret){
 const body=b64url(enc.encode(JSON.stringify({account:NAME,exp:Math.floor(Date.now()/1000)+MONTH})));
 const sig=await crypto.subtle.sign("HMAC",await signingKey(secret),enc.encode(body));
 return body+"."+b64url(new Uint8Array(sig));
}
async function authorized(req,secret){
 const cookies=req.headers.get("Cookie")||"";
 const token=cookies.split(";").map(c=>c.trim()).find(c=>c.startsWith(COOKIE+"="))?.slice(COOKIE.length+1)||"";
 if(token.length<40||token.length>1000)return false;
 const [body,sig,extra]=token.split(".");
 if(extra||!body||!sig||!/^[A-Za-z0-9_-]+$/.test(body)||!/^[A-Za-z0-9_-]+$/.test(sig))return false;
 try{
  const ok=await crypto.subtle.verify("HMAC",await signingKey(secret),unb64(sig),enc.encode(body));
  if(!ok)return false;
  const payload=JSON.parse(new TextDecoder().decode(unb64(body)));
  return payload.account===NAME&&Number(payload.exp)>Math.floor(Date.now()/1000);
 }catch{return false}
}
const cookie=(session,maxAge=MONTH)=>COOKIE+"="+session+"; Path=/; Max-Age="+maxAge+"; Secure; HttpOnly; SameSite=Lax";
const sameOrigin=req=>{
 const source=req.headers.get("Origin");
 return !!source&&source===new URL(req.url).origin;
};
const userKey=async(req,secret)=>{
 const ip=req.headers.get("CF-Connecting-IP")||"unknown";
 return b64url((await cryptHash("login:"+secret+":"+ip))).slice(0,32);
};
async function throttle(db,req,secret,failed){
 const key=await userKey(req,secret),now=Math.floor(Date.now()/1000),start=now-3600;
 const entry=await db.prepare("SELECT attempt_count,window_start FROM tm_login_limits WHERE key=?").bind(key).first();
 const hits=entry&&Number(entry.window_start)>=start?Number(entry.attempt_count)||0:0;
 if(failed){
  await db.prepare("INSERT INTO tm_login_limits(key,attempt_count,window_start) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET attempt_count=excluded.attempt_count,window_start=excluded.window_start").bind(key,hits+1,hits?entry.window_start:now).run();
 }
 return hits>=10;
}
function sanitizePost(input){
 if(!input||typeof input!=="object")return null;
 const id=String(input.id||"").slice(0,120),blog=String(input.blog||"").toLowerCase();
 if(!validID(id)||!validBlog(blog))return null;
 const text=(v,size)=>String(v||"").slice(0,size);
 const images=Array.isArray(input.images)?input.images.filter(v=>typeof v==="string"&&/^https:\/\//.test(v)).slice(0,8).map(v=>v.slice(0,2000)):[];
 return {id,blog,date:text(input.date,10),timestamp:Number(input.timestamp)||0,
  title:text(input.title,200),text:text(input.text,2200),type:text(input.type,22),quote:text(input.quote,1000),
  quoteSource:text(input.quoteSource,400),images,
  tags:Array.isArray(input.tags)?input.tags.filter(t=>typeof t==="string").slice(0,24).map(v=>v.slice(0,80)):[],
  notes:Number(input.notes)||0,url:typeof input.url==="string"&&/^https:\/\//.test(input.url)?input.url.slice(0,2000):null,
  reblogFrom:text(input.reblogFrom,80)};
}
async function getProfile(db){
 const [profile,items]=await Promise.all([
  db.prepare("SELECT name,avatar FROM tm_profile WHERE name=?").bind(NAME).first(),
  db.prepare("SELECT kind,item_id,payload FROM tm_items ORDER BY updated_at DESC LIMIT 2200").all()
 ]);
 const result={handle:NAME,avatar:profile?.avatar||"",follows:[],likes:{},saved:{},drafts:[]};
 for(const row of items.results||[]){
  if(row.kind==="follow")result.follows.push(row.item_id);
  else if(row.kind==="like"||row.kind==="save"){
   try{const obj=JSON.parse(row.payload);(row.kind==="like"?result.likes:result.saved)[row.item_id]=obj}catch{}
  }else if(row.kind==="draft"){
   try{result.drafts.push(JSON.parse(row.payload))}catch{}
  }
 }
 return result;
}
async function setItem(db,body){
 const kind=body.kind;
 if(!["follow","like","save","draft"].includes(kind))return json({error:"Invalid item category"},400);
 const id=String(body.id||"");
 if(!validID(id)||kind==="follow"&&!validBlog(id))return json({error:"Invalid item"},400);
 if(body.active===false){
  await db.prepare("DELETE FROM tm_items WHERE kind=? AND item_id=?").bind(kind,id).run();
  return json({ok:true,kind,id,active:false});
 }
 let payload="";
 if(kind==="like"||kind==="save"){
  const post=sanitizePost(body.post);if(!post||post.id!==id)return json({error:"Invalid post"},400);
  payload=JSON.stringify(post);
 }else if(kind==="draft"){
  const d=body.post;
  if(!d||typeof d!=="object")return json({error:"Invalid draft"},400);
  payload=JSON.stringify({id,title:String(d.title||"").slice(0,200),
   text:String(d.text||"").slice(0,8000),tags:String(d.tags||"").slice(0,300),
   date:String(d.date||"").slice(0,10),type:"text"});
 }
 await db.prepare("INSERT INTO tm_items(kind,item_id,payload,updated_at) VALUES(?,?,?,?) ON CONFLICT(kind,item_id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at")
  .bind(kind,id,payload,Date.now()).run();
 return json({ok:true,kind,id,active:true});
}
async function bulkImport(db,data){
 const queries=[];
 for(const name of (Array.isArray(data.follows)?data.follows:[]).slice(0,100)){
  if(validBlog(name))queries.push(db.prepare("INSERT OR IGNORE INTO tm_items(kind,item_id,payload,updated_at) VALUES('follow',?,'',?)").bind(name,Date.now()));
 }
 for(const [kind,obj] of [["like",data.likes],["save",data.saved]]){
  if(!obj||typeof obj!=="object")continue;
  for(const post of Object.values(obj).slice(0,350)){
   const p=sanitizePost(post);if(!p)continue;
   queries.push(db.prepare("INSERT OR IGNORE INTO tm_items(kind,item_id,payload,updated_at) VALUES(?,?,?,?)").bind(kind,p.id,JSON.stringify(p),Date.now()));
  }
 }
 for(const d of (Array.isArray(data.drafts)?data.drafts:[]).slice(0,100)){
  const id=String(d?.id||"");if(!validID(id))continue;
  queries.push(db.prepare("INSERT OR IGNORE INTO tm_items(kind,item_id,payload,updated_at) VALUES('draft',?,?,?)").bind(id,JSON.stringify({id,title:String(d.title||"").slice(0,200),text:String(d.text||"").slice(0,8000),date:String(d.date||"").slice(0,10),type:"text"}),Date.now()));
 }
 if(queries.length>1000)return json({error:"Too many imported items"},413);
 for(let i=0;i<queries.length;i+=60)await db.batch(queries.slice(i,i+60));
 return json({ok:true,imported:queries.length,profile:await getProfile(db)});
}
export async function onRequestGet({request,env}){
 const state=settings(env);
 if(new URL(request.url).searchParams.get("mode")==="status")return json({...state,signedIn:state.configured?await authorized(request,env.TM_ACCOUNT_PASSWORD):false});
 if(!state.configured)return json({...state,error:"Profile storage is not configured"},503);
 if(!await authorized(request,env.TM_ACCOUNT_PASSWORD))return json({error:"Sign in to access your profile",code:"unauthorized"},401);
 try{await schema(env.TM_DB);return json({profile:await getProfile(env.TM_DB)})}
 catch{return json({error:"Profile database unavailable"},503)}
}
export async function onRequestPost({request,env}){
 if(!sameOrigin(request)||!/^application\/json\b/i.test(request.headers.get("Content-Type")||""))
  return json({error:"Invalid request origin or content type"},403);
 if(Number(request.headers.get("Content-Length")||0)>190000)return json({error:"Request too large"},413);
 if(!settings(env).configured)return json({error:"Profile not configured",code:"not_configured"},503);
 let body;try{const text=await request.text();if(text.length>190000)return json({error:"Request too large"},413);body=JSON.parse(text)}
 catch{return json({error:"Malformed request"},400)}
 try{
  await schema(env.TM_DB);
  if(body?.action==="login"){
   const blocked=await throttle(env.TM_DB,request,env.TM_ACCOUNT_PASSWORD,false);
   if(blocked)return json({error:"Too many login attempts. Try later."},429);
   const ok=typeof body.password==="string"&&await safePassword(body.password,env.TM_ACCOUNT_PASSWORD);
   if(!ok){await throttle(env.TM_DB,request,env.TM_ACCOUNT_PASSWORD,true);return json({error:"Incorrect password"},401)}
   const session=await makeSession(env.TM_ACCOUNT_PASSWORD);
   return json({ok:true,profile:await getProfile(env.TM_DB)},200,{"Set-Cookie":cookie(session)});
  }
  if(body?.action==="logout")return json({ok:true},200,{"Set-Cookie":cookie("",0)});
  if(!await authorized(request,env.TM_ACCOUNT_PASSWORD))return json({error:"Sign in to save changes",code:"unauthorized"},401);
  if(body?.action==="item")return setItem(env.TM_DB,body);
  if(body?.action==="import")return bulkImport(env.TM_DB,body.profile||{});
  if(body?.action==="avatar"){
   const avatar=String(body.avatar||"");
   if(avatar&&!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar))return json({error:"Use a PNG, JPEG or WebP image"},400);
   if(avatar.length>115000)return json({error:"Image too large. Try cropping it."},413);
   await env.TM_DB.prepare("UPDATE tm_profile SET avatar=?,updated_at=? WHERE name=?").bind(avatar,Date.now(),NAME).run();
   return json({ok:true,avatar});
  }
  return json({error:"Unknown profile operation"},400);
 }catch{return json({error:"Account service unavailable"},503)}
}