import React,{useEffect,useState} from "react";
import {createRoot} from "react-dom/client";
import {Home,Compass,Heart,Bookmark,CalendarDays,Archive,ChevronRight,Menu,Sun,Moon,Info,Music,Camera,Quote,Type,Link2,MessageSquare,Video,Headphones,Plus,ExternalLink,X,Check,ArrowLeft,Search,Settings,Globe2,RefreshCw,Clock3} from "lucide-react";
import CultureTimeline from "./CultureTimeline.jsx";
import LiveArchive from "./LiveArchive.jsx";
import "./style.css";

const read=(key,def)=>{try{return JSON.parse(localStorage.getItem(key))??def}catch{return def}};
const userDate=()=>read("tm-date","2012-12-31");
const formats=[["text","Text",Type],["photo","Photo",Camera],["quote","Quote",Quote],["link","Link",Link2],["chat","Chat",MessageSquare],["audio","Audio",Headphones],["video","Video",Video]];
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
  useEffect(()=>localStorage.setItem("tm-date",JSON.stringify(date)),[date]);
  useEffect(()=>localStorage.setItem("tm-dark",JSON.stringify(night)),[night]);
  useEffect(()=>localStorage.setItem("tm-follows",JSON.stringify(savedBlogs)),[savedBlogs]);
  useEffect(()=>localStorage.setItem("tm-posts",JSON.stringify(notes)),[notes]);
  const view=key=>{setTab(key);setTag("");setBlog("");setFilterType("all");setMobile(false)};
  const browseBlog=name=>{setBlog(name);setTag("");setTab("dashboard");setMobile(false)};
  const browseTag=name=>{setTag(name);setBlog("");setTab("explore");setMobile(false)};
  const browseType=type=>{setFilterType(type);setTab("dashboard");setTag("");setBlog("")};
  const navigateEvent=event=>{setDate(event.date);browseTag(event.tags?.[0]||"nostalgia")};
  const saveNote=()=>{if(!draft.text.trim())return;const p={id:Date.now(),blog:"my-time-capsule",date, time:date,type:"text",title:draft.title,text:draft.text,tags:draft.tags.split(",").map(t=>t.trim().replace(/^#/,"")).filter(Boolean),notes:0};setNotes([p,...notes]);setDraft({title:"",text:"",tags:""});setShowEditor(false);setTab("notes")};
  const title=tab==="timeline"?"The Culture Clock":tab==="explore"?"Explore":tab==="likes"?"Likes":tab==="saved"?"Saved posts":tab==="notes"?"My time capsule":"Dashboard";
  return <div className={"app classic"+(night?" night":"")}>
    <header className="classic-topbar"><div className="classic-top-inner">
      <button className="classic-logo" onClick={()=>view("dashboard")} title="Tumblr Time Machine home">tumblr<span>.</span></button>
      <nav className={"classic-topnav"+(mobile?" expanded":"")} aria-label="Main navigation">
        <button className={tab==="dashboard"?"active":""} onClick={()=>view("dashboard")}><Home size={14}/> Dashboard</button>
        <button className={tab==="explore"?"active":""} onClick={()=>view("explore")}><Compass size={14}/> Explore</button>
        <button className={tab==="timeline"?"active":""} onClick={()=>view("timeline")}><Clock3 size={14}/> Culture Clock</button>
        <button className={tab==="saved"?"active":""} onClick={()=>view("saved")}><Bookmark size={14}/> Saved</button>
      </nav>
      <div className="classic-top-utils"><span className="classic-year">{date.slice(0,4)} edition</span><button title="Toggle nighttime theme" onClick={()=>setNight(!night)}>{night?<Sun size={18}/>:<Moon size={18}/>}</button><button className="classic-menu" onClick={()=>setMobile(!mobile)} title="Open menu"><Menu size={20}/></button></div>
    </div></header>
    <div className="classic-shell">
      <div className="classic-main-col">
        <div className="classic-statusline"><span><Clock3 size={13}/> THE WAY THE WEB WAS</span><span>Browsing as of {new Date(date+"T12:00:00Z").toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric",timeZone:"UTC"})}</span></div>
        {tab!=="timeline"&&<div className="classic-composer"><div className="classic-avatar" title="Your time capsule avatar">t</div><div className="classic-composer-card">
          {formats.map(([kind,label,Icon])=><button key={kind} onClick={()=>kind==="text"?setShowEditor(true):browseType(kind==="photo"?"photo":kind)} title={kind==="text"?"Write a local capsule note":"Filter the historical feed by "+label.toLowerCase()+" posts"}><span className={"classic-composer-icon "+kind}>{kind==="text"?<span>Aa</span>:<Icon size={24} strokeWidth={2.6}/>}</span><small>{label}</small></button>)}
        </div></div>}
        {tab==="timeline"?<div className="classic-timeline-page"><div className="classic-page-heading"><h1>Culture Clock</h1><p>A time machine through the strange, wonderful early internet.</p></div><CultureTimeline date={date} onDateChange={setDate} onExplore={navigateEvent}/></div>:
         tab==="notes"?<section className="classic-notes"><div className="classic-page-heading"><h1>My time capsule</h1><p>Personal notes saved locally in your browser.</p></div><button onClick={()=>setShowEditor(true)} className="classic-new-note"><Plus size={16}/> Write a memory</button>{notes.length===0?<p className="classic-no-notes">No notes yet.</p>:notes.map(p=><article key={p.id} className="classic-note"><small>{p.date}</small><h2>{p.title||"Untitled note"}</h2><p>{p.text}</p><span>{p.tags?.map(t=>"#"+t).join(" ")}</span></article>)}</section>:
         <><div className="classic-bar"><h1>{title}{blog&&<span> / {blog}</span>}{tag&&<span> / #{tag}</span>}</h1><button onClick={()=>view("timeline")}><Clock3 size={14}/> Timeline <ChevronRight size={13}/></button></div>
         <LiveArchive date={date} tab={tab} initialBlog={blog} initialTag={tag} onBlog={browseBlog} onTag={browseTag} followed={savedBlogs} initialType={filterType}/></>}
      </div>
      <aside className="classic-sidebar">
        <div className="classic-profile"><div className="classic-profile-top"><div className="classic-profile-avatar">t</div><div><strong>timecapsule</strong><small>your corner of the internet</small></div></div><nav>
          <button onClick={()=>view("dashboard")}><Home size={15}/> Dashboard <ChevronRight size={12}/></button>
          <button onClick={()=>view("likes")}><Heart size={15}/> Liked posts <ChevronRight size={12}/></button>
          <button onClick={()=>view("saved")}><Bookmark size={15}/> Saved posts <ChevronRight size={12}/></button>
          <button onClick={()=>view("notes")}><Type size={15}/> My notes <ChevronRight size={12}/></button>
        </nav></div>
        <section className="classic-sidebox date"><h2><CalendarDays size={14}/> TIME TRAVEL</h2><div className="classic-big-year">{date.slice(0,4)}<span>↗</span></div><label htmlFor="classic-date">Travel to a day</label><input type="date" id="classic-date" min="2009-01-01" max="2015-12-31" value={date} onChange={e=>e.target.value&&setDate(e.target.value)}/><div className="classic-years">{["2009","2010","2011","2012","2013","2014","2015"].map(y=><button key={y} className={date.slice(0,4)===y?"chosen":""} onClick={()=>setDate(y+"-12-31")}>{y}</button>)}</div><p>Only posts created before this date can appear in the archive.</p></section>
        <section className="classic-sidebox"><h2><Compass size={14}/> DISCOVER OLD INTERNET</h2><div className="classic-tags">{["creepypasta","slenderman","invader zim","nyancat","emo","scene","homestuck","photography"].map(t=><button key={t} onClick={()=>browseTag(t)}># {t}</button>)}</div></section>
        <section className="classic-sidebox"><h2><Archive size={14}/> YOUR SAVED BLOGS</h2>{savedBlogs.slice(0,7).map(name=><div className="classic-blogrow" key={name}><button onClick={()=>browseBlog(name)}><span className="classic-mini-avatar">{name[0].toUpperCase()}</span>{name}</button><button onClick={()=>setSavedBlogs(savedBlogs.filter(x=>x!==name))} title={"Remove "+name}><X size={12}/></button></div>)}<div className="classic-addblog"><input aria-label="Add Tumblr username" id="newblog" placeholder="Blog username" maxLength={64} onKeyDown={e=>{if(e.key==="Enter"){let val=e.currentTarget.value.trim().toLowerCase().replace(/\.tumblr\.com$/,"");if(/^[a-z0-9_-]{1,64}$/.test(val)){setSavedBlogs([val,...savedBlogs.filter(x=>x!==val)]);e.currentTarget.value=""}}}}/><small>Type a blog and press Enter</small></div></section>
        <section className="classic-sidebox notice"><h2><Info size={14}/> ABOUT THIS PROJECT</h2><p>This is an independent historical browser, not an official Tumblr service. The event timeline describes internet culture; retrieved posts remain attributed to their original creators.</p><a href="https://github.com/AlexSmith1447/TMBLRTM" target="_blank" rel="noopener noreferrer">Project source <ExternalLink size={12}/></a></section>
        <div className="classic-footer">Time Machine 2.2 · Made for an older internet<br/>Historical content subject to Tumblr availability</div>
      </aside>
    </div>
    {showEditor&&<div className="classic-overlay" onMouseDown={e=>e.target===e.currentTarget&&setShowEditor(false)}><div className="classic-dialog"><button className="classic-close" onClick={()=>setShowEditor(false)} aria-label="Close editor"><X size={19}/></button><h2>Write a memory</h2><p>This is stored only in this browser, not published to Tumblr.</p><input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="Title (optional)"/><textarea rows="7" value={draft.text} onChange={e=>setDraft({...draft,text:e.target.value})} placeholder="Write something..." /><input value={draft.tags} onChange={e=>setDraft({...draft,tags:e.target.value})} placeholder="Tags separated by commas"/><button className="classic-submit" onClick={saveNote} disabled={!draft.text.trim()}>Save local note</button></div></div>}
  </div>;
}
createRoot(document.getElementById("root")).render(<App/>);
