import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {onRequestGet,onRequestPost} from "../functions/api/account.js";
globalThis.crypto ||= webcrypto;

class FakeDB{
 constructor(){this.profile={name:"Wesley1337",avatar:""};this.items=new Map();this.failures=new Map()}
 prepare(sql){
  const db=this;
  return {params:[],bind(...args){this.params=args;return this},
   async run(){
    const p=this.params;
    if(sql.startsWith("DELETE FROM tm_items"))db.items.delete(p[0]+"|"+p[1]);
    else if(sql.startsWith("INSERT INTO tm_items("))db.items.set(p[0]+"|"+p[1],{kind:p[0],item_id:p[1],payload:p[2]});
    else if(sql.startsWith("UPDATE tm_profile"))db.profile.avatar=p[0];
    else if(sql.startsWith("INSERT INTO tm_login_limits"))db.failures.set(p[0],{attempt_count:p[1],window_start:p[2]});
    return {success:true}
   },
   async first(){
    const p=this.params;
    if(sql.includes("FROM tm_profile"))return db.profile;
    if(sql.includes("FROM tm_login_limits"))return db.failures.get(p[0])||null;
    return null
   },
   async all(){
    if(sql.includes("FROM tm_items"))return {results:[...db.items.values()]};
    return {results:[]}
   }
  }
 }
 async batch(statements){return Promise.all(statements.map(s=>s.run()))}
}
const env={TM_DB:new FakeDB(),TM_ACCOUNT_PASSWORD:"long random owner password only"};
const base="https://tmblrtm.pages.dev";
const req=(mode,data=null,cookie="")=>new Request(base+"/api/account"+(mode?"?mode="+mode:""),data?{
 method:"POST",headers:{"Content-Type":"application/json","Origin":base,...(cookie?{"Cookie":cookie}:{})},body:JSON.stringify(data)
}:{headers:cookie?{"Cookie":cookie}:{}});

const status=await onRequestGet({request:req("status"),env});
assert.equal((await status.json()).configured,true);
const guest=await onRequestGet({request:req(""),env});
assert.equal(guest.status,401);
const bad=await onRequestPost({request:req("",{action:"login",password:"wrong"}),env});
assert.equal(bad.status,401);
const good=await onRequestPost({request:req("",{action:"login",password:env.TM_ACCOUNT_PASSWORD}),env});
assert.equal(good.status,200);
const cookie=good.headers.get("Set-Cookie").split(";")[0];
assert.ok(cookie.startsWith("__Host-tm_session="));
assert.ok(good.headers.get("Set-Cookie").includes("HttpOnly"));
const profile=await onRequestGet({request:req("",null,cookie),env});
assert.equal((await profile.json()).profile.handle,"Wesley1337");
const post={id:"1234567",blog:"sampleblog",date:"2012-10-10",timestamp:1350000000,type:"photo",title:"Historic",images:[],tags:["art"]};
const liked=await onRequestPost({request:req("",{action:"item",kind:"like",id:post.id,active:true,post},cookie),env});
assert.equal(liked.status,200);
const follow=await onRequestPost({request:req("",{action:"item",kind:"follow",id:"sampleblog",active:true},cookie),env});
assert.equal(follow.status,200);
const fresh=await onRequestGet({request:req("",null,cookie),env});
const data=(await fresh.json()).profile;
assert.ok(data.likes[post.id]);assert.deepEqual(data.follows,["sampleblog"]);
const avatar="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";
const upload=await onRequestPost({request:req("",{action:"avatar",avatar},cookie),env});
assert.equal(upload.status,200);
assert.equal((await upload.json()).avatar,avatar);
const noOrigin=new Request(base+"/api/account",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"logout"})});
assert.equal((await onRequestPost({request:noOrigin,env})).status,403);
const logout=await onRequestPost({request:req("",{action:"logout"},cookie),env});
assert.equal(logout.status,200);
assert.ok(logout.headers.get("Set-Cookie").includes("Max-Age=0"));
console.log("Private Tumblr profile tests passed: session, DB writes, follow, like, avatar, CSRF and logout");
