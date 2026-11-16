import assert from "node:assert/strict";
import {VISUAL_DIMENSIONS,VISUAL_MODEL,normalizedVector,averageVectors,similarity,safePost,scoreCandidates} from "../src/visualRanking.js";
import {onRequestGet as accountStatus} from "../functions/api/account.js";
import {onRequestGet as visualStatus} from "../functions/api/visual.js";

const basis=i=>{const v=Array(VISUAL_DIMENSIONS).fill(0);v[i]=1;return v};
const red=basis(0),blue=basis(1),pink=normalizedVector(red.map((x,i)=>x*.91+blue[i]*.09));
assert.equal(VISUAL_DIMENSIONS,256);
assert.equal(VISUAL_MODEL,"@cf/google/embeddinggemma-2");
assert.ok(similarity(red,pink)>.99);
assert.ok(Math.abs(similarity(red,blue))<1e-8);
assert.ok(similarity(averageVectors([red,red]),red)>.99);
assert.equal(normalizedVector(Array(256).fill(0)),null);
const p=(id,blog,timestamp,img,notes=0)=>({id,blog,timestamp,notes,images:[img],title:"An image"});
const rows=[
 {post:p("123456789012","redblog",1350000000,"https://64.media.tumblr.com/red.jpg"),vector:red},
 {post:p("223456789012","redblog",1350000001,"https://64.media.tumblr.com/duplicate.jpg"),vector:pink},
 {post:p("323456789012","blueblog",1350000002,"https://64.media.tumblr.com/blue.jpg"),vector:blue},
 {post:p("423456789012","futureblog",1600000000,"https://64.media.tumblr.com/future.jpg"),vector:red},
 {post:p("523456789012","otherblog",1350000003,"https://64.media.tumblr.com/red.jpg"),vector:red}
];
const cutoff=Math.floor(Date.parse("2012-12-31T23:59:59Z")/1000)+1;
const result=scoreCandidates(rows,{anchorVectors:[red],before:cutoff,limit:10});
assert.ok(result.length>0);
assert.equal(result[0].id,"123456789012");
assert.ok(!result.some(x=>x.id==="423456789012"),"never show uploads after selected year");
assert.equal(new Set(result.map(x=>x.images?.[0])).size,result.length,"duplicate image URLs must be suppressed");
assert.equal(scoreCandidates(rows,{anchorVectors:[red],before:cutoff,excludeIds:["123456789012"]}).some(x=>x.id==="123456789012"),false);
assert.equal(safePost({id:"bad",blog:"real",timestamp:1350000000}),null);
const clean=safePost({id:"123456789012",blog:"real",timestamp:1350000000,title:"Period image",images:["https://64.media.tumblr.com/image.jpg"]});
assert.equal(clean.date,"2012-10-12");
assert.equal(clean.images.length,1);

const withoutDB=await accountStatus({request:new Request("https://example.com/api/account?mode=status"),env:{TM_ACCOUNT_PASSWORD:"password"}});
const state=await withoutDB.json();
assert.equal(state.passwordReady,true,"chosen eight-character password should now be accepted");
assert.equal(state.configured,false,"password alone must not pretend a cloud account is ready");
const noModel=await visualStatus({request:new Request("https://example.com/api/visual?mode=status"),env:{}});
const response=await noModel.json();
assert.equal(response.configured,false,"image discovery must disclose absent Workers AI/D1 setup");
console.log("Visual ranking and account setup checks passed",result.map(x=>x.id));
