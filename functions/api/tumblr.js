// Cloudflare Pages Function: public Tumblr read-only API.
// Tumblr's OAuth Consumer Key remains private in Cloudflare secret TUMBLR_API_KEY.
const headers={"Content-Type":"application/json; charset=utf-8","X-Content-Type-Options":"nosniff"};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...headers,"Cache-Control":"no-store"}});
const clean=(s,max=15000)=>String(s||"").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<br\s*\/?>/gi,"\n").replace(/<\/p>/gi,"\n").replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/[ \t]+/g," ").replace(/ *\n */g,"\n").replace(/\n{3,}/g,"\n\n").replace(/\s+([.,!?;:])/g,"$1").trim().slice(0,max);
const safeUrl=s=>typeof s==="string"&&s.length<2500&&/^https:\/\//i.test(s)?s:null;
const blogName=s=>{let n=String(s||"").trim().toLowerCase().replace(/^https?:\/\/(www\.)?/,"").replace(/\/.*$/,"").replace(/\.tumblr\.com$/,"");return /^[a-z0-9_-]{1,64}$/.test(n)?n:null};
const listPhotos=post=>{
 const npf=Array.isArray(post.content)?post.content:[];
 const media=npf.filter(x=>x.type==="image").map(x=>Array.isArray(x.media)?x.media[0]:x.media).filter(Boolean);
 const old=(Array.isArray(post.photos)?post.photos:[]).map(x=>x.original_size||x.alt_sizes?.[0]).filter(Boolean);
 return [...new Set([...media,...old].map(x=>safeUrl(x.url)).filter(Boolean))].slice(0,12);
};
function trailFrom(post){
 const npf=Array.isArray(post.trail)?post.trail:[];
 const items=npf.slice(-8).map(x=>({
  blog:String(x.blog?.name||x.broken_blog_name||"unknown").slice(0,70),
  text:clean((Array.isArray(x.content)?x.content:[]).filter(b=>b.type==="text").map(b=>b.text).join("\n")||"",850),
  images: listPhotos(x).slice(0,2)
 }));
 if(items.length)return items;
 if(post.reblogged_from_name){
  return [{blog:String(post.reblogged_from_name).slice(0,70),text:"",images:[]}];
 }
 return [];
}
function normalize(post){
 const blocks=Array.isArray(post.content)?post.content:[];
 const blocksText=blocks.filter(x=>x.type==="text").map(x=>x.text||"").join("\n");
 const timestamp=Number(post.timestamp)||Math.floor(Date.parse(post.date||"")/1000)||0;
 const rawType=String(post.type||"text");
 const type=rawType==="blocks"?(blocks.some(x=>x.type==="image")?"photo":blocks.some(x=>x.type==="video")?"video":blocks.some(x=>x.type==="audio")?"audio":"text"):rawType;
 const trail=trailFrom(post);
 const video=blocks.find(x=>x.type==="video");
 const audio=blocks.find(x=>x.type==="audio");
 const blog=String(post.blog_name||post.blog?.name||"unknown").slice(0,80);
 return {
  id:String(post.id_string||post.id),blog,
  date:timestamp?new Date(timestamp*1000).toISOString().slice(0,10):"",timestamp,type,
  title:clean(post.title||post.link_title||"",160),
  text:clean(blocksText||post.body||post.caption||post.description||post.summary||(type==="quote"?"":post.text)||"",15000),
  quote:type==="quote"?clean(post.text||post.quote||"",2000):"",
  quoteSource:type==="quote"?clean(post.source||"",500):"",
  images:listPhotos(post),trail,
  tags:Array.isArray(post.tags)?post.tags.filter(t=>typeof t==="string").map(t=>t.slice(0,90)).slice(0,30):[],
  notes:Number(post.note_count)||0,
  url:safeUrl(post.post_url),reblogFrom:post.reblogged_from_name||trail.at(-1)?.blog||null,
  audio:clean(post.artist||post.track_name||audio?.title||"",180),
  videoUrl:safeUrl(post.video_url||video?.url||video?.media?.url||null)
 };
}
function validate(search){
 const mode=search.get("mode")||"blog";
 if(!["blog","tag","info"].includes(mode))return {error:"Invalid mode."};
 const blog=blogName(search.get("blog")||"");
 const tag=(search.get("tag")||"").trim().replace(/^#/,"");
 if((mode==="blog"||mode==="info")&&!blog)return {error:"Enter a valid Tumblr blog name."};
 if(mode==="tag"&&(!tag||tag.length>100||/[\x00-\x1f]/.test(tag)))return {error:"Enter a valid tag."};
 const before=Number(search.get("before")||0),limit=Number(search.get("limit")||20),offset=Number(search.get("offset")||0);
 if(!Number.isSafeInteger(before)||before<0||before>4102444800)return {error:"Invalid historical timestamp."};
 if(!Number.isSafeInteger(limit)||limit<1||limit>20)return {error:"Limit must be between 1 and 20."};
 if(!Number.isSafeInteger(offset)||offset<0||offset>5000)return {error:"Invalid pagination offset."};
 return {mode,blog,tag,before,limit,offset};
}
export async function onRequestGet({request,env}){
 const options=new URL(request.url).searchParams;
 if(options.get("mode")==="status")return json({configured:!!env.TUMBLR_API_KEY,service:"Tumblr API read-only proxy"});
 if(!env.TUMBLR_API_KEY)return json({error:"Tumblr API key is not configured.",code:"not_configured"},503);
 const opts=validate(options);if(opts.error)return json({error:opts.error,code:"invalid_query"},400);
 const endpoint=opts.mode==="tag"?"https://api.tumblr.com/v2/tagged":"https://api.tumblr.com/v2/blog/"+encodeURIComponent(opts.blog+".tumblr.com")+(opts.mode==="info"?"/info":"/posts");
 const url=new URL(endpoint);
 url.searchParams.set("api_key",env.TUMBLR_API_KEY);
 if(opts.mode!=="info"){
  url.searchParams.set("limit",String(opts.limit));
  if(opts.before)url.searchParams.set("before",String(opts.before));
  if(opts.mode==="blog"){
   url.searchParams.set("offset",String(opts.offset));
   url.searchParams.set("npf","true");
   url.searchParams.set("reblog_info","true");
  } else url.searchParams.set("tag",opts.tag);
 }
 try{
  const response=await fetch(url.toString(),{headers:{Accept:"application/json","User-Agent":"TumblrTimeMachine/2.3"},signal:AbortSignal.timeout(12000)});
  if(!response.ok){const status=response.status===404?404:response.status===429?429:502;return json({error:status===404?"Blog not found.":status===429?"Tumblr rate limit reached. Please retry later.":"Tumblr is temporarily unavailable ("+response.status+").",code:"tumblr_error"},status)}
  const data=await response.json();
  if(opts.mode==="info"){
    const b=data?.response?.blog;
    if(!b||typeof b!=="object")return json({error:"Tumblr didn't provide blog information."},502);
    return json({blog:{
      name:String(b.name||opts.blog).slice(0,80),
      title:clean(b.title||b.name||opts.blog,200),
      description:clean(b.description||"",750),
      posts:Number(b.posts)||0,
      url:safeUrl(b.url),
      avatar:"https://api.tumblr.com/v2/blog/"+encodeURIComponent(opts.blog+".tumblr.com")+"/avatar/128"
    }});
  }
  const raw=opts.mode==="blog"?data?.response?.posts:data?.response;
  if(!Array.isArray(raw))return json({error:"Unexpected Tumblr response."},502);
  const posts=raw.map(normalize).filter(p=>p.timestamp>0&&(!opts.before||p.timestamp<opts.before));
  const nextBefore=posts.length?Math.min(...posts.map(p=>p.timestamp))-1:null;
  return json({posts,mode:opts.mode,query:opts.mode==="blog"?opts.blog:opts.tag,hasMore:raw.length>=opts.limit,nextOffset:opts.offset+raw.length,nextBefore,source:"tumblr"});
 }catch(e){return json({error:"Unable to reach Tumblr. Please try again.",code:"upstream_unavailable"},502)}
}
