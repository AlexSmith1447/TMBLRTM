import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {onRequestPost as accountLogin} from "../functions/api/account.js";
import {onRequestGet as checkVisual} from "../functions/api/visual.js";
globalThis.crypto ||= webcrypto;

class FakeD1 {
 prepare(query){
  return {params:[],bind(...p){this.params=p;return this},
   async run(){return {success:true}},
   async first(){
    if(query.includes("FROM tm_login_limits"))return null;
    if(query.includes("FROM tm_profile"))return {name:"Wesley1337",avatar:""};
    if(query.includes("AS image_count"))return {total:1,image_count:1};
    if(query.includes("COUNT(*)"))return {total:1};
    return null;
   },
   async all(){
    if(query.includes("SELECT payload FROM tm_visual_posts"))
     return {results:[{payload:JSON.stringify({images:["https://64.media.tumblr.com/large-original.jpg"],imageCandidates:["https://64.media.tumblr.com/animated.gif","https://64.media.tumblr.com/resized.jpg"]})}]};
    return {results:[]};
   }
  };
 }
}
const basis=i=>Array.from({length:256},(_,j)=>j===i?1:0);
const output1=basis(0),output2=basis(1);
let modelCalls=0,mediaCalls=0;
const env={
 TM_DB:new FakeD1(),
 TM_ACCOUNT_PASSWORD:"a strong test password unlike a common real password",
 AI:{async run(model,payload){
  assert.equal(model,"@cf/google/embeddinggemma-2");
  assert.equal(payload.dimensions,256);
  modelCalls++;
  if(Array.isArray(payload.input))return {data:[{embedding:output1},{embedding:output2}]};
  if(Array.isArray(payload.messages)){
   assert.ok(Array.isArray(payload.messages[0]));
   assert.equal(payload.messages[0][0].content[1].type,"image_url");
   assert.match(payload.messages[0][0].content[1].image_url.url,/^data:image\/jpeg;base64,/);
   return {data:[{embedding:output1}]};
  }
  throw Error("Invalid request");
 }}
};
const base="https://tmblrtm.pages.dev";
const loginReq=new Request(base+"/api/account",{
 method:"POST",headers:{"Content-Type":"application/json","Origin":base},
 body:JSON.stringify({action:"login",password:env.TM_ACCOUNT_PASSWORD})
});
const login=await accountLogin({request:loginReq,env});
assert.equal(login.status,200);
const cookie=login.headers.get("Set-Cookie").split(";")[0];
const originalFetch=globalThis.fetch;
try{
 globalThis.fetch=async request=>{
  assert.match(String(request),/64\.media\.tumblr\.com/);
  mediaCalls++;
  if(String(request).includes("animated.gif"))return new Response(new Uint8Array([71,73,70,56,57,97]),{
   status:200,headers:{"content-type":"image/gif","content-length":"6"}
  });
  assert.ok(String(request).includes("resized.jpg"),"Must try an actual Tumblr smaller variant before full-size originals");
  return new Response(new Uint8Array([255,216,255,224,74,70,73,70,1,1,2,3]),{
   status:200,headers:{"content-type":"image/jpeg","content-length":"12"}
  });
 };
 const unauth=await checkVisual({request:new Request(base+"/api/visual?mode=diagnostics"),env});
 assert.equal(unauth.status,401,"Diagnostic must require the private account session");
 const response=await checkVisual({
  request:new Request(base+"/api/visual?mode=diagnostics",{headers:{Cookie:cookie}}),env
 });
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.configured,true);
 assert.equal(data.indexed,1);
 assert.equal(data.imageEmbeddings,1);
 assert.equal(data.textEmbedding.ok,true);
 assert.equal(data.imageEmbedding.ok,true);
 assert.equal(data.imageEmbedding.dimension,256);
 assert.equal(modelCalls,2);
 assert.equal(mediaCalls,2);
 console.log("Workers AI owner-only diagnostics test passed: account session, text and image model requests");
}finally{globalThis.fetch=originalFetch}
