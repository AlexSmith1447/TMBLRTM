import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {onRequestPost as accountLogin} from "../functions/api/account.js";
import {onRequestPost as visualPost} from "../functions/api/visual.js";
globalThis.crypto ||= webcrypto;

const base="https://tmblrtm.pages.dev";
const img="https://64.media.tumblr.com/test/s540x810/legacy.jpg";
const legacy={id:"9876543210123",blog:"legacy-blog",timestamp:1350000000,
 images:[img],imageCandidates:[],title:"2012 photo",tags:["photography"],notes:4};
class DB{
 constructor(){this.item={id:legacy.id,payload:JSON.stringify(legacy),visual:0,vector:JSON.stringify(Array(256).fill(0))};this.dayCount=0;this.repairCount=0;}
 prepare(sql){
  const db=this;
  return {params:[],bind(...args){this.params=args;return this},
   async run(){
    const a=this.params;
    if(sql.startsWith("UPDATE tm_visual_budget"))db.dayCount+=a[0];
    if(sql.startsWith("INSERT INTO tm_visual_repair_attempts"))db.repairCount++;
    if(sql.startsWith("UPDATE tm_visual_posts SET vector=")){
      assert.equal(a[2],db.item.id);db.item.visual=1;db.item.vector=a[0];
    }
    return {success:true};
   },
   async first(){
    if(sql.includes("FROM tm_login_limits"))return null;
    if(sql.includes("FROM tm_profile"))return {name:"Wesley1337",avatar:""};
    if(sql.includes("FROM tm_visual_budget"))return {indexed:db.dayCount};
    if(sql.includes("FROM tm_visual_posts"))return {total:1,images:db.item.visual};
    return null;
   },
   async all(){
    if(sql.includes("SELECT p.id,p.payload FROM tm_visual_posts")){
     return {results:db.item.visual?[]:[{id:db.item.id,payload:db.item.payload}]};
    }
    if(sql.includes("FROM tm_items"))return {results:[]};
    return {results:[]};
   }
  }
 }
 async batch(statements){return Promise.all(statements.map(s=>s.run()))}
}
const db=new DB();
let aiCalls=0,photoDownloads=0;
const env={
 TM_DB:db,TM_ACCOUNT_PASSWORD:"test-only unique password never production",
 AI:{async run(model,payload){
  assert.equal(model,"@cf/google/embeddinggemma-2");
  aiCalls++;
  assert.ok(payload.messages,"Repair should use real image inference, not caption fallback");
  return {data:[{embedding:Array.from({length:256},(_,i)=>i===0?1:0)}]};
 }}
};
const req=new Request(base+"/api/account",{
 method:"POST",headers:{"Content-Type":"application/json",Origin:base},
 body:JSON.stringify({action:"login",password:env.TM_ACCOUNT_PASSWORD})
});
const login=await accountLogin({request:req,env});
assert.equal(login.status,200);
const cookie=login.headers.get("Set-Cookie").split(";")[0];
const repairRequest=withCookie=>new Request(base+"/api/visual",{
 method:"POST",headers:{"Content-Type":"application/json",Origin:base,...(withCookie?{Cookie:cookie}:{})},
 body:JSON.stringify({action:"upgrade"})
});
const original=globalThis.fetch;
try{
 globalThis.fetch=async url=>{
  assert.equal(String(url),img);
  photoDownloads++;
  return new Response(new Uint8Array([255,216,255,224,74,70,73,70,1,1,2,3]),
    {headers:{"Content-Type":"image/jpeg","Content-Length":"12"}});
 };
 assert.equal((await visualPost({request:repairRequest(false),env})).status,401,
  "Anonymous visitors must not trigger expensive repair");
 const result=await visualPost({request:repairRequest(true),env});
 assert.equal(result.status,200);
 const report=await result.json();
 assert.equal(report.attempted,1);
 assert.equal(report.upgraded,1);
 assert.equal(report.imageEmbeddings,1);
 assert.equal(db.item.visual,1);
 assert.equal(photoDownloads,1);
 assert.equal(aiCalls,1);
 assert.equal(db.dayCount,1,"Repair uses daily AI budget");
 const repeat=await visualPost({request:repairRequest(true),env});
 assert.equal((await repeat.json()).attempted,0,"Already-upgraded images must not repeat");
 assert.equal(aiCalls,1);
 console.log("Authenticated legacy image repair stored an actual AI visual vector");
}finally{globalThis.fetch=original}
