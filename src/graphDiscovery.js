// Public Tumblr post/tag/reblog graph, reconstructed from posts retrieved through
// the official API. No fabricated social connections or historical note totals.
// We cannot see the historical follower graph; only public surviving metadata.
const STOP=new Set(["tumblr","gif","gifs","photo","photos","text","mine","me","personal","follow","reblog",
 "post","queue","2012","2013","2011","2014","2010","2009","cute","love","lol","artwork","edit","edits",
 "aesthetic","my art","untitled","stuff","random","source","original","daily","tumblr radar"]);
export const DEFAULT_TOPICS=["photography","illustration","music","fashion","animals","comics","travel","design","technology","architecture","nature","food","animation","books","painting","film"];
export const cleanTag=t=>String(t||"").replace(/^#/,"").toLowerCase().trim().replace(/\s+/g," ");
const validTag=t=>t.length>1&&t.length<55&&!STOP.has(t)&&!/^\d+$/.test(t);
const validBlog=b=>/^[a-z0-9_-]{1,64}$/.test(String(b||""));
export const entropyHash=value=>{let h=2166136261>>>0;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const rotate=(items,shift)=>items.length?items.slice(shift%items.length).concat(items.slice(0,shift%items.length)):[];

export function buildPostGraph(posts=[],{liked={},saved={},followed=[]}={}){
 const tagCounts=new Map(),tagPairs=new Map(),blogCounts=new Map(),blogSources=new Map(),blogTags=new Map();
 const weights=new Map(),likedIDs=new Set(Object.keys(liked||{})),savedIDs=new Set(Object.keys(saved||{}));
 const all=[...Object.values(liked||{}),...Object.values(saved||{}),...posts];
 const seen=new Set();
 for(const post of all){
  if(!post?.id||seen.has(String(post.id)))continue;seen.add(String(post.id));
  const blog=String(post.blog||"").toLowerCase(),tags=[...new Set((post.tags||[]).map(cleanTag).filter(validTag))].slice(0,18);
  const likedPost=likedIDs.has(String(post.id))||savedIDs.has(String(post.id));
  if(validBlog(blog)){
   blogCounts.set(blog,(blogCounts.get(blog)||0)+1);
   const set=blogTags.get(blog)||new Set();tags.forEach(t=>set.add(t));blogTags.set(blog,set);
  }
  for(const tag of tags){
   tagCounts.set(tag,(tagCounts.get(tag)||0)+1);
   if(likedPost)weights.set(tag,(weights.get(tag)||0)+6);
   if(followed.includes(blog))weights.set(tag,(weights.get(tag)||0)+2.2);
  }
  for(let i=0;i<tags.length;i++)for(let j=i+1;j<tags.length;j++){
   const a=tags[i],b=tags[j],key=a<b?a+"|"+b:b+"|"+a;
   tagPairs.set(key,(tagPairs.get(key)||0)+1);
  }
  const sources=[post.reblogFrom,...(post.trail||[]).map(t=>t?.blog)]
   .filter(x=>typeof x==="string").map(x=>x.toLowerCase()).filter(validBlog);
  if(validBlog(blog))for(const origin of sources){
   if(origin===blog)continue;
   blogSources.set(origin,(blogSources.get(origin)||0)+(likedPost?5:1));
  }
 }
 for(const [tag,value] of [...weights]){
  const neighbors=[];
  for(const [pair,n] of tagPairs){
   const [a,b]=pair.split("|");
   if(a===tag)neighbors.push([b,n]);if(b===tag)neighbors.push([a,n]);
  }
  neighbors.sort((a,b)=>b[1]-a[1]);
  for(const [neighbor,n] of neighbors.slice(0,8)){
   const total=tagCounts.get(neighbor)||1;
   weights.set(neighbor,(weights.get(neighbor)||0)+Math.min(4,Math.sqrt(n)*value/(4+Math.sqrt(total))));
  }
 }
 return {tagCounts,tagPairs,blogCounts,blogSources,blogTags,weights,likedIDs,savedIDs};
}
export function chooseGraphTopics(graph,rotation=0,count=4){
 const ranked=[...graph.weights].filter(([tag])=>validTag(tag)).sort((a,b)=>b[1]-a[1]).map(([tag])=>tag);
 const connected=ranked.slice(0,10);
 // Diversify the queries: a personalized search should not crowd out the open web.
 const broad=rotate(DEFAULT_TOPICS,entropyHash("broad:"+rotation)%DEFAULT_TOPICS.length);
 const discovered=[...graph.tagCounts].filter(([tag,n])=>n>1&&validTag(tag)).sort((a,b)=>b[1]-a[1]).map(([tag])=>tag);
 const result=[],seen=new Set();
 const add=t=>{if(t&&!seen.has(t)&&validTag(t)){seen.add(t);result.push(t)}};
 if(connected.length){add(connected[rotation%connected.length]);add(connected[(rotation+1)%connected.length])}
 for(const t of rotate(discovered,rotation*2))if(result.length<count-1)add(t);
 for(const t of broad)if(result.length<count)add(t);
 return result.slice(0,count);
}
export function relatedBlogs(graph,followed=[],rotation=0,limit=8){
 const follow=new Set(followed);
 const list=new Map();
 for(const [blog,n] of graph.blogCounts)list.set(blog,n*.45);
 for(const [blog,n] of graph.blogSources)list.set(blog,(list.get(blog)||0)+n*1.6);
 for(const [blog,tags] of graph.blogTags){
  let overlap=0;
  for(const tag of tags)overlap+=Math.min(12,graph.weights.get(tag)||0)*.5;
  list.set(blog,(list.get(blog)||0)+overlap);
 }
 return [...list].filter(([blog])=>validBlog(blog)&&!follow.has(blog)&&blog!=="staff")
  .sort((a,b)=>(b[1]+(entropyHash(b[0]+rotation)%100)*.001)-(a[1]+(entropyHash(a[0]+rotation)%100)*.001))
  .slice(0,limit).map(([name,score])=>({name,score}));
}
export function buildDiscoveryJobs({posts=[],liked={},saved={},followed=[],rotation=0,page=0,date,anchors}){
 const graph=buildPostGraph(posts,{liked,saved,followed});
 const topics=chooseGraphTopics(graph,rotation+page,4);
 const personal=[...new Set([...followed,...Object.values(liked||{}).map(p=>p.blog),...Object.values(saved||{}).map(p=>p.blog)])]
   .filter(validBlog).filter(b=>b!=="staff");
 const connected=relatedBlogs(graph,personal,rotation+page,7).map(x=>x.name);
 const jobs=[];
 // Two timestamp anchors per tag: broaden date coverage without 12+ serial queries.
 const a=anchors(date,page===0?[0,5]:[2+page%4,8+page%4]);
 for(const t of topics.slice(0,3))for(const before of a)jobs.push({tag:t,before});
 const discoveredBlogs=rotate([...new Set([...personal,...connected])],rotation+page);
 for(const name of discoveredBlogs.slice(0,3))jobs.push({blog:name,before:a[0]});
 return {jobs:jobs.slice(0,9),topics,related:relatedBlogs(graph,followed,rotation,8),graph};
}
