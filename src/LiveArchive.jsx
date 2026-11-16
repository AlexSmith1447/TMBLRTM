import React,{useEffect,useMemo,useState,useRef,useCallback} from "react";
import {AlertCircle,ArrowLeft,ArrowRight,ArrowUpRight,Bookmark,CalendarDays,Camera,Check,ChevronLeft,ChevronRight,ExternalLink,Heart,Image as ImageIcon,Loader2,Plus,Repeat2,RefreshCw,Search,SlidersHorizontal,Users,X,FolderOpen,LayoutGrid,Music,Film,Quote,Link2} from "lucide-react";
import PhotoViewer from "./PhotoViewer.jsx";
import {tasteProfile,eraAnchors,oldestEraTimestamp,rankDiscovered} from "./discovery.js";
import {buildPostGraph,chooseGraphTopics,relatedBlogs,buildDiscoveryJobs} from "./graphDiscovery.js";
import "./live.css";
import "./blog.css";

const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const cutoff=date=>Math.floor(Date.parse(date+"T23:59:59Z")/1000)+1;
const monthStart=m=>Math.floor(Date.parse(m+"-01T00:00:00Z")/1000);
const monthEnd=m=>{const [y,mo]=m.split("-").map(Number);return Math.floor(Date.UTC(y,mo,1)/1000)};
const pretty=date=>new Date(date+"T12:00:00Z").toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric",timeZone:"UTC"});
const formatMonth=m=>new Date(m+"-01T12:00:00Z").toLocaleDateString("en-US",{year:"numeric",month:"long",timeZone:"UTC"});
const avatar=name=>"https://api.tumblr.com/v2/blog/"+encodeURIComponent(name+".tumblr.com")+"/avatar/64";
const merge=(a,b)=>{const m=new Map();for(const x of [...a,...b])m.set(x.id,x);return [...m.values()].sort((x,y)=>y.timestamp-x.timestamp)};
const validBlog=name=>/^[a-z0-9_-]{1,64}$/.test(name);
// The visual recommender indexes only posts fetched through the official Tumblr
// API. These calls require the private site account; no API key is sent to users.
async function visualIndex(posts,signal){
 const candidates=[...new Map((posts||[]).filter(p=>p?.id&&(p.images||[]).length).map(p=>[String(p.id),p])).values()].slice(0,5);
 if(!candidates.length)return;
 const r=await fetch("/api/visual",{method:"POST",credentials:"same-origin",signal,
  headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"index",posts:candidates})});
 if(!r.ok)throw Error("Visual indexing unavailable");
}
async function visualFind({date,seed="",rotation=0,signal}){
 const before=Math.floor(Date.parse(date+"T23:59:59Z")/1000)+1;
 const params=new URLSearchParams({mode:"recommend",before:String(before),rotation:String(rotation),limit:"36"});
 if(seed)params.set("seed",String(seed));
 const r=await fetch("/api/visual?"+params,{credentials:"same-origin",signal,cache:"no-store"});
 if(!r.ok)throw Error("Image discovery unavailable");
 return r.json();
}
async function fetchPage({blog,tag,before,offset=0,limit=12,signal}){
 const url=new URLSearchParams({mode:blog?"blog":"tag",[blog?"blog":"tag"]:blog||tag,before:String(before),limit:String(limit),offset:String(offset)});
 const response=await fetch("/api/tumblr?"+url.toString(),{signal});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error||"Tumblr is unavailable.");
 return data;
}
function Avatar({name,size="md"}){
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[name]);
 return <span className={"tm-blog-avatar "+size}>{!failed&&name?<img src={avatar(name)} alt="" loading="lazy" onError={()=>setFailed(true)}/>:name?.slice(0,1).toUpperCase()||"t"}</span>;
}
function PhotoGrid({post,onOpen}){
 const count=post.images?.length||0;
 if(!count)return null;
 return <div className={"tm-photoset count-"+Math.min(6,count)}>
  {post.images.slice(0,6).map((url,i)=><button key={url+i} className={"tm-photo-cell image-"+i} type="button" onClick={()=>onOpen(i)} title={"View photo "+(i+1)}>
    <img src={url} alt={"Photo "+(i+1)+" by "+post.blog} loading="lazy" referrerPolicy="no-referrer"/>
    {i===5&&count>6&&<span className="tm-photo-more">+{count-6} photos</span>}
  </button>)}
 </div>;
}
function PostCard({post,liked,saved,onLike,onSave,onTag,onBlog,onSimilar}){
 const [trailExpanded,setTrailExpanded]=useState(false);
 const [viewer,setViewer]=useState(null);
 const trail=Array.isArray(post.trail)?post.trail:[];
 return <article className="tt-post" aria-label={"Tumblr post by "+post.blog}>
  <button type="button" className="tm-avatar-button" onClick={()=>onBlog(post.blog)} title={"Visit "+post.blog}><Avatar name={post.blog}/></button>
  <div className="tt-post-paper">
   <div className="tt-post-head"><div className="tm-author">
    <button type="button" className="tt-post-blog" onClick={()=>onBlog(post.blog)}>{post.blog}</button>
    {post.reblogFrom&&post.reblogFrom!==post.blog&&<button className="tm-reblog-source" onClick={()=>onBlog(post.reblogFrom)} title={"View "+post.reblogFrom}><Repeat2 size={12}/>{post.reblogFrom}</button>}
    <small>{pretty(post.date)}{post.demo?" · SAMPLE":""}</small>
   </div>{post.url&&<a href={post.url} className="tt-post-open" title="View original post" rel="noopener noreferrer" target="_blank"><ExternalLink size={15}/></a>}</div>
   {post.title&&<h3 className="tt-post-title">{post.title}</h3>}
   {post.type==="quote"&&post.quote&&<blockquote className="tt-quote">“{post.quote}”<small>{post.quoteSource}</small></blockquote>}
   {post.images?.length>0&&<PhotoGrid post={post} onOpen={setViewer}/>}
   {post.text&&post.type!=="quote"&&<p className="tt-post-text">{post.text}</p>}
   {post.type==="audio"&&<div className="tm-media-block"><Music size={22}/><span>{post.audio||"Audio post"}</span></div>}
   {post.type==="video"&&<div className="tm-media-block"><Film size={22}/><span>Video post</span>{post.videoUrl&&<a href={post.videoUrl} target="_blank" rel="noopener noreferrer">Watch <ExternalLink size={12}/></a>}</div>}
   {!post.text&&!post.images?.length&&!post.quote&&!["audio","video"].includes(post.type)&&<p className="tt-post-text empty">View the original post for its full content.</p>}
   {trail.length>0&&<div className="tm-trail">
     <button className="tm-trail-toggle" onClick={()=>setTrailExpanded(!trailExpanded)}><Repeat2 size={14}/> {trail.length} {trail.length===1?"reblog":"reblogs"} in this trail {trailExpanded?<ChevronLeft size={13}/>:<ChevronRight size={13}/>}</button>
     {trailExpanded&&<div className="tm-trail-entries">{trail.map((t,i)=><div key={i} className="tm-trail-entry"><button onClick={()=>onBlog(t.blog)}>{t.blog}</button>{t.text&&<p>{t.text}</p>}{t.images?.length>0&&<div className="tm-trail-images">{t.images.map((src,j)=><img src={src} key={src+j} alt="Reblogged image" loading="lazy"/>)}</div>}</div>)}</div>}
   </div>}
   {post.tags?.length>0&&<div className="tt-post-tags">{post.tags.slice(0,15).map(t=><button onClick={()=>onTag(t)} key={t}>#{t.replace(/\s/g,"")}</button>)}</div>}
   <div className="tt-post-footer"><span>{(post.notes||0).toLocaleString()} notes</span><div>
     {onSimilar&&post.images?.length>0&&<button onClick={()=>onSimilar(post)} title="Find visually similar posts" aria-label="Find similar images"><ImageIcon size={18}/></button>}
     <button className={saved?"marked":""} onClick={()=>onSave(post)} title="Bookmark locally" aria-label={saved?"Remove bookmark":"Bookmark"}><Bookmark size={17} fill={saved?"currentColor":"none"}/></button>
     {post.url&&<a href={post.url} title="Open original Tumblr post" target="_blank" rel="noopener noreferrer"><ArrowUpRight size={17}/></a>}
     <button className={liked?"hearted":""} onClick={()=>onLike(post)} title="Like locally" aria-label={liked?"Unlike":"Like"}><Heart size={20} fill={liked?"currentColor":"none"}/></button>
   </div></div>
  </div>
  {viewer!==null&&<PhotoViewer images={post.images} initialIndex={viewer} postUrl={post.url} onClose={()=>setViewer(null)}/>}
 </article>;
}

/**
 * Historical discovery samples different months rather than just the cutoff day.
 * IMPORTANT: /tagged only offers timestamp paging; there is no official "Top"
 * response. These are the top-ranked posts AMONG THE POSTS WE CAN SAMPLE.
 */
function DiscoveryFeed({tag="",date,configured,liked,saved,followed,account,onTag,onBlog,onLike,onSave,mobileMode=false}){
 const [sort,setSort]=useState("top");
 const [rotation,setRotation]=useState(0);
 const [page,setPage]=useState(0);
 const [posts,setPosts]=useState([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [partial,setPartial]=useState("");
 const [hasRecent,setHasRecent]=useState(true);
 const [sampled,setSampled]=useState(0);
 const [selected,setSelected]=useState([]);
 const [visualReady,setVisualReady]=useState(false);
 const [visualPosts,setVisualPosts]=useState([]);
 const [similarTo,setSimilarTo]=useState(null);
 const [similarPosts,setSimilarPosts]=useState([]);
 const [similarLoading,setSimilarLoading]=useState(false);
 const visualVersion=useRef(0);
 const recentBefore=useRef(null);
 const request=useRef(null);
 const interests=useMemo(()=>tasteProfile(liked,saved,followed),[liked,saved,followed.join("|")]);
 const isExplore=!tag;
 const topicKey=tag||"for-you";
 const graph=useMemo(()=>buildPostGraph(posts,{liked,saved,followed}),[posts,liked,saved,followed]);
 const topicPlan=tag?[tag]:chooseGraphTopics(graph,rotation,4);
 const blogSuggestions=useMemo(()=>relatedBlogs(graph,followed,rotation,6),[graph,followed,rotation]);
 const earliest=oldestEraTimestamp(date,12);
 const ranked=useMemo(()=>{
  const sampled=rankDiscovered(posts,interests,{sort,tag,rotation}).filter(p=>p.date&&p.date<=date&&p.timestamp>=earliest);
  if(tag||sort==="recent"||!visualReady||!visualPosts.length)return sampled;
  const seen=new Set();
  return [...visualPosts.filter(p=>p?.date&&p.date<=date),...sampled]
   .filter(p=>{if(seen.has(String(p.id)))return false;seen.add(String(p.id));return true});
 },[posts,interests,sort,tag,rotation,date,earliest,visualReady,visualPosts]);
 const displayed=similarTo?similarPosts:ranked;
 const profileKey=Object.keys(liked||{}).sort().join("|")+"::"+Object.keys(saved||{}).sort().join("|");
 useEffect(()=>{
  let active=true;
  if(!account?.status?.signedIn){setVisualReady(false);setVisualPosts([]);return}
  fetch("/api/visual?mode=status",{cache:"no-store",credentials:"same-origin"})
   .then(r=>r.json()).then(data=>{if(active)setVisualReady(Boolean(data.configured))})
   .catch(()=>{if(active)setVisualReady(false)});
  return()=>{active=false};
 },[account?.status?.signedIn]);
 useEffect(()=>{
  if(!visualReady||!account?.status?.signedIn||tag||sort==="recent")return;
  const controller=new AbortController();
  visualFind({date,rotation,signal:controller.signal}).then(data=>{
   if(!controller.signal.aborted)setVisualPosts((data.items||[]).filter(p=>p?.id));
  }).catch(()=>{});
  return()=>controller.abort();
 },[visualReady,account?.status?.signedIn,date,rotation,profileKey,tag,sort]);
 // Index as soon as both the owner session and API are ready, including
 // when login happens *after* the historical Tumblr posts were fetched.
 useEffect(()=>{
  if(!visualReady||!account?.status?.signedIn||!posts.length||sort==="recent")return;
  const controller=new AbortController();
  const likedPosts=Object.values(liked||{}).filter(p=>p?.images?.length).slice(0,2);
  const newPosts=posts.filter(p=>p?.images?.length).slice(0,5);
  const batch=[...new Map([...likedPosts,...newPosts].map(p=>[String(p.id),p])).values()].slice(0,5);
  if(!batch.length)return;
  visualIndex(batch,controller.signal)
   .then(()=>visualFind({date,rotation,signal:controller.signal}))
   .then(data=>{if(!controller.signal.aborted)setVisualPosts((data.items||[]).filter(p=>p?.id))})
   .catch(()=>{});
  return()=>controller.abort();
 },[visualReady,account?.status?.signedIn,posts,profileKey,date,sort,rotation]);
 const showSimilar=async post=>{
  if(!visualReady||!account?.status?.signedIn)return;
  const version=++visualVersion.current;
  setSimilarTo(post);setSimilarPosts([]);setSimilarLoading(true);
  try{
   await visualIndex([post]);
   const data=await visualFind({date,seed:post.id,rotation});
   if(visualVersion.current===version)setSimilarPosts((data.items||[]).filter(p=>p.id!==post.id));
  }catch{}finally{if(visualVersion.current===version)setSimilarLoading(false)}
 };
 const pagesTotal=isExplore?4:3;
 useEffect(()=>{setSort("top");setPage(0);setRotation(0);setPosts([]);setSimilarTo(null);setSimilarPosts([]);setVisualPosts([]);recentBefore.current=null},[tag,date]);
 const canMore=sort==="recent"?hasRecent:page<pagesTotal-1;
 const shuffle=()=>{setRotation(n=>n+1);setPage(0);setPosts([]);setSelected([])};
 const switchSort=next=>{if(next===sort)return;setSort(next);setPage(0);setPosts([]);recentBefore.current=null;setHasRecent(true);setSampled(0)};
 const fetchBatch=async (jobs,signal)=>{
  const results=[];
  for(let i=0;i<jobs.length;i+=3){
   if(signal.aborted)break;
   const group=await Promise.allSettled(jobs.slice(i,i+3).map(x=>fetchPage({blog:x.blog||null,tag:x.tag||null,before:x.before,limit:20,signal})));
   results.push(...group);
  }
  return results;
 };
 useEffect(()=>{
  if(configured!==true)return;
  const controller=new AbortController();
  request.current?.abort();request.current=controller;
  if(page===0){setPosts([]);setSelected([]);setSampled(0);recentBefore.current=null;setHasRecent(true)}
  setError("");setPartial("");setLoading(true);
  const run=async()=>{
   let jobs=[];
   if(sort==="recent"){
    // Real recent order from the selected cutoff, no fake popularity order.
    const beforeValue=page===0?cutoff(date):recentBefore.current;
    if(beforeValue==null){setHasRecent(false);return}
    jobs=topicPlan.map(t=>({tag:t,before:beforeValue}));
   }else if(tag){
    const all=[0,3,6,9,1,2,4,5,7,8,10,11];
    jobs=eraAnchors(date,all.slice(page*4,page*4+4)).map(before=>({tag,before}));
   }else{
    const plan=buildDiscoveryJobs({posts,liked,saved,followed,rotation,page,date,anchors:eraAnchors});
    jobs=plan.jobs;setSelected(plan.topics);
   }
   if(!jobs.length)return;
   const results=await fetchBatch(jobs,controller.signal);
   if(controller.signal.aborted)return;
   const good=results.filter(x=>x.status==="fulfilled").map(x=>x.value);
   const bad=results.filter(x=>x.status==="rejected"&&x.reason?.name!=="AbortError");
   const recentRows=good.flatMap(x=>x.posts);
   if(sort==="recent"){
    // /tagged results can be irregular: don't use offset, and avoid loops.
    const next=good.map(x=>x.nextBefore).filter(x=>Number.isFinite(x));
    const nextBefore=next.length?Math.min(...next):null;
    const current=jobs[0].before;
    recentBefore.current=nextBefore!==null&&nextBefore<current?nextBefore:null;
    setHasRecent(!!recentBefore.current&&recentBefore.current>earliest&&good.some(x=>x.hasMore));
   }
   const usable=recentRows.filter(p=>p.timestamp<=cutoff(date)&&p.timestamp>=earliest);
   setPosts(old=>merge(page===0?[]:old,usable));
 
   setSampled(old=>(page===0?0:old)+jobs.length);
   if(page===0&&tag)setSelected(topicPlan);
   if(bad.length)setPartial(good.length?bad.length+" source request(s) unavailable; showing what we found.":"");
   if(!good.length&&bad.length)setError(bad[0].reason?.message||"Could not reach Tumblr.");
  };
  run().catch(e=>{if(!controller.signal.aborted)setError(e.message||"Could not search historical posts.")}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  return()=>controller.abort();
 },[configured,tag,date,sort,rotation,page]);
 const handleMore=()=>{if(loading||!canMore)return;setPage(p=>p+1)};
 return <div className={"tm-discover"+(mobileMode?" tm-discover-mobile":"")}>
  <div className="tm-discover-header">
   <div><span className="tm-discover-kicker">{tag?"TAG ARCHIVE":"EXPLORE TUMBLR"}</span>
    <h2>{tag?"#"+tag:"Explore"}</h2>
    <p>{tag?"Discover popular surviving posts from across the era.":"Discover posts and blogs through shared tags and reblogs."}</p>
   </div>
   {isExplore&&<button type="button" className="tm-discover-refresh" onClick={shuffle} title="Discover more"><RefreshCw size={15}/> Refresh</button>}
  </div>
  {isExplore&&<div className="tm-discover-topics">
   {(selected.length?selected:topicPlan).map(t=><button key={t} onClick={()=>onTag(t)}>#{t}</button>)}
  </div>}
  {isExplore&&blogSuggestions.length>0&&<div className="tm-discover-related-blogs">
    <strong>Recommended blogs</strong>
    <div>{blogSuggestions.map(b=><button type="button" key={b.name} onClick={()=>onBlog(b.name)}>
      <span>{b.name.slice(0,1).toUpperCase()}</span><small>{b.name}</small>
    </button>)}</div>
  </div>}
  {tag&&<div className="tm-discover-mode" role="group" aria-label="Tag post sorting">
   <button className={sort==="top"?"active":""} onClick={()=>switchSort("top")} aria-pressed={sort==="top"}><Heart size={14}/> Top of this era</button>
   <button className={sort==="recent"?"active":""} onClick={()=>switchSort("recent")} aria-pressed={sort==="recent"}><CalendarDays size={14}/> Most recent</button>
  </div>}
  <div className="tm-discover-context">
   {sort==="top"?"Ranked from sampled public posts":"Chronological public posts"} · {date.slice(0,4)} and the preceding months
   {sampled>0&&<span> · {sampled} searches sampled</span>}
  </div>
  {configured===null&&<div className="tt-loading"><Loader2 size={18} className="rotating"/><p>Connecting to Tumblr…</p></div>}
  {configured===false&&<div className="tt-error"><AlertCircle size={16}/> Tumblr API is not configured.</div>}
  {error&&<div className="tt-error"><AlertCircle size={16}/>{error}<button onClick={shuffle}>Retry</button></div>}
  {partial&&<p className="tm-discover-partial">{partial}</p>}
  {similarTo&&<div className="tm-visual-context"><strong>Images similar to {similarTo.blog}'s post</strong><button type="button" onClick={()=>{visualVersion.current++;setSimilarTo(null);setSimilarPosts([])}}>Back to Explore</button></div>}
  {similarLoading&&<div className="tt-loading"><Loader2 size={17} className="rotating"/><p>Finding similar images…</p></div>}
  {similarTo&&!similarLoading&&!similarPosts.length&&<div className="tt-empty">Not enough comparable images have been indexed yet. Explore more posts first.</div>}
  {displayed.length>0&&<div className="tt-post-list">{displayed.map(post=><PostCard key={post.id} post={post} liked={!!liked[post.id]} saved={!!saved[post.id]} onLike={onLike} onSave={onSave} onTag={onTag} onBlog={onBlog} onSimilar={visualReady?showSimilar:null}/>)}</div>}
  {!similarTo&&loading&&<div className="tt-loading"><Loader2 className="rotating" size={18}/><p>{page===0?"Finding posts from different months…":"Exploring more of the era…"}</p></div>}
  {!similarTo&&!loading&&ranked.length===0&&!error&&configured===true&&<div className="tt-empty"><Search size={26}/><strong>No accessible posts in this sample</strong><p>Tumblr does not always expose older tag results consistently. Try a different tag or explore more months.</p></div>}
  {!similarTo&&configured===true&&!loading&&canMore&&<button className="tt-load-more tm-discover-more" onClick={handleMore}><Plus size={15}/> {sort==="recent"?"Older posts":"Find more from this era"}</button>}
  <p className="tm-discover-footnote">Top is an independent ranking based on current note counts and your interests, not Tumblr's original historical trending chart. Deleted or private posts may be missing.</p>
 </div>;
}

const themes=["classic","midnight","paper","pastel"];
function themeFor(name){let n=0;for(const c of name||"")n=(n*31+c.charCodeAt(0))>>>0;return themes[n%themes.length]}
function BlogHeader({name,info,followed,onToggle,month,onMonth,cutoffDate,onThemeChange}){
 const [showMonths,setShowMonths]=useState(false);
 const [year,setYear]=useState(Number(cutoffDate.slice(0,4)));
 const [theme,setTheme]=useState(()=>read("tm-blog-themes",{})[name]||themeFor(name));
 useEffect(()=>{setTheme(read("tm-blog-themes",{})[name]||themeFor(name));setShowMonths(false);setYear(Number(cutoffDate.slice(0,4)))},[name,cutoffDate.slice(0,4)]);
 const switchTheme=value=>{setTheme(value);onThemeChange?.(value);const all=read("tm-blog-themes",{});localStorage.setItem("tm-blog-themes",JSON.stringify({...all,[name]:value}))};
 const currentMonth=cutoffDate.slice(0,7);
 return <div className={"tm-blog-layout theme-"+theme}>
  <div className="tm-blog-cover">
   <div className="tm-blog-cover-inner"><Avatar name={name} size="xl"/><div><small>tumblr</small><h2>{info?.title||name}</h2><p>{info?.description||name+".tumblr.com"}</p></div></div>
  </div>
  <div className="tm-blog-navigation"><button className={!month?"selected":""} onClick={()=>onMonth(null)}>Home</button><button className={month?"selected":""} onClick={()=>setShowMonths(!showMonths)}><LayoutGrid size={13}/> Archive</button><span className="tm-blog-spacer"/><button className="tm-blog-follow" onClick={()=>onToggle(name)}>{followed?<><Check size={13}/> Following</>:<><Plus size={13}/> Follow</>}</button><a href={info?.url||"https://"+name+".tumblr.com"} target="_blank" rel="noopener noreferrer" title="View original blog"><ExternalLink size={14}/></a></div>
  {showMonths&&<div className="tm-archive-calendar">
   <div className="tm-archive-years"><button onClick={()=>setYear(y=>Math.max(2009,y-1))}><ChevronLeft size={17}/></button><strong>{year}</strong><button onClick={()=>setYear(y=>Math.min(Number(cutoffDate.slice(0,4)),y+1))}><ChevronRight size={17}/></button></div>
   <div className="tm-archive-months">{Array.from({length:12},(_,i)=>{const m=String(year)+"-"+String(i+1).padStart(2,"0");const future=m>currentMonth;return <button key={m} disabled={future} className={month===m?"active":""} onClick={()=>{onMonth(m);setShowMonths(false)}}>{new Date(Date.UTC(year,i,1)).toLocaleDateString("en-US",{month:"short",timeZone:"UTC"})}</button>})}</div>
   <p>Browse posts from a month in this blog.</p>
  </div>}
  <div className="tm-theme-selection" aria-label="Blog theme"><small>Theme:</small>{themes.map(t=><button key={t} className={theme===t?"active":""} onClick={()=>switchTheme(t)} title={"Apply "+t+" theme"}>{t}</button>)}</div>
  {month&&<div className="tm-month-banner"><span>{formatMonth(month)}</span><button onClick={()=>onMonth(null)}>View all posts <X size={13}/></button></div>}
 </div>;
}
function FeedEmpty({message,icon:Icon=FolderOpen}){return <div className="tt-empty"><Icon size={30}/><p>{message}</p></div>}
export default function LiveArchive({date,tab,initialTag,initialBlog,onTag,onBlog,followed=[],onToggleFollow,account,initialType="all",immersive=true,mobileMode=false}){
 const [configured,setConfigured]=useState(null);
 const [posts,setPosts]=useState([]);
 const [loading,setLoading]=useState(false);
 const [moreLoading,setMoreLoading]=useState(false);
 const [error,setError]=useState("");
 const [partial,setPartial]=useState("");
 const [cursors,setCursors]=useState({});
 const [blogInfo,setBlogInfo]=useState(null);
 const [activeTheme,setActiveTheme]=useState(()=>read("tm-blog-themes",{})[initialBlog]||themeFor(initialBlog));
 const [month,setMonth]=useState(null);
 const [type,setType]=useState(initialType);
 const [query,setQuery]=useState("");
 const [localLiked,setLiked]=useState(()=>read("tm2-likes",{}));
 const [localSaved,setSaved]=useState(()=>read("tm2-saved",{}));
 const synced=Boolean(account?.status.signedIn);
 const liked=synced?account.profile.likes:localLiked;
 const saved=synced?account.profile.saved:localSaved;
 const requestGuard=useRef(null);
 const tabPinned=tab==="likes"||tab==="saved";
 const isBlog=!!initialBlog;
 const isTag=!!initialTag;
 const isExplore=tab==="explore"&&!isBlog&&!isTag;
 const specialDiscovery=!tabPinned&&!isBlog&&(isTag||isExplore);
 const isDashboard=!tabPinned&&!isBlog&&!isTag&&!isExplore;
 const names=useMemo(()=>[...new Set(followed.filter(validBlog))].slice(0,6),[followed.join("|")]);
 const namesKey=names.join("|");
 const singleName=isBlog?initialBlog:null;
 const effectiveTag=initialTag||"nostalgia";
 useEffect(()=>{let active=true;fetch("/api/tumblr?mode=status").then(r=>r.json()).then(data=>{if(active)setConfigured(!!data.configured)}).catch(()=>{if(active)setConfigured(false)});return()=>{active=false}},[]);
 useEffect(()=>{if(!synced)localStorage.setItem("tm2-likes",JSON.stringify(localLiked))},[localLiked,synced]);
 useEffect(()=>{if(!synced)localStorage.setItem("tm2-saved",JSON.stringify(localSaved))},[localSaved,synced]);
 useEffect(()=>{setType(initialType)},[initialType]);
 useEffect(()=>{setMonth(null);setActiveTheme(read("tm-blog-themes",{})[singleName]||themeFor(singleName))},[singleName]);
 useEffect(()=>{setBlogInfo(null);if(!isBlog)return;
  let active=true;const controller=new AbortController();
  fetch("/api/tumblr?"+new URLSearchParams({mode:"info",blog:initialBlog}),{signal:controller.signal}).then(r=>r.json()).then(d=>{if(active&&d.blog)setBlogInfo(d.blog)}).catch(()=>{});
  return()=>{active=false;controller.abort()};
 },[initialBlog,isBlog]);
 const before=Math.min(cutoff(date),month?monthEnd(month):Infinity);
 const from=month?monthStart(month):null;
 const queryKey=[date,tab,initialBlog,initialTag,namesKey,month,configured].join("::");
 const requestOne=async ({name,tag,offset=0,beforeValue,batch=12,signal})=>{
  const data=await fetchPage({blog:name,tag,before:beforeValue,offset,limit:batch,signal});
  const good=data.posts.filter(p=>p.date&&p.date<=date&&(!from||p.timestamp>=from));
  const reachedBefore=!!from&&data.posts.some(p=>p.timestamp<from);
  return {name:name||"__tag__",posts:good,next:{offset:data.nextOffset||offset+data.posts.length,before:data.nextBefore,hasMore:!!data.hasMore&&!reachedBefore&&data.posts.length>0}};
 };
 useEffect(()=>{
  if(configured!==true||tabPinned||specialDiscovery)return;
  const controller=new AbortController();requestGuard.current?.abort();requestGuard.current=controller;
  setPosts([]);setCursors({});setError("");setPartial("");setLoading(true);
  const run=async()=>{
   const sources=isDashboard?names.map(name=>({name})):isBlog?[{name:singleName}]:[{tag:effectiveTag}];
   if(!sources.length){setLoading(false);return}
   const results=await Promise.allSettled(sources.map(x=>requestOne({...x,beforeValue:before,signal:controller.signal,batch:12})));
   if(controller.signal.aborted)return;
   const good=results.filter(r=>r.status==="fulfilled").map(r=>r.value);
   const failed=results.filter(r=>r.status==="rejected"&&r.reason?.name!=="AbortError");
   if(!good.length&&failed.length)setError(failed[0].reason.message||"Could not load posts.");
   else if(failed.length)setPartial(failed.length+" blog"+(failed.length===1?"":"s")+" couldn't be loaded.");
   setPosts(merge([],good.flatMap(r=>r.posts)));
   setCursors(Object.fromEntries(good.map(r=>[r.name,r.next])));
  };
  run().finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  return()=>controller.abort();
 },[queryKey]);
 const local=tab==="likes"?Object.values(liked):tab==="saved"?Object.values(saved):[];
 const base=tabPinned?local:posts;
 const viewPosts=useMemo(()=>base.filter(p=>p.date<=date&&
   (type==="all"||(type==="photo"?(p.images||[]).length>0:p.type===type))&&
   (!query||[p.blog,p.title,p.text,p.quote,...(p.tags||[])].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase()))
 ).sort((a,b)=>b.timestamp-a.timestamp),[base,type,query,date]);
 const hasMore=Object.values(cursors).some(x=>x.hasMore);
 const like=post=>synced?account.like(post):setLiked(old=>{const x={...old};if(x[post.id])delete x[post.id];else x[post.id]=post;return x});
 const save=post=>synced?account.save(post):setSaved(old=>{const x={...old};if(x[post.id])delete x[post.id];else x[post.id]=post;return x});
 const loadMore=async()=>{
  if(moreLoading||loading||!hasMore)return;
  setMoreLoading(true);setError("");
  const signal=requestGuard.current?.signal;
  const sources=Object.entries(cursors).filter(([,v])=>v.hasMore);
  const results=await Promise.allSettled(sources.map(([name,v])=>requestOne({
   name:name==="__tag__"?null:name,tag:name==="__tag__"?effectiveTag:null,
   offset:name==="__tag__"?0:v.offset,
   beforeValue:name==="__tag__"?(v.before||before):before,
   batch:12,signal
  })));
  if(signal?.aborted){setMoreLoading(false);return}
  const good=results.filter(r=>r.status==="fulfilled").map(r=>r.value);
  const failed=results.filter(r=>r.status==="rejected");
  if(good.length){setPosts(old=>merge(old,good.flatMap(r=>r.posts)));setCursors(old=>({...old,...Object.fromEntries(good.map(x=>[x.name,x.next]))}))}
  if(failed.length)setError(good.length?"Some posts could not be loaded.":"Could not load more posts.");
  setMoreLoading(false);
 };
 if(specialDiscovery)return <section className={"tt-live tt-immersive"+(mobileMode?" tm-native-mobile":"")}><DiscoveryFeed tag={initialTag||""} date={date} configured={configured} liked={liked} saved={saved} followed={followed} account={account} onTag={onTag} onBlog={onBlog} onLike={like} onSave={save} mobileMode={mobileMode}/></section>;
 return <section className={"tt-live"+(immersive?" tt-immersive":"")+(mobileMode?" tm-native-mobile":"")+(isBlog?" tm-blog-feed theme-"+activeTheme:"")}>
  {isBlog&&<BlogHeader name={singleName} info={blogInfo} followed={followed.includes(singleName)} onToggle={onToggleFollow||(()=>{})} month={month} onMonth={setMonth} cutoffDate={date} onThemeChange={setActiveTheme}/>}
  {isDashboard&&names.length===0&&<FeedEmpty message="Follow some blogs using the sidebar, then their posts will appear here." icon={Users}/>}
  {isDashboard&&names.length>0&&<div className="tm-feed-source"><Users size={13}/> Following {names.length} {names.length===1?"blog":"blogs"} <span>·</span> <button onClick={()=>onBlog(names[0])}>View {names[0]} <ArrowRight size={12}/></button></div>}
  {(isTag||isBlog||type!=="all")&&<div className="tt-filterrow">
    <span className="tt-post-count">{isTag?"#"+effectiveTag:isBlog?singleName:"Posts"} {loading?"":viewPosts.length+" posts"}</span>
    <div className="tt-filtertools">
      <label><SlidersHorizontal size={13}/><select value={type} onChange={e=>setType(e.target.value)} aria-label="Filter post type">
        <option value="all">All posts</option><option value="photo">Photos</option><option value="text">Text</option><option value="quote">Quotes</option><option value="video">Video</option><option value="audio">Audio</option><option value="link">Links</option>
      </select></label>
      <label><Search size={13}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filter posts" aria-label="Filter loaded posts"/></label>
    </div>
  </div>}
  {configured===null&&!tabPinned&&<div className="tt-loading"><Loader2 className="rotating"/><p>Loading…</p></div>}
  {configured===false&&!tabPinned&&<div className="tt-error"><AlertCircle size={16}/> Tumblr connection is unavailable. Check the Time Machine settings.</div>}
  {loading&&!tabPinned&&<div className="tt-loading"><Loader2 className="rotating"/><p>Loading posts…</p></div>}
  {partial&&<div className="tm-partial">{partial}</div>}
  {error&&<div className="tt-error"><AlertCircle size={16}/><span>{error}</span><button onClick={()=>window.location.reload()}>Retry</button></div>}
  {!loading&&configured===true&&viewPosts.length===0&&!error&&!(isDashboard&&names.length===0)&&<FeedEmpty message={tabPinned?"Nothing here yet.":month?"No posts found for "+formatMonth(month)+".":"No posts here. Try another blog, tag, or date."}/>}
  {tabPinned&&viewPosts.length===0&&<FeedEmpty message="Your liked and saved posts will show up here."/>}
  <div className="tt-post-list">{viewPosts.map(p=><PostCard key={p.id} post={p} liked={!!liked[p.id]} saved={!!saved[p.id]} onLike={like} onSave={save} onTag={onTag} onBlog={onBlog}/>)}</div>
  {!tabPinned&&hasMore&&<button type="button" className="tt-load-more" onClick={loadMore} disabled={moreLoading||loading}>{moreLoading?<Loader2 size={15} className="rotating"/>:<Plus size={15}/>} {moreLoading?"Loading…":"Load more posts"}</button>}
 </section>;
}
