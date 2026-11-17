import assert from "node:assert/strict";
import {onRequestGet} from "../functions/api/tumblr.js";

const root="https://64.media.tumblr.com";
const original=root+"/abc/tumblr_abc_1280.jpg";
const small540=root+"/abc/tumblr_abc_540.jpg";
const small500=root+"/abc/tumblr_abc_500.jpg";
const npfOriginal=root+"/x/y/s2048x3072/full.png";
const npfSmall=root+"/x/y/s540x810/thumb.png";
const posts=[
 {id:135000000001,id_string:"135000000001",blog_name:"oldblog",type:"photo",timestamp:1350000000,
  photos:[{original_size:{url:original,width:1280},alt_sizes:[
   {url:original,width:1280},{url:small500,width:500},{url:small540,width:540}
  ]}],tags:["photography"]},
 {id:135000000002,id_string:"135000000002",blog_name:"newblog",type:"blocks",timestamp:1350000000,
  content:[{type:"image",media:[{url:npfOriginal,width:2048},{url:npfSmall,width:540}]}],
  tags:["illustration"]}
];
const previousFetch=globalThis.fetch;
try{
 globalThis.fetch=async()=>new Response(JSON.stringify({response:posts}),{
  status:200,headers:{"Content-Type":"application/json"}
 });
 const response=await onRequestGet({request:new Request(
  "https://tmblrtm.pages.dev/api/tumblr?mode=tag&tag=photography&before=1356998400&limit=2"
 ),env:{TUMBLR_API_KEY:"test-key"}});
 assert.equal(response.status,200);
 const result=await response.json();
 assert.equal(result.posts.length,2);
 const [legacy,npf]=result.posts;
 assert.equal(legacy.images[0],original,"full-resolution display URL must be untouched");
 assert.equal(legacy.imageCandidates[0],small540,"prefer Tumblr's actual 540px variant");
 assert.equal(legacy.imageCandidates[1],small500);
 assert.equal(npf.images[0],npfOriginal,"original NPF photo stays for viewing");
 assert.equal(npf.imageCandidates[0],npfSmall,"NPF media thumbnails also work");
 console.log("Tumblr image variant retrieval passed");
}finally{globalThis.fetch=previousFetch}
