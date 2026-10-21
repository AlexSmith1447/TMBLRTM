import assert from "node:assert/strict";
import {onRequestGet} from "../functions/api/tumblr.js";
const doRequest=async(url,key)=>{
 const request=new Request(url);
 const response=await onRequestGet({request,env:key?{TUMBLR_API_KEY:key}:{}});
 return {status:response.status,body:await response.json()};
};
const endpoint="https://time-machine.test/api/tumblr";
let r=await doRequest(endpoint+"?mode=status");assert.equal(r.body.configured,false);
r=await doRequest(endpoint+"?mode=status","test-secret");assert.equal(r.body.configured,true);
r=await doRequest(endpoint+"?mode=blog&blog=staff");assert.equal(r.status,503);assert.equal(r.body.code,"not_configured");
r=await doRequest(endpoint+"?mode=blog&blog=127.0.0.1","test-secret");assert.equal(r.status,400);
r=await doRequest(endpoint+"?mode=tag&tag=","test-secret");assert.equal(r.status,400);
r=await doRequest(endpoint+"?mode=blog&blog=staff&limit=99","test-secret");assert.equal(r.status,400);
const originalFetch=globalThis.fetch;
let called=[];
globalThis.fetch=async(url)=>{
 called.push(String(url));
 if(String(url).includes("/v2/tagged"))return new Response(JSON.stringify({meta:{status:200},response:[{id:333,timestamp:1339300000,blog_name:"tagged-blog",tags:["slenderman"],type:"text",body:"old <b>creepypasta</b> post",post_url:"https://www.tumblr.com/tagged-blog/333"}]}),{status:200});
 return new Response(JSON.stringify({meta:{status:200},response:{blog:{name:"staff"},posts:[
 {id:123,blog_name:"staff",type:"photo",timestamp:1339459200,content:[{type:"text",text:"A post from <b>2012</b>."},{type:"image",media:[{url:"https://64.media.tumblr.com/example.jpg",width:600,height:400}]}],tags:["nostalgia"],note_count:41,post_url:"https://staff.tumblr.com/post/123"},
 {id:124,blog_name:"staff",type:"text",timestamp:1710000000,body:"A post from the future",tags:[]}
 ]}}),{status:200});
};
try{
 r=await doRequest(endpoint+"?mode=blog&blog=staff.tumblr.com&limit=20&before=1356998400","test-secret");
 assert.equal(r.status,200);assert.equal(r.body.posts.length,1);assert.equal(r.body.posts[0].id,"123");
 assert.equal(r.body.posts[0].text,"A post from 2012.");assert.deepEqual(r.body.posts[0].images,["https://64.media.tumblr.com/example.jpg"]);
 assert.equal(r.body.posts[0].notes,41);
 assert.ok(called[0].startsWith("https://api.tumblr.com/v2/blog/staff.tumblr.com/posts?"));
 assert.ok(called[0].includes("api_key=test-secret"));
 assert.ok(!JSON.stringify(r.body).includes("test-secret"),"The key should never be exposed to the client");
 r=await doRequest(endpoint+"?mode=tag&tag=slenderman&before=1356998400","test-secret");
 assert.equal(r.status,200);assert.equal(r.body.posts.length,1);
 assert.ok(called[1].includes("/v2/tagged?"));assert.ok(called[1].includes("tag=slenderman"));
}finally{globalThis.fetch=originalFetch}
console.log("Tumblr Pages Function: configuration, validation, normalization and cutoff tests passed.");
