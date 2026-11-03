import React,{useEffect,useState,useRef} from "react";
import {Home,Search,UserRound,SquarePen,ChevronLeft,Clock3,RefreshCw,Heart,Bookmark,Users,Camera,Type,Quote,Link2,MessageCircle,Film,Headphones,Plus,ArrowLeft,X,ExternalLink,Compass} from "lucide-react";
import LiveArchive from "./LiveArchive.jsx";

/**
 * Tumblr 3.0 (June-November 2012) inspired standalone iPhone interface.
 * Archive content, likes and saved posts are the SAME as the desktop.
 * Deliberately no simulated login, fake notes or fake upload success.
 */
const TYPES=[
 {id:"text",name:"Text",icon:Type},
 {id:"photo",name:"Photo",icon:Camera},
 {id:"quote",name:"Quote",icon:Quote},
 {id:"link",name:"Link",icon:Link2},
 {id:"chat",name:"Chat",icon:MessageCircle},
 {id:"video",name:"Video",icon:Film}
];
const tags=["creepypasta","slenderman","scene","emo","invader zim","nyancat","homestuck","minecraft","photography","gothic","nintendocore"];
function MobileTumblr({
 date,tab,blog,tag,filterType,followed,notes,
 onView,onTag,onBlog,onType,onTime,onNewText
}){
 const [screen,setScreen]=useState("feed");
 const [query,setQuery]=useState("");
 const [activeSearch,setActiveSearch]=useState(false);
 const [refreshKey,setRefreshKey]=useState(0);
 const inputRef=useRef(null);
 const scrollRef=useRef(null);
 const isFeed=screen==="feed";
 const title=screen==="explore"?"Explore":screen==="account"?"Account":screen==="compose"?"New Post":tab==="likes"?"Likes":tab==="saved"?"Bookmarks":tab==="notes"?"Posts":blog?blog:tag?"#"+tag:filterType!=="all"?TYPES.find(t=>t.id===filterType)?.name+" Posts":"Dashboard";
 function change(view,nextScreen="feed"){
  if(view)onView(view);
  setScreen(nextScreen);setActiveSearch(false);
  
  scrollRef.current?.scrollTo({top:0,behavior:"instant"});
 }
 function chooseTag(next){onTag(next);setQuery("");change(null,"feed")}
 function chooseBlog(next){onBlog(next);change(null,"feed")}
 function compose(type){setScreen("feed");if(type==="text")onNewText();else onType(type)}
 useEffect(()=>{if(screen==="feed")scrollRef.current?.scrollTo({top:0,behavior:"instant"})},[tab,blog,tag,filterType,date]);
 useEffect(()=>{const listener=e=>{if(e.key==="Escape"&&screen!=="feed")setScreen("feed")};window.addEventListener("keydown",listener);return()=>window.removeEventListener("keydown",listener)},[screen]);
 const matching=tags.filter(x=>!query||x.includes(query.toLowerCase())).slice(0,10);
 const isFullCompose=screen==="compose";
 return <div className={"tm-iphone"+(isFullCompose?" tm-iphone-composing":"")} aria-label="Tumblr 2012 iPhone interface">
  <div className="tm-ios-toolbar">
    <div className="tm-ios-nav">
      <div className="tm-ios-nav-leading">{(screen!=="feed"||blog||tag||tab!=="dashboard"||filterType!=="all")?
       <button className="tm-ios-back" onClick={()=>change("dashboard")} aria-label="Back to dashboard"><ChevronLeft size={20}/> <span>Dashboard</span></button>:
       <button className="tm-ios-logo-mini" onClick={()=>setScreen("account")} aria-label="Open account">t</button>}
      </div>
      <strong className="tm-ios-nav-title">{title}</strong>
      <div className="tm-ios-nav-trailing">
       {screen==="feed"?<button className="tm-ios-history" onClick={onTime} title="Time controls" aria-label="Open Time Machine"><Clock3 size={19}/></button>:
       screen==="explore"?<button onClick={()=>{setQuery("");inputRef.current?.focus()}} aria-label="Clear search"><X size={17}/></button>:
       <button className="tm-ios-history" onClick={onTime} aria-label="Time Machine"><Clock3 size={18}/></button>}
      </div>
    </div>
  </div>

  <div className="tm-iphone-scroll" ref={scrollRef} key={screen}>
    {isFeed&&<>
      {tab==="notes"?<div className="tm-ios-notes">
        <div className="tm-ios-section-header">YOUR POSTS</div>
        {notes.length?notes.map(post=><article className="tm-ios-draft" key={post.id}><small>{post.date} · Private draft</small><h3>{post.title||"Untitled"}</h3><p>{post.text}</p></article>):<div className="tm-ios-info">No drafts yet. Tap Compose, then Text, to save one.</div>}
        <button className="tm-ios-draft-button" onClick={onNewText}><SquarePen size={16}/> Write a post</button>
      </div>:
      <LiveArchive
        key={"mobile-"+refreshKey}
        mobileMode
        date={date} tab={tab} initialBlog={blog} initialTag={tag}
        initialType={filterType} followed={followed} onTag={chooseTag} onBlog={chooseBlog}
      />}
    </>}
    {screen==="explore"&&<div className="tm-ios-tag-page tm-ios-explore-page">
      <form onSubmit={e=>{e.preventDefault();if(query.trim())chooseTag(query.trim().replace(/^#/,""))}}>
        <div className="tm-ios-search-input"><Search size={17}/><input ref={inputRef} type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find old Tumblr tags" aria-label="Search Tumblr tags" autoComplete="off"/></div>
      </form>
      {query.trim()?<>
        <div className="tm-ios-section-header">MATCHING TAGS</div>
        <div className="tm-ios-tag-list">{matching.map((name,i)=><button key={name} onClick={()=>chooseTag(name)}><span className={"tm-ios-tag-icon n"+i}>#</span><span className="tm-ios-tag-label"><strong>{name}</strong><small>Browse historical posts</small></span><span className="tm-ios-chevron">›</span></button>)}
        {!matching.length&&<button onClick={()=>chooseTag(query.trim().replace(/^#/,""))}><span className="tm-ios-tag-icon n0">#</span><span className="tm-ios-tag-label"><strong>Search #{query.trim()}</strong><small>Search Tumblr</small></span><span className="tm-ios-chevron">›</span></button>}</div>
      </>:<>
        <div className="tm-ios-section-header">BROWSE TAGS</div>
        <div className="tm-ios-featured-tags">{tags.slice(0,9).map(name=><button key={name} onClick={()=>chooseTag(name)}>#{name}</button>)}</div>
        <LiveArchive mobileMode date={date} tab="explore" initialTag="" initialBlog="" initialType="all" followed={followed} onTag={chooseTag} onBlog={chooseBlog}/>
      </>}
    </div>}
    {screen==="account"&&<div className="tm-ios-account">
      <div className="tm-ios-section-header">ACCOUNT</div>
      <div className="tm-ios-account-profile"><span className="tm-ios-account-avatar">t</span><span><strong>timecapsule</strong><small>Your personal time capsule</small></span></div>
      <div className="tm-ios-account-list">
        <button onClick={()=>change("dashboard")}><Home size={19}/> Dashboard <span>›</span></button>
        <button onClick={()=>change("likes")}><Heart size={19}/> Likes <span>›</span></button>
        <button onClick={()=>change("saved")}><Bookmark size={19}/> Saved posts <span>›</span></button>
        <button onClick={()=>change("notes")}><SquarePen size={19}/> Posts <span>›</span></button>
      </div>
      <div className="tm-ios-section-header">FOLLOWING ({followed.length})</div>
      <div className="tm-ios-account-list">{followed.length?followed.map(name=><button onClick={()=>chooseBlog(name)} key={name}><span className="tm-ios-mini-avatar">{name.slice(0,1).toUpperCase()}</span>{name}<span>›</span></button>):<div className="tm-ios-info">Your followed blogs will appear here.</div>}</div>
      <div className="tm-ios-account-list tm-ios-account-last"><button onClick={onTime}><Clock3 size={19}/> Time Machine <span>›</span></button></div>
    </div>}
    {isFullCompose&&<div className="tm-ios-compose">
      <div className="tm-ios-compose-grid">{TYPES.map(({id,name,icon:Icon})=><button key={id} className={"tm-ios-compose-type "+id} onClick={()=>compose(id)}>
        <span>{id==="text"?<b>Aa</b>:id==="quote"?<b>❝</b>:id==="chat"?<b>hi!</b>:<Icon size={45} strokeWidth={2.4}/>}</span><strong>{name}</strong>
      </button>)}</div>
      <p className="tm-ios-compose-note">Text saves a private draft. Other post types browse the archive.</p>
    </div>}
  </div>

  <nav className="tm-ios-tabbar" aria-label="Tumblr iPhone bottom navigation">
    <button className={isFeed&&tab==="dashboard"&&!tag&&!blog?"selected":""} onClick={()=>change("dashboard")} aria-label="Dashboard"><Home size={25} fill={isFeed&&tab==="dashboard"&&!tag&&!blog?"currentColor":"none"}/><small>Dashboard</small></button>
    <button className={screen==="explore"||(isFeed&&tab==="explore"&&!tag)?"selected":""} onClick={()=>change(null,"explore")} aria-label="Explore"><span className="tm-ios-tag-button">#</span><small>Explore</small></button>
    <button className={screen==="account"?"selected":""} onClick={()=>change(null,"account")} aria-label="Account"><UserRound size={24} fill={screen==="account"?"currentColor":"none"}/><small>Account</small></button>
    <button className={screen==="compose"?"selected compose-active":"compose-button"} onClick={()=>change(null,"compose")} aria-label="Compose"><SquarePen size={23}/><small>Post</small></button>
  </nav>
 </div>;
}
export default MobileTumblr;
