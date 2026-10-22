import React,{useEffect,useState,useRef} from "react";
import {createRoot} from "react-dom/client";
import {Home,Compass,Heart,Bookmark,CalendarDays,ChevronRight,Menu,Sun,Moon,Info,Camera,Quote,Type,Link2,MessageSquare,Video,Headphones,Plus,ExternalLink,X,ArrowLeft,Search,Clock3,SlidersHorizontal,BookOpen,Archive,Check} from "lucide-react";
import CultureTimeline from "./CultureTimeline.jsx";
import LiveArchive from "./LiveArchive.jsx";
import "./style.css";
import "./search.css";

const read=(key,def)=>{try{return JSON.parse(localStorage.getItem(key))??def}catch{return def}};
const userDate=()=>read("tm-date","2012-12-31");
const formats=[["text","Text",Type],["photo","Photo",Camera],["quote","Quote",Quote],["link","Link",Link2],["chat","Chat",MessageSquare],["audio","Audio",Headphones],["video","Video",Video]];
const validBlog=raw=>{let name=raw.trim().toLowerCase().replace(/^https?:\/\//,"").replace(/^www\./,"").replace(/\.tumblr\.com.*$/,"").replace(/\/.*$/,"");return /^[a-z0-9_-]{1,64}$/.test(name)?name:null};
function App(){
  const [date,setDate]=useState(userDate);
  const [tab,setTab]=useState("dashboard");
  const [filterType,setFilterType]=useState("all");
  const [tag,setTag]=useState("");
  const [blog,setBlog]=useState("");
  const [night,setNight]=useState(()=>read("tm-dark",false));
  const [mobile,setMobile]=useState(false);
  const [notes,setNotes]=useState(()=>read("tm-posts",[]));
  const [showEditor,setShowEditor]=useState(false);
  const [draft,setDraft]=useState({title:"",text:"",tags:""});
  const [savedBlogs,setSavedBlogs]=useState(()=>read("tm-follows",["staff","internetghost"]));
  const [drawer,setDrawer]=useState(false);
  const [toolTab,setToolTab]=useState("time");
  const [importMode,setImportMode]=useState("blog");
  const [importValue,setImportValue]=useState("");
  const [search,setSearch]=useState("");
  const [importError,setImportError]=useState("");
  const [searchOpen,setSearchOpen]=useState(false);
  const searchRef=useRef(null);
  const drawerCloseRef=useRef(null);
  useEffect(()=>{const close=e=>{if(!searchRef.current?.contains(e.target))setSearchOpen(false)};document.addEventListener("pointerdown",close);return()=>document.removeEventListener("pointerdown",close)},[]);
  useEffect(()=>localStorage.setItem("tm-date",JSON.stringify(date)),[date]);
  useEffect(()=>localStorage.setItem("tm-dark",JSON.stringify(night)),[night]);
  useEffect(()=>localStorage.setItem("tm-follows",JSON.stringify(savedBlogs)),[savedBlogs]);
  useEffect(()=>localStorage.setItem("tm-posts",JSON.stringify(notes)),[notes]);
  useEffect(()=>{if(!drawer)return;const original=document.body.style.overflow;document.body.style.overflow="hidden";const key=e=>{if(e.key==="Escape")setDrawer(false)};window.addEventListener("keydown",key);drawerCloseRef.current?.focus();return()=>{document.body.style.overflow=original;window.removeEventListener("keydown",key)}},[drawer]);
  const toggleFollow=name=>setSavedBlogs(prev=>prev.includes(name)?prev.filter(x=>x!==name):[name,...prev]);
  const view=key=>{setTab(key);setTag("");setBlog("");setFilterType("all");setMobile(false)};
  const browseBlog=name=>{setBlog(name);setTag("");setTab("dashboard");setFilterType("all");setDrawer(false);setMobile(false)};
  const browseTag=name=>{setTag(name);setBlog("");setTab("explore");setFilterType("all");setDrawer(false);setMobile(false)};
  const browseType=type=>{setFilterType(type);setTab("dashboard");setTag("");setBlog("")};
  const navigateEvent=event=>{setDate(event.date);browseTag(event.tags?.[0]||"nostalgia")};
  const saveNote=()=>{if(!draft.text.trim())return;const p={id:Date.now(),blog:"my-time-capsule",date,type:"text",title:draft.title,text:draft.text,tags:draft.tags.split(",").map(t=>t.trim().replace(/^#/,"")).filter(Boolean),notes:0};setNotes([p,...notes]);setDraft({title:"",text:"",tags:""});setShowEditor(false);setTab("notes")};
  const goSearch=e=>{e.preventDefault();const value=search.trim().replace(/^#/,"");if(value){browseTag(value);setSearch("");setSearchOpen(false)}};
  const candidateTags=["creepypasta","slenderman","invader zim","nyancat","scene","emo","homestuck","photography","minecraft","gir"];
  const suggestions=candidateTags.filter(x=>!search.trim()||x.includes(search.toLowerCase())).slice(0,5);
  const matchingBlogs=savedBlogs.filter(x=>!search.trim()||x.includes(search.toLowerCase())).slice(0,3);
  const submitImport=e=>{e.preventDefault();const value=importValue.trim().replace(/^#/,"");if(!value){setImportError("Enter a blog or tag.");return}if(importMode==="blog"){const name=validBlog(value);if(!name){setImportError("Enter a valid Tumblr blog name.");return}setSavedBlogs(old=>[name,...old.filter(n=>n!==name)].slice(0,30));browseBlog(name)}else{browseTag(value)}setImportError("");setImportValue("")};
  const title=tab==="explore"?"Explore":tab==="likes"?"Likes":tab==="saved"?"Saved posts":tab==="notes"?"Posts":"Dashboard";
  return <div className={"app classic immersive"+(night?" night":"")}>
    <header className="classic-topbar"><div className="classic-top-inner">
      <button className="classic-logo" onClick={()=>view("dashboard")} title="Dashboard">tumblr<span>.</span></button>
      <nav className={"classic-topnav"+(mobile?" expanded":"")} aria-label="Main navigation">
        <button className={tab==="dashboard"?"active":""} onClick={()=>view("dashboard")}><Home size={14}/> Dashboard</button>
        <button className={tab==="explore"?"active":""} onClick={()=>view("explore")}><Compass size={14}/> Explore</button>
        <button className={tab==="likes"?"active":""} onClick={()=>view("likes")}><Heart size={14}/> Likes</button>
        <button className={tab==="saved"?"active":""} onClick={()=>view("saved")}><Bookmark size={14}/> Saved</button>
      </nav>
      <div className="tm-search-wrap" ref={searchRef}>
      <form className="classic-global-search" onSubmit={goSearch} role="search"><Search size={15}/><input aria-label="Search Tumblr tags" value={search} onFocus={()=>setSearchOpen(true)} onKeyDown={e=>{if(e.key==="Escape")setSearchOpen(false)}} onChange={e=>{setSearch(e.target.value);setSearchOpen(true)}} placeholder="Search Tumblr" autoComplete="off" /></form>
      {searchOpen&&<div className="tm-search-popup">
        <div className="tm-search-title">Tags</div>
        {suggestions.map((name,i)=><button type="button" key={name} className="tm-search-suggestion" onClick={()=>{browseTag(name);setSearchOpen(false);setSearch("")}}><span className={"tm-search-icon n"+i}>#</span><span><strong>{name}</strong><small>Browse posts</small></span><ChevronRight size={13}/></button>)}
        {matchingBlogs.length>0&&<><div className="tm-search-title">Blogs</div>{matchingBlogs.map((name,i)=><button type="button" key={name} className="tm-search-suggestion" onClick={()=>{browseBlog(name);setSearchOpen(false);setSearch("")}}><span className={"tm-search-icon b"+i}>{name[0].toUpperCase()}</span><span><strong>{name}</strong><small>Visit blog</small></span><ChevronRight size={13}/></button>)}</>}
        {suggestions.length===0&&matchingBlogs.length===0&&<div className="tm-search-noresults">Press Enter to search #{search.trim()}</div>}
        <button type="button" className="tm-search-all" onClick={goSearch}>Explore more tags <ArrowRight size={13}/></button>
      </div>}
    </div>
      <div className="classic-top-utils">
        <button className="tm-secret-trigger" onClick={()=>{setToolTab("time");setDrawer(true)}} title="Time Machine" aria-label="Open Time Machine" aria-haspopup="dialog"><Clock3 size={17}/></button>
        <button className="classic-menu" onClick={()=>setMobile(!mobile)} title="Open menu" aria-label="Open navigation"><Menu size={20}/></button>
      </div>
    </div></header>
    <div className="classic-shell">
      <div className="classic-main-col">
        {tab!=="notes"&&<div className="classic-composer"><div className="classic-avatar" title="Your avatar">t</div><div className="classic-composer-card">
          {formats.map(([kind,label,Icon])=><button key={kind} onClick={()=>kind==="text"?setShowEditor(true):browseType(kind)} title={kind==="text"?"Create a local draft":"Show "+label.toLowerCase()+" posts"}><span className={"classic-composer-icon "+kind}>{kind==="text"?<span>Aa</span>:<Icon size={24} strokeWidth={2.6}/>}</span><small>{label}</small></button>)}
        </div></div>}
        {tab==="notes"?<section className="classic-notes"><div className="classic-page-heading"><h1>Posts</h1><p>Your private drafts</p></div><button onClick={()=>setShowEditor(true)} className="classic-new-note"><Plus size={16}/> New post</button>{notes.length===0?<p className="classic-no-notes">No drafts yet.</p>:notes.map(p=><article key={p.id} className="classic-note"><small>{p.date}</small><h2>{p.title||"Untitled"}</h2><p>{p.text}</p><span>{p.tags?.map(t=>"#"+t).join(" ")}</span></article>)}</section>:
         <><div className="classic-bar"><h1>{title}{blog&&<span> / {blog}</span>}{tag&&<span> / #{tag}</span>}{filterType!=="all"&&<span> / {filterType} posts</span>}</h1>{(blog||tag||filterType!=="all")&&<button onClick={()=>view("dashboard")}>Clear <X size={12}/></button>}</div>
         <LiveArchive immersive date={date} tab={tab} initialBlog={blog} initialTag={tag} onBlog={browseBlog} onTag={browseTag} followed={savedBlogs} onToggleFollow={toggleFollow} initialType={filterType}/></>}
      </div>
      <aside className="classic-sidebar">
        <div className="classic-profile"><div className="classic-profile-top"><div className="classic-profile-avatar">t</div><div><strong>timecapsule</strong><small>your dashboard</small></div></div><nav>
          <button onClick={()=>view("dashboard")}><Home size={15}/> Dashboard <ChevronRight size={12}/></button>
          <button onClick={()=>view("likes")}><Heart size={15}/> Likes <ChevronRight size={12}/></button>
          <button onClick={()=>view("saved")}><Bookmark size={15}/> Saved posts <ChevronRight size={12}/></button>
          <button onClick={()=>view("notes")}><Type size={15}/> Posts <ChevronRight size={12}/></button>
        </nav></div>
        <section className="classic-sidebox"><h2><Compass size={14}/> TAGS</h2><div className="classic-tags">{["creepypasta","slenderman","invader zim","nyancat","emo","scene","homestuck","photography"].map(t=><button key={t} onClick={()=>browseTag(t)}># {t}</button>)}</div></section>
        <section className="classic-sidebox"><h2><Bookmark size={14}/> BLOGS</h2>{savedBlogs.slice(0,7).map(name=><div className="classic-blogrow" key={name}><button onClick={()=>browseBlog(name)}><span className="classic-mini-avatar">{name[0].toUpperCase()}</span>{name}</button><button onClick={()=>setSavedBlogs(savedBlogs.filter(x=>x!==name))} title={"Remove "+name}><X size={12}/></button></div>)}<div className="classic-addblog"><input aria-label="Add Tumblr username" id="newblog" placeholder="Follow a blog" maxLength={64} onKeyDown={e=>{if(e.key==="Enter"){const val=validBlog(e.currentTarget.value);if(val){setSavedBlogs([val,...savedBlogs.filter(x=>x!==val)]);e.currentTarget.value=""}}}}/><small>Type a username and press Enter</small></div></section>
      </aside>
    </div>
    {drawer&&<div className="tm-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setDrawer(false)}}>
      <aside className="tm-drawer" role="dialog" aria-modal="true" aria-label="Time Machine controls">
        <div className="tm-drawer-top"><div><div className="tm-drawer-eyebrow">BEHIND THE CURTAIN</div><h2><Clock3 size={24}/> Time Machine</h2><p>Control the era without changing the Tumblr experience.</p></div><button className="tm-close" onClick={()=>setDrawer(false)} ref={drawerCloseRef} aria-label="Close Time Machine"><X size={22}/></button></div>
        <div className="tm-tool-tabs" role="tablist" aria-label="Time Machine tools">{[["time","Time",CalendarDays],["culture","Culture Clock",Compass],["import","Find posts",Search],["settings","Settings",SlidersHorizontal]].map(([id,label,Icon])=><button role="tab" aria-selected={toolTab===id} key={id} className={toolTab===id?"active":""} onClick={()=>setToolTab(id)}><Icon size={15}/>{label}</button>)}</div>
        <div className="tm-tool-content">
          {toolTab==="time"&&<><div className="tm-tool-intro"><h3>Choose your moment</h3><p>The dashboard, its posts, and anything you explore will stay within your selected date.</p></div>
            <div className="tm-date-display"><small>YOU ARE IN</small><strong>{new Date(date+"T12:00:00Z").toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric",timeZone:"UTC"})}</strong></div>
            <label className="tm-field-label" htmlFor="tm-selected-date">Go to a particular day</label><input id="tm-selected-date" className="tm-date-input" type="date" min="2009-01-01" max="2015-12-31" value={date} onChange={e=>e.target.value&&setDate(e.target.value)}/>
            <label className="tm-field-label" htmlFor="tm-year-slider">Browse by year</label><input id="tm-year-slider" className="tm-year-slider" aria-label="Choose year" type="range" min="2009" max="2015" value={+date.slice(0,4)} onChange={e=>setDate(e.target.value+"-12-31")}/>
            <div className="tm-quick-years">{["2009","2010","2011","2012","2013","2014","2015"].map(y=><button key={y} className={date.startsWith(y)?"chosen":""} onClick={()=>setDate(y+"-12-31")}>{y}</button>)}</div>
            <button className="tm-open-culture" onClick={()=>setToolTab("culture")}><Compass size={18}/> Explore events and internet culture <ChevronRight size={16}/></button>
          </>}
          {toolTab==="culture"&&<><div className="tm-tool-intro"><h3>Culture Clock</h3><p>Explore cultural milestones and jump into their eras.</p></div><CultureTimeline date={date} onDateChange={setDate} onExplore={navigateEvent}/></>}
          {toolTab==="import"&&<><div className="tm-tool-intro"><h3>Find something</h3><p>Browse posts from a particular Tumblr blog or tag, within your chosen date.</p></div>
            <div className="tm-search-types"><button className={importMode==="blog"?"active":""} onClick={()=>{setImportMode("blog");setImportError("")}}>Blog</button><button className={importMode==="tag"?"active":""} onClick={()=>{setImportMode("tag");setImportError("")}}>Tag</button></div>
            <form className="tm-import-form" onSubmit={submitImport}><label htmlFor="tm-import-input">{importMode==="blog"?"Tumblr username or URL":"Tag"}</label><div className="tm-import-input"><span>{importMode==="blog"?"tumblr.com/":"#"}</span><input id="tm-import-input" autoComplete="off" value={importValue} onChange={e=>setImportValue(e.target.value)} placeholder={importMode==="blog"?"staff":"creepypasta"}/></div>{importError&&<p className="tm-import-error">{importError}</p>}<button type="submit"><Search size={15}/> Browse posts</button></form>
            <div className="tm-tool-intro"><h3>Quick access</h3></div><div className="tm-import-shortcuts">{savedBlogs.slice(0,10).map(name=><button key={name} onClick={()=>browseBlog(name)}>{name} <ChevronRight size={13}/></button>)}</div>
          </>}
          {toolTab==="settings"&&<><div className="tm-tool-intro"><h3>Preferences</h3><p>Options for your personal time machine.</p></div><button className="tm-setting-row" onClick={()=>setNight(!night)}><span>{night?<Moon size={19}/>:<Sun size={19}/>} Dashboard appearance<small>{night?"Nighttime navy":"Classic navy"}</small></span><strong>{night?"Night":"Classic"}</strong></button><div className="tm-disclaimer"><Info size={16}/><p>This is an independent website, not official Tumblr. Posts come from the public Tumblr API. The cutoff hides later posts but does not reconstruct old note counts, edited posts, or deleted media. Likes, bookmarks, and personal drafts are stored locally.</p></div><a className="tm-repo-link" href="https://github.com/AlexSmith1447/TMBLRTM" target="_blank" rel="noopener noreferrer">Project source <ExternalLink size={14}/></a></>}
        </div>
        <div className="tm-drawer-footer"><button onClick={()=>setDrawer(false)}><Check size={16}/> Return to Tumblr</button></div>
      </aside>
    </div>}
    {showEditor&&<div className="classic-overlay" onMouseDown={e=>e.target===e.currentTarget&&setShowEditor(false)}><div className="classic-dialog"><button className="classic-close" onClick={()=>setShowEditor(false)} aria-label="Close editor"><X size={19}/></button><h2>New post</h2><p>Saved privately in your browser. This won't publish to Tumblr.</p><input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="Title (optional)"/><textarea rows="7" value={draft.text} onChange={e=>setDraft({...draft,text:e.target.value})} placeholder="Write something..." /><input value={draft.tags} onChange={e=>setDraft({...draft,tags:e.target.value})} placeholder="Tags separated by commas"/><button className="classic-submit" onClick={saveNote} disabled={!draft.text.trim()}>Save draft</button></div></div>}
  </div>;
}
createRoot(document.getElementById("root")).render(<App/>);
