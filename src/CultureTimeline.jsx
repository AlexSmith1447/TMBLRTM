import React, { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Compass, ExternalLink, Ghost, Headphones, Heart, Info, Layers3, MoveRight, Search, Sparkles, Users, WandSparkles } from "lucide-react";
import "./timeline.css";

// Historical culture milestones, not a measurement of Tumblr tag popularity.
// type distinguishes dated origin/release events from broader viral moments.
// All outbound historical source links are attached to their own records.
export const CULTURE_EVENTS = [
  { id:"homestuck", date:"2009-04-13", label:"Homestuck begins", category:"Fandom", type:"Origin", icon:"HS", description:"Andrew Hussie's webcomic begins its long-running adventure. Tumblr's Homestuck fandom would grow substantially over the following years.", tags:["homestuck"], source:"https://www.homestuck.com/", sourceLabel:"Homestuck official site" },
  { id:"slenderman", date:"2009-06-10", label:"Slender Man is created", category:"Horror", type:"Origin", icon:"SM", description:"Victor Surge introduces Slender Man on the Something Awful forums. This is the character's creation date, not the date of a verified Tumblr popularity peak.", tags:["slenderman","creepypasta"], source:"https://knowyourmeme.com/memes/slender-man", sourceLabel:"Know Your Meme" },
  { id:"marblehornets", date:"2009-06-20", label:"Marble Hornets begins", category:"Horror", type:"Origin", icon:"MH", description:"The first Marble Hornets uploads help transform the Slender Man myth into found-footage internet horror.", tags:["marblehornets","slenderman"], source:"https://marblehornets.wikidot.com/comprehensive-timeline", sourceLabel:"Marble Hornets chronology" },
  { id:"mlp", date:"2010-10-10", label:"Friendship Is Magic debuts", category:"Fandom", type:"Premiere", icon:"MLP", description:"My Little Pony: Friendship Is Magic premieres. Its online fan communities later become a recognizable part of early-2010s fandom culture.", tags:["mlp","my little pony"], source:"https://en.wikipedia.org/wiki/My_Little_Pony:_Friendship_Is_Magic", sourceLabel:"Series history" },
  { id:"nyancat", date:"2011-04-02", label:"Pop Tart Cat / Nyan Cat", category:"Memes", type:"Origin & spread", icon:"NY", description:"Christopher Torres posts his Pop Tart Cat animation on April 2; it is paired with music in a video on April 5 and rapidly spreads across the web, including Tumblr.", tags:["nyan cat","nyancat"], source:"https://knowyourmeme.com/memes/nyan-cat", sourceLabel:"Know Your Meme" },
  { id:"slendergame", date:"2012-06-26", label:"Slender: The Eight Pages", category:"Horror", type:"Release", icon:"8P", description:"The free horror game brings Slender Man to a much wider gaming audience in 2012, reinforcing the surrounding creepypasta and fan-art wave.", tags:["slenderman","creepypasta"], source:"https://www.gamespot.com/games/slender/", sourceLabel:"GameSpot release record" },
  { id:"gangnam", date:"2012-07-15", label:"Gangnam Style arrives", category:"Memes", type:"Release", icon:"GS", description:"PSY releases Gangnam Style. Its music video becomes an international viral sensation later in 2012; this marker is its release, not a Tumblr-specific peak.", tags:["gangnam style"], source:"https://en.wikipedia.org/wiki/Gangnam_Style", sourceLabel:"Single history" },
  { id:"harlem", date:"2013-02-10", label:"Harlem Shake goes viral", category:"Memes", type:"Viral wave", icon:"HS", description:"Short Harlem Shake dance videos explode across YouTube and the wider internet in February 2013. The exact day shown is a reference point within that month, not a universal peak date.", tags:["harlem shake"], source:"https://www.guinnessworldrecords.com/world-records/107612-largest-harlem-shake", sourceLabel:"Guinness World Records" },
  { id:"doge", date:"2013-11-01", label:"Doge everywhere", category:"Memes", type:"Approximate wave", icon:"DG", description:"Shiba Inu reaction pictures and colorful Comic Sans captions become prominent in 2013, with Tumblr among the communities associated with the format. November is an approximate period marker.", tags:["doge","shiba inu"], source:"https://knowyourmeme.com/memes/doge", sourceLabel:"Know Your Meme" },
  { id:"fnaf", date:"2014-08-08", label:"Five Nights at Freddy's", category:"Horror", type:"Release", icon:"FNaF", description:"Scott Cawthon's horror game arrives in August 2014 and quickly generates a large online fan community. This is a game release, not a measured Tumblr surge.", tags:["fnaf","five nights at freddys"], source:"https://www.gamespot.com/games/five-nights-at-freddys/", sourceLabel:"GameSpot release record" }
];
export const CULTURE_ERAS = [
  { id:"scene", name:"Scene / MySpace crossover", start:"2009-01", end:"2012-12", category:"Music", description:"Broad approximate cultural overlap, not a measured popularity trend." },
  { id:"creepypasta", name:"Creepypasta wave", start:"2010-01", end:"2013-12", category:"Horror", description:"A broad descriptive period rather than a precise popularity peak." },
  { id:"fandom", name:"Fandom / ask-blog culture", start:"2011-01", end:"2014-12", category:"Fandom", description:"A broad descriptive period, not a measured platform statistic." }
];
const START=2009, END=2015, MAX=(END-START+1)*12-1;
const monthIndex=(date)=>Math.max(0,Math.min(MAX,((Number(date.slice(0,4))-START)*12 + Number(date.slice(5,7))-1)));
const dateFromIndex=(idx)=>{const yr=START+Math.floor(idx/12);const mo=idx%12;return new Date(Date.UTC(yr,mo+1,0)).toISOString().slice(0,10)};
const pretty=(date,options={month:"long",year:"numeric"})=>new Date(date+"T12:00:00Z").toLocaleDateString("en-US",{...options,timeZone:"UTC"});
const iconFor={Horror:Ghost,Memes:Sparkles,Fandom:Users,Music:Headphones};
const categoryOptions=["All","Horror","Memes","Fandom","Music"];
function restore(){try{return localStorage.getItem("tm-culture-historian")==="true"}catch{return false}}
export default function CultureTimeline({date,onDateChange,onExplore}){
  const [category,setCategory]=useState("All");
  const [historian,setHistorian]=useState(restore);
  const [selected,setSelected]=useState("slendergame");
  const currentIndex=monthIndex(date);
  const eventList=useMemo(()=>CULTURE_EVENTS.filter(e=>(category==="All"||e.category===category)&&(historian||e.date<=date)),[category,historian,date]);
  const focused=eventList.find(e=>e.id===selected) || eventList[eventList.length-1] || null;
  const setHistoric=(value)=>{setHistorian(value);try{localStorage.setItem("tm-culture-historian",String(value))}catch{}};
  const jump=(event)=>{onDateChange(event.date);setSelected(event.id)};
  const step=(amount)=>onDateChange(dateFromIndex(Math.max(0,Math.min(MAX,currentIndex+amount))));
  const progress=(currentIndex/MAX)*100;
  const visibleEras=CULTURE_ERAS.filter(e=>category==="All"||e.category===category).map(e=>({
    ...e,startIndex:monthIndex(e.start+"-01"),endIndex:monthIndex(e.end+"-01")
  }));
  const FocusIcon=focused?(iconFor[focused.category]||WandSparkles):Info;
  return <section className="culture-timeline" aria-label="Internet culture timeline">
    <div className="culture-top">
      <div><div className="culture-eyebrow"><Clock3 size={13}/> THE CULTURE CLOCK <span>· 2009–2015</span></div><h2>Travel through internet history<span className="culture-star">✳</span></h2><p>Memes, horror, music and fandoms from the early web.</p></div>
      <button className={"culture-mode"+(historian?" is-on":"")} onClick={()=>setHistoric(!historian)} title="Historian mode reveals later events even while browsing an earlier year"><Compass size={15}/>{historian?"Historian mode: on":"No future spoilers"}</button>
    </div>
    <div className="culture-filters" aria-label="Timeline event categories">{categoryOptions.map(option=><button key={option} className={category===option?"active":""} onClick={()=>{setCategory(option);setSelected(null)}}>{option}</button>)}</div>
    <div className="culture-traveler"><button aria-label="Previous month" onClick={()=>step(-1)} disabled={currentIndex===0}><ChevronLeft size={19}/></button><div><span>CURRENT DESTINATION</span><strong>{pretty(date,{month:"long",year:"numeric"})}</strong></div><button aria-label="Next month" onClick={()=>step(1)} disabled={currentIndex===MAX}><ChevronRight size={19}/></button></div>
    <div className="culture-axis">
      <div className="culture-rail">
        <div className="culture-track"><div className="culture-track-fill" style={{width:progress+"%"}}/></div>
        <div className="culture-markers">
          {eventList.map((e,i)=>{const left=monthIndex(e.date)/MAX*100; const Icon=iconFor[e.category]||Sparkles;return <button key={e.id} type="button" aria-label={e.label+" — "+e.date} title={e.label+" · "+e.date} className={"culture-marker "+e.category.toLowerCase()+(focused&&focused.id===e.id?" is-selected":"")} style={{left:left+"%",bottom:((i%2)*18+5)+"px"}} onClick={()=>setSelected(e.id)}><Icon size={12}/></button>})}
        </div>
        <input type="range" min={0} max={MAX} step={1} value={currentIndex} onChange={e=>onDateChange(dateFromIndex(Number(e.target.value)))} aria-label="Travel to historical month" className="culture-range" style={{"--travel-progress":progress+"%"}}/>
      </div>
      <div className="culture-years">{[2009,2010,2011,2012,2013,2014,2015].map(y=><button key={y} className={Number(date.slice(0,4))===y?"active":""} onClick={()=>onDateChange(y+"-12-31")}>{y}</button>)}</div>
    </div>
    <div className="culture-era-heading"><Layers3 size={13}/> CULTURAL ERAS <span>approximate, not Tumblr analytics</span></div>
    <div className="culture-eras">
      {visibleEras.map(e=><div className={"culture-era "+e.category.toLowerCase()} key={e.id} title={e.description}><div className="culture-era-track"><span style={{left:(e.startIndex/MAX*100)+"%",width:((e.endIndex-e.startIndex)/MAX*100)+"%"}}/></div><span>{e.name}</span></div>)}
      {visibleEras.length===0&&<small>No broad era bands for this filter.</small>}
    </div>
    {focused?<div className="culture-feature"><div className={"culture-feature-symbol "+focused.category.toLowerCase()}><FocusIcon size={27}/><small>{focused.icon}</small></div><div className="culture-feature-body"><div className="culture-feature-meta">{pretty(focused.date,{month:"short",day:"numeric",year:"numeric"})} <span>·</span> {focused.category} <span>·</span> {focused.type}</div><h3>{focused.label}</h3><p>{focused.description}</p><div className="culture-feature-actions"><button className="culture-primary" onClick={()=>jump(focused)}><CalendarDays size={14}/> Jump to this date</button><button onClick={()=>onExplore(focused)}><Search size={14}/> Explore #{focused.tags[0].replace(/\s/g,"")}</button><a target="_blank" rel="noreferrer" href={focused.source} title={"Read the historical source: "+focused.sourceLabel}><ExternalLink size={14}/> Source</a></div></div></div>:<div className="culture-none"><Info size={17}/> No {category.toLowerCase()} milestones before this date. Travel forward or enable Historian mode.</div>}
    <div className="culture-bottom"><span><Info size={12}/> Markers describe wider internet culture; none claim a measured Tumblr trend peak.</span><span>{eventList.length} visible markers</span></div>
  </section>
}