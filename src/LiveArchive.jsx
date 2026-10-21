import React,{useEffect,useMemo,useRef,useState} from "react";
import {AlertCircle,ArrowUpRight,Bookmark,Calendar,Camera,Check,ChevronDown,ExternalLink,Heart,Image as ImageIcon,Loader2,RefreshCw,Search,SlidersHorizontal,Tag,Wifi,WifiOff,Plus,Repeat2,ArrowRight,FolderOpen,LockKeyhole} from "lucide-react";
import "./live.css";

const SAMPLES=[
  {id:"demo-1",blog:"afterhours",date:"2012-06-12",timestamp:1339459200,type:"photo",title:"",text:"the summer lasts forever when you're seventeen",images:["https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1000&q=85"],tags:["summer","nostalgia","photography"],notes:1284,url:null,demo:true},
  {id:"demo-2",blog:"moonchild",date:"2011-11-19",timestamp:1321660800,type:"quote",quote:"We are all in the gutter, but some of us are looking at the stars.",quoteSource:"— Oscar Wilde",text:"",images:[],tags:["quotes","literature"],notes:2743,url:null,demo:true},
  {id:"demo-3",blog:"internetghost",date:"2012-04-21",timestamp:1334966400,type:"text",title:"little things i miss",text:"the sound of AIM messages. old profile songs. spending entire afternoons customizing your blog theme. the internet felt like a place you could actually get lost in.",images:[],tags:["internet","nostalgia","personal"],notes:482,url:null,demo:true},
  {id:"demo-4",blog:"midnightflowers",date:"2012-09-25",timestamp:1348531200,type:"photo",text:"keep the blurry ones. they're usually the best memories.",images:["https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1000&q=85"],tags:["flowers","film","photography"],notes:1026,url:null,demo:true},
  {id:"demo-5",blog:"quietplaces",date:"2011-06-22",timestamp:1308700800,type:"photo",text:"take the long way home",images:["https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1000&q=85"],tags:["nature","summer","adventure"],notes:1863,url:null,demo:true}
];
const read=(k,defaultValue)=>{try{return JSON.parse(localStorage.getItem(k))??defaultValue}catch{return defaultValue}};
const cutoffSeconds=(date)=>Math.floor(Date.parse(date+"T23:59:59Z")/1000)+1;
const pretty=date=>new Date(date+"T12:00:00Z").toLocaleDateString("en-US",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});
const isPhoto=post=>post.images?.length>0;
function PostCard({post,liked,saved,onLike,onSave,onTag,onBlog}){
  const avatar=post.blog?.slice(0,1).toUpperCase()||"T";
  return <article className="tt-post" aria-label={"Post by "+post.blog}>
    <div className="tt-avatar" aria-hidden="true">{avatar}</div>
    <div className="tt-post-paper">
      <div className="tt-post-head">
        <div><button type="button" onClick={()=>onBlog?.(post.blog)} className="tt-post-blog">{post.blog}</button>{post.reblogFrom&&<span className="tt-reblog"> <Repeat2 size={11}/> from {post.reblogFrom}</span>}<small>{pretty(post.date)} · {post.type}{post.demo?" · SAMPLE":""}</small></div>
        {post.url&&<a href={post.url} target="_blank" rel="noopener noreferrer" className="tt-post-open" title="View original Tumblr post"><ExternalLink size={15}/></a>}
      </div>
      {post.title&&<h3 className="tt-post-title">{post.title}</h3>}
      {post.type==="quote"&&post.quote&&<blockquote className="tt-quote">“{post.quote}”<small>{post.quoteSource}</small></blockquote>}
      {post.images?.length>0&&<div className={"tt-photos"+(post.images.length>1?" multiple":"")}>{post.images.slice(0,6).map((url,i)=><a href={post.url||url} target="_blank" rel="noopener noreferrer" key={url+i} aria-label="Open photo or original post"><img src={url} alt={"Image "+(i+1)+" from "+post.blog} loading="lazy" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.display="none"}}/></a>)}</div>}
      {post.text&&post.type!=="quote"&&<p className="tt-post-text">{post.text}</p>}
      {!post.text&&!post.images?.length&&!post.quote&&<p className="tt-post-text empty">This post's media or embed cannot be displayed here. Use the original-post link if available.</p>}
      {post.tags?.length>0&&<div className="tt-post-tags">{post.tags.slice(0,15).map(tag=><button key={tag} onClick={()=>onTag(tag)}>#{tag.replace(/\s/g,"")}</button>)}</div>}
      <div className="tt-post-footer"><span>{(post.notes||0).toLocaleString()} notes</span><div>
        <button className={saved?"marked":""} onClick={()=>onSave(post)} aria-label={saved?"Remove bookmark":"Save post"} title="Save to your local archive"><Bookmark size={17} fill={saved?"currentColor":"none"}/></button>
        {post.url&&<a href={post.url} target="_blank" rel="noopener noreferrer" aria-label="View on Tumblr" title="View on Tumblr"><ArrowUpRight size={17}/></a>}
        <button className={liked?"hearted":""} onClick={()=>onLike(post)} aria-label={liked?"Unlike":"Like post"} title="Local like"><Heart size={19} fill={liked?"currentColor":"none"}/></button>
      </div></div>
    </div>
  </article>;
}

export default function LiveArchive({date,tab,initialTag,initialBlog,onTag,onBlog,followed=[]}){
  const [configured,setConfigured]=useState(null);
  const [source,setSource]=useState("blog");
  const [blog,setBlog]=useState("staff");
  const [tag,setTag]=useState("nostalgia");
  const [blogDraft,setBlogDraft]=useState("staff");
  const [tagDraft,setTagDraft]=useState("nostalgia");
  const [posts,setPosts]=useState([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [cursor,setCursor]=useState({offset:0,before:null,hasMore:false});
  const [type,setType]=useState("all");
  const [query,setQuery]=useState("");
  const [mode,setMode]=useState("live");
  const [range,setRange]=useState("all");
  const [liked,setLiked]=useState(()=>read("tm2-likes",{}));
  const [saved,setSaved]=useState(()=>read("tm2-saved",{}));
  const [archiveNames,setArchiveNames]=useState(()=>read("tm2-imported-blogs",["staff"]));
  const [lastSource,setLastSource]=useState("blog:staff");
  useEffect(()=>{let active=true;fetch("/api/tumblr?mode=status").then(r=>r.json()).then(j=>{if(active){setConfigured(!!j.configured);if(!j.configured)setMode("sample")}}).catch(()=>{if(active){setConfigured(false);setMode("sample")}});return()=>{active=false}},[]);
  useEffect(()=>{localStorage.setItem("tm2-likes",JSON.stringify(liked))},[liked]);
  useEffect(()=>{localStorage.setItem("tm2-saved",JSON.stringify(saved))},[saved]);
  useEffect(()=>{localStorage.setItem("tm2-imported-blogs",JSON.stringify(archiveNames))},[archiveNames]);
  useEffect(()=>{if(initialTag){setTag(initialTag);setTagDraft(initialTag);setSource("tag");setMode("live")}else if(initialBlog){setBlog(initialBlog);setBlogDraft(initialBlog);setSource("blog");setMode("live")}else if(tab==="explore"){setSource("tag")}},[initialTag,initialBlog,tab]);
  const effectiveMode=mode==="live"&&configured?"live":"sample";
  const fetchAbort=useRef(null);
  const currentSource=source==="blog"?"blog:"+blog:"tag:"+tag;
  const requestPage=async ({append=false,signal}={})=>{
    const before=append&&source==="tag"?cursor.before:cutoffSeconds(date);
    const offset=append&&source==="blog"?cursor.offset:0;
    const params=new URLSearchParams({mode:source,limit:"20",before:String(before||cutoffSeconds(date)),offset:String(offset),[source]:source==="blog"?blog:tag});
    const res=await fetch("/api/tumblr?"+params.toString(),{signal});
    let data;try{data=await res.json()}catch{throw new Error("The server returned an unreadable response.")}
    if(!res.ok)throw new Error(data.error||"Tumblr request failed ("+res.status+").");
    if(!Array.isArray(data.posts))throw new Error("Tumblr returned an unexpected archive response.");
    const newPosts=data.posts.filter(p=>p.date&&p.date<=date);
    setPosts(old=>{
      if(!append)return newPosts;
      const ids=new Set(old.map(p=>p.id));
      return [...old,...newPosts.filter(p=>!ids.has(p.id))];
    });
    setCursor({offset:data.nextOffset||0,before:data.nextBefore,hasMore:!!data.hasMore&&newPosts.length>0});
    setLastSource(currentSource);
  };
  useEffect(()=>{
    if(effectiveMode!=="live"||tab==="likes"||tab==="saved")return;
    const controller=new AbortController();fetchAbort.current?.abort();fetchAbort.current=controller;
    setLoading(true);setError("");setPosts([]);setCursor({offset:0,before:null,hasMore:false});
    const timer=setTimeout(()=>requestPage({signal:controller.signal}).catch(e=>{if(e.name!=="AbortError")setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)}),450);
    return()=>{clearTimeout(timer);controller.abort()};
  },[effectiveMode,source,blog,tag,date,tab]);
  const submit=(e)=>{e.preventDefault();setMode("live");setError("");if(source==="blog"){const value=blogDraft.trim().toLowerCase().replace(/^https?:\/\//,"").replace(/^www\./,"").replace(/\.tumblr\.com.*$/,"").replace(/\/.*$/,"");if(!/^[a-z0-9_-]{1,64}$/.test(value)){setError("Enter a valid Tumblr username, such as staff.");return}setBlog(value);setArchiveNames(old=>[value,...old.filter(x=>x!==value)].slice(0,20))}else{const value=tagDraft.trim().replace(/^#/,"");if(!value){setError("Enter a tag to search.");return}setTag(value)}};
  const like=post=>setLiked(old=>{const next={...old};if(next[post.id])delete next[post.id];else next[post.id]=post;return next});
  const save=post=>setSaved(old=>{const next={...old};if(next[post.id])delete next[post.id];else next[post.id]=post;return next});
  const archivePosts=effectiveMode==="sample"?SAMPLES.filter(p=>p.date<=date):posts;
  const viewPosts=tab==="likes"?Object.values(liked).filter(p=>p.date<=date):tab==="saved"?Object.values(saved).filter(p=>p.date<=date):archivePosts;
  const filtered=useMemo(()=>viewPosts.filter(p=>(type==="all"||(type==="photo"?isPhoto(p):p.type===type))&&(!query||[p.blog,p.title,p.text,p.quote,...(p.tags||[])].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase()))).sort((a,b)=>b.date.localeCompare(a.date)),[viewPosts,type,query]);
  const loadMore=async()=>{if(loading||!cursor.hasMore)return;setLoading(true);setError("");try{await requestPage({append:true})}catch(e){setError(e.message)}finally{setLoading(false)}};
  const pinnedMode=tab==="saved"||tab==="likes";
  return <section className="tt-live">
    <div className="tt-feed-intro"><div><div className="tt-overline">{pinnedMode?"YOUR LOCAL COLLECTION":effectiveMode==="live"?"LIVE TUMBLR ARCHIVE":"HISTORICAL PREVIEW"}</div><h2>{tab==="liked"||tab==="likes"?"Liked posts":tab==="saved"?"Saved posts":initialBlog?initialBlog:initialTag?"#"+initialTag:tab==="following"?"Following archive":source==="blog"?"Explore a Tumblr blog":"Explore a historical tag"}</h2><p>{pinnedMode?"These posts are stored in this browser.":effectiveMode==="live"?"Surviving public Tumblr posts published no later than "+pretty(date)+".":"Illustrative demo posts. Connect a Tumblr API key for real history."}</p></div><div className={"tt-api-chip "+(configured?"ready":"offline")}>{configured?<><Wifi size={13}/> API connected</>:<><WifiOff size={13}/> {configured===null?"Checking…":"Demo only"}</>}</div></div>
    {!pinnedMode&&<div className="tt-import-box">
      <div className="tt-import-head"><span><Archive size={16}/> HISTORICAL POST FINDER</span><span>READ-ONLY · ORIGINAL DATES</span></div>
      <div className="tt-source-switch"><button onClick={()=>{setSource("blog");setMode(configured?"live":"sample")}} className={source==="blog"?"active":""}>By blog</button><button onClick={()=>{setSource("tag");setMode(configured?"live":"sample")}} className={source==="tag"?"active":""}>By tag</button></div>
      <form className="tt-import-form" onSubmit={submit}>
        <div className="tt-input"><span>{source==="blog"?"tumblr.com/":"#"}</span><input type="text" value={source==="blog"?blogDraft:tagDraft} onChange={e=>source==="blog"?setBlogDraft(e.target.value):setTagDraft(e.target.value)} placeholder={source==="blog"?"staff":"creepypasta"} aria-label={source==="blog"?"Tumblr username":"Tumblr tag"} maxLength={120}/></div>
        <button type="submit" className="tt-fetch" disabled={!configured}><Search size={16}/> Fetch posts</button>
      </form>
      {source==="blog"&&<div className="tt-import-history"><span>Quick access:</span>{archiveNames.slice(0,5).map(name=><button key={name} onClick={()=>{setBlogDraft(name);setBlog(name);setSource("blog");setMode("live")}}>{name}</button>)}{followed.filter(name=>!archiveNames.includes(name)).slice(0,3).map(name=><button key={name} onClick={()=>{setBlogDraft(name);setBlog(name);setSource("blog");setMode("live")}}>{name}</button>)}</div>}
      {!configured&&configured!==null&&<div className="tt-setup-message"><LockKeyhole size={16}/><span>Real Tumblr retrieval is installed but needs its private API key in Cloudflare. Until then, you can preview the interface with sample posts. <a href="https://www.tumblr.com/oauth/apps" target="_blank" rel="noopener noreferrer">Register a Tumblr application ↗</a></span></div>}
      {configured&&<div className="tt-live-toggle"><button className={mode==="live"?"active":""} onClick={()=>setMode("live")}><Wifi size={13}/> Real Tumblr posts</button><button className={mode==="sample"?"active":""} onClick={()=>setMode("sample")}><ImageIcon size={13}/> Sample preview</button></div>}
    </div>}
    <div className="tt-filterrow"><span className="tt-post-count">{loading?"Retrieving archive…":filtered.length+" posts displayed"} {effectiveMode==="live"&&!pinnedMode&&<small>· up to {pretty(date)}</small>}</span><div className="tt-filtertools"><label><SlidersHorizontal size={13}/><select value={type} onChange={e=>setType(e.target.value)} aria-label="Filter post type"><option value="all">All posts</option><option value="photo">Photos</option><option value="text">Text</option><option value="quote">Quotes</option><option value="video">Videos</option><option value="audio">Audio</option><option value="link">Links</option></select></label><label><Search size={13}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filter loaded posts…" aria-label="Filter displayed posts"/></label></div></div>
    {error&&<div className="tt-error"><AlertCircle size={16}/><span>{error}</span><button onClick={()=>{setMode("sample");setError("")}}>View samples</button></div>}
    {loading&&posts.length===0&&effectiveMode==="live"&&!pinnedMode&&<div className="tt-loading"><Loader2 size={24} className="rotating"/><p>Searching the historical archive…</p></div>}
    {!loading&&filtered.length===0&&<div className="tt-empty"><FolderOpen size={30}/><strong>No matching posts</strong><p>{pinnedMode?"Save or like a post first.":effectiveMode==="live"?"Tumblr returned no public posts matching this date and source. Try a different tag, blog, or cutoff.":"Try a later cutoff date or another post type."}</p></div>}
    <div className="tt-post-list">{filtered.map(p=><PostCard key={p.id} post={p} liked={!!liked[p.id]} saved={!!saved[p.id]} onLike={like} onSave={save} onTag={onTag} onBlog={onBlog}/>)}</div>
    {effectiveMode==="live"&&!pinnedMode&&cursor.hasMore&&<button className="tt-load-more" disabled={loading} onClick={loadMore}>{loading?<Loader2 size={15} className="rotating"/>:<Plus size={15}/>} {loading?"Loading…":"Load 20 more historical posts"}</button>}
    <div className="tt-feed-end">✦ {effectiveMode==="live"?"Archive results depend on the content still accessible through Tumblr's API.":"Sample posts are illustrative, not authentic Tumblr records."} ✦</div>
  </section>;
}
