// Cloudflare Pages Function: same-origin Tumblr API read-only proxy.
// Configure encrypted secret TUMBLR_API_KEY in Cloudflare Pages → Settings → Variables and Secrets.
// This function never sends the key to the browser and never accepts arbitrary remote URLs.
const JSON_HEADERS = {"Content-Type":"application/json; charset=utf-8", "X-Content-Type-Options":"nosniff"};
const json = (data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,"Cache-Control":"no-store",...extra}});
const trimText=(s,max=10000)=>String(s||"").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\s+/g," ").trim().slice(0,max);
const httpUrl=(s)=>typeof s==="string"&&/^https:\/\//i.test(s)&&s.length<2500?s:null;
const uniq=a=>[...new Set(a.filter(Boolean))];
function normalize(post){
  const blocks=Array.isArray(post.content)?post.content:[];
  const textBlocks=blocks.filter(b=>b.type==="text").map(b=>b.text||"").filter(Boolean);
  const imageBlocks=blocks.filter(b=>b.type==="image").flatMap(b=>Array.isArray(b.media)?b.media:[]);
  const photos=(Array.isArray(post.photos)?post.photos:[]).map(p=>p.original_size||p.alt_sizes?.[0]).filter(Boolean);
  const media=[...imageBlocks,...photos].filter(m=>m&&httpUrl(m.url)).map(m=>({url:m.url,width:Number(m.width)||null,height:Number(m.height)||null}));
  const images=uniq(media.map(m=>m.url)).slice(0,10);
  const title=trimText(post.title||post.link_title||"",160);
  const contentText=trimText(textBlocks.join("\n")||post.body||post.caption||post.description||post.summary||post.quote||post.text||"",15000);
  const timestamp=Number(post.timestamp)||Math.floor(Date.parse(post.date||"")/1000)||0;
  const blog=String(post.blog_name||post.blog?.name||"unknown").slice(0,100);
  const tags=Array.isArray(post.tags)?post.tags.filter(t=>typeof t==="string").map(t=>t.slice(0,120)).slice(0,35):[];
  const photoCaption=trimText(post.caption||"",1500);
  return {
    id:String(post.id),blog,date:timestamp?new Date(timestamp*1000).toISOString().slice(0,10):"",
    timestamp,type:String(post.type||"text"),title,text:contentText,caption:photoCaption,
    quote:post.type==="quote"?trimText(post.text||post.quote,2000):"",
    quoteSource:post.type==="quote"?trimText(post.source,250):"",
    images, tags, notes:Number(post.note_count)||0, url:httpUrl(post.post_url), 
    reblogFrom:typeof post.reblogged_from_name==="string"?post.reblogged_from_name:null,
    audio:post.type==="audio"?trimText(post.artist||post.track_name||"",200):"",
    videoUrl:httpUrl(post.video_url)
  };
}
function validate(params){
  const mode=params.get("mode")||"blog";
  if(!["blog","tag"].includes(mode))return {error:"Invalid search mode."};
  let blog=(params.get("blog")||"").trim().toLowerCase().replace(/^https?:\/\/(www\.)?/,"").replace(/\/.*$/,"");
  if(blog&&/\.tumblr\.com$/.test(blog))blog=blog.slice(0,-".tumblr.com".length);
  if(mode==="blog"&&!/^[a-z0-9_-]{1,64}$/.test(blog))return {error:"Enter a valid Tumblr blog name, e.g. staff."};
  const tag=(params.get("tag")||"").trim().replace(/^#/,"");
  if(mode==="tag"&&(!tag||tag.length>100||/[\x00-\x1f]/.test(tag)))return {error:"Enter a valid tag (maximum 100 characters)."};
  const before=Number(params.get("before")||0),limit=Number(params.get("limit")||20),offset=Number(params.get("offset")||0);
  if(!Number.isSafeInteger(before)||before<0||before>4102444800)return {error:"Invalid historical timestamp."};
  if(!Number.isSafeInteger(limit)||limit<1||limit>20)return {error:"Limit must be 1 to 20."};
  if(!Number.isSafeInteger(offset)||offset<0||offset>5000)return {error:"Offset must be between 0 and 5000."};
  return {mode,blog,tag,before,limit,offset};
}
export async function onRequestGet(context){
  const requestUrl=new URL(context.request.url);
  if(requestUrl.searchParams.get("mode")==="status"){
    return json({configured:!!context.env.TUMBLR_API_KEY,service:"Tumblr API read-only proxy"});
  }
  if(!context.env.TUMBLR_API_KEY)return json({error:"Tumblr API key is not configured. Add encrypted TUMBLR_API_KEY in Cloudflare Pages settings.",code:"not_configured"},503);
  const opts=validate(requestUrl.searchParams);
  if(opts.error)return json({error:opts.error,code:"invalid_query"},400);
  const base=opts.mode==="blog"
    ?new URL("https://api.tumblr.com/v2/blog/"+encodeURIComponent(opts.blog+".tumblr.com")+"/posts")
    :new URL("https://api.tumblr.com/v2/tagged");
  base.searchParams.set("api_key",context.env.TUMBLR_API_KEY);
  base.searchParams.set("limit",String(opts.limit));
  if(opts.before)base.searchParams.set("before",String(opts.before));
  if(opts.mode==="blog"){
    base.searchParams.set("offset",String(opts.offset));
    base.searchParams.set("npf","true");
  }else base.searchParams.set("tag",opts.tag);
  try{
    const response=await fetch(base.toString(),{headers:{"Accept":"application/json","User-Agent":"TumblrTimeMachine/2.1 (historical read-only archive)"},signal:AbortSignal.timeout(12000)});
    if(!response.ok){
      const status=response.status===404?404:response.status===429?429:502;
      return json({error:status===404?"That Tumblr blog could not be found.":status===429?"Tumblr rate limit reached. Try again later.":"Tumblr returned an error ("+response.status+").",code:"tumblr_error"},status);
    }
    const payload=await response.json();
    const raw=opts.mode==="blog"?payload?.response?.posts:payload?.response;
    if(!Array.isArray(raw))return json({error:"Tumblr returned an unexpected response format.",code:"upstream_format"},502);
    const posts=raw.map(normalize).filter(p=>p.timestamp>0&&(!opts.before||p.timestamp<opts.before));
    const nextBefore=posts.length?Math.min(...posts.map(p=>p.timestamp))-1:null;
    return json({posts,mode:opts.mode,query:opts.mode==="blog"?opts.blog:opts.tag,hasMore:raw.length>=opts.limit,nextOffset:opts.offset+raw.length,nextBefore,source:"tumblr",retrievedAt:new Date().toISOString()},200,{"Cache-Control":"public, max-age=30, s-maxage=300"});
  }catch(e){
    return json({error:"Unable to reach Tumblr right now. Please try again.",code:"upstream_unavailable"},502);
  }
}
