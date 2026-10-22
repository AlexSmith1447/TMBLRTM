import React,{useEffect,useMemo,useState,useRef,useCallback} from "react";
import {AlertCircle,ArrowLeft,ArrowRight,ArrowUpRight,Bookmark,CalendarDays,Camera,Check,ChevronLeft,ChevronRight,ExternalLink,Heart,Image as ImageIcon,Loader2,Plus,Repeat2,Search,SlidersHorizontal,Users,X,FolderOpen,LayoutGrid,Music,Film,Quote,Link2} from "lucide-react";
import PhotoViewer from "./PhotoViewer.jsx";
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
function PostCard({post,liked,saved,onLike,onSave,onTag,onBlog}){
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
     <button className={saved?"marked":""} onClick={()=>onSave(post)} title="Bookmark locally" aria-label={saved?"Remove bookmark":"Bookmark"}><Bookmark size={17} fill={saved?"currentColor":"none"}/></button>
     {post.url&&<a href={post.url} title="Open original Tumblr post" target="_blank" rel="noopener noreferrer"><ArrowUpRight size={17}/></a>}
     <button className={liked?"hearted":""} onClick={()=>onLike(post)} title="Like locally" aria-label={liked?"Unlike":"Like"}><Heart size={20} fill={liked?"currentColor":"none"}/></button>
   </div></div>
  </div>
  {viewer!==null&&<PhotoViewer images={post.images} initialIndex={viewer} postUrl={post.url} onClose={()=>setViewer(null)}/>}
 </article>;
}
const themes=["classic","midnight","paper","pastel"];
function themeFor(name){let n=0;for(const c of name||"")n=(n*31+c.charCodeAt(0))>>>0;return themes[n%themes.length]}
function BlogHeader({name,info,followed,onToggle,month,onMonth,cutoffDate}){
 const [showMonths,setShowMonths]=useState(false);
 const [year,setYear]=useState(Number(cutoffDate.slice(0,4)));
 const [theme,setTheme]=useState(()=>read("tm-blog-themes",{})[name]||themeFor(name));
 useEffect(()=>{setTheme(read("tm-blog-themes",{})[name]||themeFor(name));setShowMonths(false);setYear(Number(cutoffDate.slice(0,4)))},[name,cutoffDate.slice(0,4)]);
 const switchTheme=value=>{setTheme(value);const all=read("tm-blog-themes",{});localStorage.setItem("tm-blog-themes",JSON.stringify({...all,[name]:value}))};
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
export default function LiveArchive({date,tab,initialTag,initialBlog,onTag,onBlog,followed=[],onToggleFollow,initialType="all",immersive=true}){
 const [configured,setConfigured]=useState(null);
 const [posts,setPosts]=useState([]);
 const [loading,setLoading]=useState(false);
 const [moreLoading,setMoreLoading]=useState(false);
 const [error,setError]=useState("");
 const [partial,setPartial]=useState("");
 const [cursors,setCursors]=useState({});
 const [blogInfo,setBlogInfo]=useState(null);
 const [month,setMonth]=useState(null);
 const [type,setType]=useState(initialType);
 const [query,setQuery]=useState("");
 const [liked,setLiked]=useState(()=>read("tm2-likes",{}));
 const [saved,setSaved]=useState(()=>read("tm2-saved",{}));
 const requestGuard=useRef(null);
 const tabPinned=tab==="likes"||tab==="saved";
 const isBlog=!!initialBlog;
 const isTag=!!initialTag||tab==="explore";
 const isDashboard=!tabPinned&&!isBlog&&!isTag;
 const names=useMemo(()=>[...new Set(followed.filter(validBlog))].slice(0,6),[followed.join("|")]);
 const namesKey=names.join("|");
 const singleName=isBlog?initialBlog:null;
 const effectiveTag=initialTag||"nostalgia";
 useEffect(()=>{let active=true;fetch("/api/tumblr?mode=status").then(r=>r.json()).then(data=>{if(active)setConfigured(!!data.configured)}).catch(()=>{if(active)setConfigured(false)});return()=>{active=false}},[]);
 useEffect(()=>{localStorage.setItem("tm2-likes",JSON.stringify(liked))},[liked]);
 useEffect(()=>{localStorage.setItem("tm2-saved",JSON.stringify(saved))},[saved]);
 useEffect(()=>{setType(initialType)},[initialType]);
 useEffect(()=>{setMonth(null)},[singleName]);
 useEffect(()=>{if(!isBlog){setBlogInfo(null);return}
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
  if(configured!==true||tabPinned)return;
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
 const like=post=>setLiked(old=>{const x={...old};if(x[post.id])delete x[post.id];else x[post.id]=post;return x});
 const save=post=>setSaved(old=>{const x={...old};if(x[post.id])delete x[post.id];else x[post.id]=post;return x});
 const loadMore=async()=>{
  if(moreLoading||loading||!hasMore)return;
  setMoreLoading(true);setError("");
  const sources=Object.entries(cursors).filter(([,v])=>v.hasMore);
  const results=await Promise.allSettled(sources.map(([name,v])=>requestOne({
   name:name==="__tag__"?null:name,tag:name==="__tag__"?effectiveTag:null,
   offset:name==="__tag__"?0:v.offset,
   beforeValue:name==="__tag__"?(v.before||before):before,
   batch:12
  })));
  const good=results.filter(r=>r.status==="fulfilled").map(r=>r.value);
  const failed=results.filter(r=>r.status==="rejected");
  if(good.length){setPosts(old=>merge(old,good.flatMap(r=>r.posts)));setCursors(old=>({...old,...Object.fromEntries(good.map(x=>[x.name,x.next]))}))}
  if(failed.length)setError(good.length?"Some posts could not be loaded.":"Could not load more posts.");
  setMoreLoading(false);
 };
 return <section className={"tt-live"+(immersive?" tt-immersive":"")}>
  {isBlog&&<BlogHeader name={singleName} info={blogInfo} followed={followed.includes(singleName)} onToggle={onToggleFollow||(()=>{})} month={month} onMonth={setMonth} cutoffDate={date}/>}
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
