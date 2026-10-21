import React, { useMemo, useState } from "react";
import { Archive, ArrowLeft, ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Compass, ExternalLink, Filter, Ghost, Headphones, Info, Layers3, Search, Sparkles, Users, X, ZoomIn, ZoomOut, Gamepad2, Globe2, Music2, ListFilter } from "lucide-react";
import { MILESTONES, CULTURE_ERAS, CATEGORIES } from "./cultureData.js";
import "./timeline.css";

const START = 2009, END = 2015, LAST = (END - START + 1) * 12 - 1;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const iconFor = { Horror:Ghost, Memes:Sparkles, Fandom:Users, Music:Headphones, Games:Gamepad2, Web:Globe2 };
const labelDate = (event) => {
  const parts = event.date.split("-").map(Number);
  const t = new Date(Date.UTC(parts[0],parts[1]-1,parts[2]));
  return t.toLocaleDateString("en-US", {month:"long",day:event.precision==="month"?undefined:"numeric",year:"numeric",timeZone:"UTC"});
};
const endOfMonth = (year,monthIndex) => new Date(Date.UTC(year,monthIndex+1,0)).toISOString().slice(0,10);
const monthNumber = date => Math.max(0,Math.min(LAST,(Number(date.slice(0,4))-START)*12+Number(date.slice(5,7))-1));
const fmtMonth = date => new Date(date+"T12:00:00Z").toLocaleDateString("en-US",{month:"long",year:"numeric",timeZone:"UTC"});
function savedBoolean(key) {try{return localStorage.getItem(key)==="true"}catch{return false}}
function grouped(events,mode,year){
  const map=new Map();
  for(const event of events){
    const key=mode==="overview"?event.date.slice(0,4):mode==="year"?event.date.slice(5,7):event.date;
    if(mode==="year"&&!event.date.startsWith(String(year)))continue;
    if(mode==="month"&&!event.date.startsWith(String(year)))continue;
    if(!map.has(key))map.set(key,[]);
    map.get(key).push(event);
  }
  return map;
}
export default function CultureTimeline({date,onDateChange,onExplore}){
  const [zoom,setZoom] = useState("overview");
  const [category,setCategory] = useState("All");
  const [query,setQuery] = useState("");
  const [historian,setHistorian] = useState(()=>savedBoolean("tm-culture-historian"));
  const [selectedId,setSelectedId] = useState("invadercon2");
  const [openCluster,setOpenCluster] = useState(null);
  const activeYear = Math.max(START, Math.min(END, Number(date.slice(0,4))));
  const activeMonth = Math.max(1, Math.min(12, Number(date.slice(5,7))));
  const timeIndex = monthNumber(date);
  const visible = useMemo(()=>MILESTONES.filter(e=>
    (historian||e.date<=date) &&
    (category==="All"||e.category===category) &&
    (!query||[e.title,e.category,e.kind,e.summary,...e.tags].join(" ").toLowerCase().includes(query.toLowerCase()))
  ),[historian,date,category,query]);
  const overview = useMemo(()=>grouped(visible,"overview"),[visible]);
  const yearly = useMemo(()=>grouped(visible,"year",activeYear),[visible,activeYear]);
  const monthlyEvents = visible.filter(e=>e.date.slice(0,7)===date.slice(0,7));
  const featured=visible.find(e=>e.id===selectedId)||visible[visible.length-1]||null;
  const neighbors=featured?featured.related.map(id=>MILESTONES.find(m=>m.id===id)).filter(e=>e&&(historian||e.date<=date)):[]; 
  const eraList=CULTURE_ERAS.filter(e=>(category==="All"||e.category===category)&&(historian||e.start<=date.slice(0,7)));
  const setHist=value=>{setHistorian(value);try{localStorage.setItem("tm-culture-historian",String(value))}catch{}};
  const changeDate=next=>{onDateChange(next);setOpenCluster(null)};
  const chooseYear=year=>{changeDate(endOfMonth(year,11));setZoom("year")};
  const chooseMonth=monthIndex=>{changeDate(endOfMonth(activeYear,monthIndex));setZoom("month")};
  const jump=event=>{changeDate(event.precision==="month"?endOfMonth(Number(event.date.slice(0,4)),Number(event.date.slice(5,7))-1):event.date);setSelectedId(event.id)};
  const stepMonth=amount=>{const i=Math.max(0,Math.min(LAST,timeIndex+amount));changeDate(endOfMonth(START+Math.floor(i/12),i%12))};
  const showEvent=event=>{setSelectedId(event.id);setOpenCluster(null)};
  const followRelated=event=>{setCategory("All");setQuery("");setSelectedId(event.id);setZoom("year");if(event.date>date)changeDate(event.precision==="month"?endOfMonth(+event.date.slice(0,4),+event.date.slice(5,7)-1):event.date)};
  const selectedCluster=openCluster?overview.get(openCluster)||[]:[];
  const daysOfMonth=new Date(Date.UTC(activeYear,activeMonth,0)).getUTCDate();
  return <section className="culture-v2" aria-label="Internet culture timeline">
    <header className="ct-head">
      <div>
        <div className="ct-kicker"><Clock3 size={13}/> CULTURE CLOCK <span>· A LIVING INTERNET ARCHIVE</span></div>
        <h2>The internet, year by year <span aria-hidden="true">✳</span></h2>
        <p>Explore memes, cartoons, creepypasta, fandoms and scene culture.</p>
      </div>
      <button type="button" className={"ct-historian"+(historian?" active":"")} onClick={()=>setHist(!historian)} title="Reveal milestone entries beyond your current historical date">
        <Compass size={14}/>{historian?"Historian: on":"No future spoilers"}
      </button>
    </header>
    <div className="ct-controls">
      <div className="ct-zoom" role="group" aria-label="Timeline zoom level">
        {[["overview","Overview"],["year","Year"],["month","Month"]].map(([key,label])=><button type="button" key={key} className={zoom===key?"chosen":""} onClick={()=>{setZoom(key);setOpenCluster(null)}}>{label}</button>)}
      </div>
      <div className="ct-counter">{visible.length} / {MILESTONES.length} milestones</div>
    </div>
    <div className="ct-filterbar">
      <div className="ct-categories" aria-label="Filter milestones">
        {CATEGORIES.map(c=><button type="button" className={category===c?"chosen":""} key={c} onClick={()=>{setCategory(c);setOpenCluster(null)}}>{c}</button>)}
      </div>
      <label className="ct-search"><Search size={14}/><input type="search" value={query} onChange={e=>{setQuery(e.target.value);setOpenCluster(null)}} placeholder="Search milestones..." aria-label="Search historical milestones"/></label>
    </div>
    <div className="ct-datebar">
      <button type="button" title="Previous month" aria-label="Previous month" onClick={()=>stepMonth(-1)} disabled={timeIndex===0}><ChevronLeft size={19}/></button>
      <div><small>YOUR TIME MACHINE IS IN</small><strong>{fmtMonth(date)}</strong></div>
      <button type="button" title="Next month" aria-label="Next month" onClick={()=>stepMonth(1)} disabled={timeIndex===LAST}><ChevronRight size={19}/></button>
    </div>
    <div className="ct-scrubber">
      <input aria-label="Travel through months from 2009 to 2015" type="range" min="0" max={LAST} step="1" value={timeIndex} onChange={e=>{let n=+e.target.value;changeDate(endOfMonth(START+Math.floor(n/12),n%12))}}/>
      <div className="ct-year-axis">{Array.from({length:END-START+1},(_,i)=>START+i).map(y=><button key={y} type="button" className={activeYear===y?"active":""} onClick={()=>changeDate(endOfMonth(y,11))}>{y}</button>)}</div>
    </div>
    {zoom==="overview"&&<div className="ct-overview" aria-label="Clustered events by year">
      {Array.from({length:END-START+1},(_,i)=>START+i).map(y=>{
        const list=overview.get(String(y))||[];
        const beyond=!historian&&y>+date.slice(0,4);
        const isOpen=openCluster===String(y);
        return <button type="button" key={y} className={"ct-year-tile"+(activeYear===y?" selected":"")+(isOpen?" opened":"")+(beyond?" future":"")} onClick={()=>{if(beyond){chooseYear(y)}else setOpenCluster(isOpen?null:String(y))}}>
          <span className="ct-year-number">{y}</span>
          <span className="ct-density" aria-hidden="true">{[...Array(5)].map((_,i)=><i key={i} className={i<Math.ceil(list.length/3)?"lit":""}/>)}</span>
          <span className="ct-count">{beyond?"Explore year":list.length===1?"1 milestone":list.length+" milestones"}</span>
          <span className="ct-mini">{beyond?"Future hidden":list.length?list[Math.floor(list.length/2)].title:"No markers yet"}</span>
          <span className="ct-tile-more">{beyond?"Travel →":isOpen?"Close −":"Open +"}</span>
        </button>;
      })}
    </div>}
    {zoom==="overview"&&openCluster&&<div className="ct-cluster-panel">
      <div className="ct-panel-top"><strong>{openCluster} · {selectedCluster.length} milestones</strong><div><button type="button" onClick={()=>chooseYear(+openCluster)}>Zoom into year <ZoomIn size={13}/></button><button type="button" aria-label="Close year cluster" onClick={()=>setOpenCluster(null)}><X size={16}/></button></div></div>
      <div className="ct-cluster-list">{selectedCluster.map(e=><button key={e.id} type="button" onClick={()=>showEvent(e)} className={featured?.id===e.id?"selected":""}><span>{labelDate(e)}</span><strong>{e.title}</strong><i className={"ct-pin "+e.category.toLowerCase()}/></button>)}</div>
    </div>}
    {zoom==="year"&&<div className="ct-year-zoom">
      <div className="ct-panel-top"><strong>Inside {activeYear}</strong><span>Choose a month to explore its events</span></div>
      <div className="ct-month-grid">{MONTHS.map((m,i)=>{
        const list=yearly.get(String(i+1).padStart(2,"0"))||[];
        const future=!historian&&(activeYear>+date.slice(0,4)||(activeYear===+date.slice(0,4)&&i+1>+date.slice(5,7)));
        return <button key={m} type="button" onClick={()=>chooseMonth(i)} className={(activeMonth===i+1?"selected ":"")+(future?"future":"")}>
          <span>{m}</span>
          <b>{future?"—":list.length}</b>
          <small>{future?"Not yet":list.length===1?"event":"events"}</small>
        </button>;
      })}</div>
      <div className="ct-year-zoom-footer"><button type="button" onClick={()=>{setZoom("overview");setOpenCluster(null)}}><ArrowLeft size={14}/> All years</button><button type="button" onClick={()=>setZoom("month")}>Open {MONTHS[activeMonth-1]} <ArrowRight size={14}/></button></div>
    </div>}
    {zoom==="month"&&<div className="ct-month-zoom">
      <div className="ct-panel-top"><strong>{MONTHS[activeMonth-1]} {activeYear}</strong><button type="button" onClick={()=>setZoom("year")}><ArrowLeft size={14}/> Year overview</button></div>
      <div className="ct-day-line">
        <span>1</span><div className="ct-day-track">
          {monthlyEvents.map(e=><button type="button" key={e.id} onClick={()=>showEvent(e)} title={e.title} aria-label={"Select "+e.title} style={{left:((Number(e.date.slice(8,10))-1)/(daysOfMonth-1)*100)+"%"}} className={e.category.toLowerCase()}/>)}
        </div><span>{daysOfMonth}</span>
      </div>
      {monthlyEvents.length?<div className="ct-month-events">{monthlyEvents.map(e=><button type="button" key={e.id} onClick={()=>showEvent(e)} className={featured?.id===e.id?"selected":""}><span>{labelDate(e)} · {e.category}</span><strong>{e.title}</strong><ArrowRight size={14}/></button>)}</div>:<div className="ct-empty">No documented milestones in this category and month. Change the filters or try another month.</div>}
    </div>}
    {query&&visible.length===0&&<div className="ct-empty">No milestones match “{query}” in the currently visible history. Try another filter or enable Historian mode.</div>}
    <div className="ct-era-head"><Layers3 size={14}/> CULTURAL ERAS <small>Broad illustrative periods, not popularity statistics</small></div>
    <div className="ct-eras">{eraList.map(era=>{
      const start=Math.max(0,monthNumber(era.start+"-01")),end=Math.max(start,Math.min(historian?LAST:timeIndex,monthNumber(era.end+"-01")));
      return <div key={era.id} className="ct-era" title={era.description}><div className="ct-era-track"><span className={era.category.toLowerCase()} style={{left:(start/LAST*100)+"%",width:(Math.max(1,end-start)/LAST*100)+"%"}}/></div><span>{era.title}</span></div>
    })}</div>
    <div className="ct-feature-heading"><Sparkles size={14}/> SELECTED MOMENT <small>{featured?"Source-linked milestone":"Nothing visible at this date"}</small></div>
    {featured?<div className="ct-feature">
      <div className={"ct-feature-emblem "+featured.category.toLowerCase()}>{React.createElement(iconFor[featured.category]||Sparkles,{size:28})}</div>
      <div className="ct-feature-copy">
        <div className="ct-feature-meta">{labelDate(featured)} · {featured.category} · {featured.kind}</div>
        <h3>{featured.title}</h3>
        <p>{featured.summary}</p>
        <div className="ct-feature-tags">{featured.tags.map(t=><span key={t}>#{t.replace(/\s/g,"")}</span>)}</div>
        <div className="ct-feature-actions">
          <button type="button" className="primary" onClick={()=>jump(featured)}><CalendarDays size={14}/> Jump to date</button>
          <button type="button" onClick={()=>{jump(featured);onExplore({...featured,tags:featured.tags})}}><Search size={14}/> Browse archive</button>
          <a href={featured.source} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Historical source</a>
        </div>
        <div className="ct-source-note">The archive is still a demo; browsing a historical tag may show no posts until real Tumblr imports are added.</div>
      </div>
    </div>:<div className="ct-empty">No milestones available. Try an earlier year, a different category, or Historian mode.</div>}
    {!!neighbors.length&&<div className="ct-related"><div className="ct-related-title"><Compass size={14}/> CULTURE CONSTELLATION <span>Curated connections</span></div><div className="ct-related-grid">{neighbors.slice(0,4).map(e=><button type="button" key={e.id} onClick={()=>followRelated(e)}><i className={"ct-pin "+e.category.toLowerCase()}/><span>{e.title}<small>{e.category} · {e.date.slice(0,4)}</small></span><ArrowRight size={13}/></button>)}</div></div>}
    <div className="ct-foot"><Info size={13}/> {MILESTONES.length} researched culture markers. Exact releases and approximate waves are labeled separately. No measured Tumblr popularity claims.</div>
  </section>;
}
