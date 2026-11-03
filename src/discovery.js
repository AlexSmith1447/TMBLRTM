// Shared 2012-era discovery ranking, used by both desktop and the iPhone app.
// Popularity is measured by note counts AVAILABLE TODAY, not historical note counts.
// No AI-generated posts, invented engagement, or claims of official Tumblr trending data.
export const discoverySeeds=[
 "creepypasta","slenderman","homestuck","invader zim","scene",
 "emo","nintendocore","minecraft","gothic","pixel art",
 "nyan cat","myspace","adventure time","photography","vintage"
];
const related={
 "creepypasta":["slenderman","horror","marble hornets","scary stories"],
 "slenderman":["creepypasta","marble hornets","horror"],
 "invader zim":["gir","nickelodeon","cartoons"],
 "gir":["invader zim","cartoons"],
 "emo":["scene","post hardcore","music","myspace"],
 "scene":["emo","myspace","scene hair","post hardcore"],
 "gothic":["goth","dark art","horror"],
 "nintendocore":["chiptune","8bit","videogames"],
 "minecraft":["videogames","pixel art"],
 "homestuck":["fandom","webcomics"],
 "adventure time":["cartoons","fandom"],
 "photography":["vintage","film"],
 "pixel art":["8bit","videogames"]
};
const noise=new Set(["2012","2013","2014","2011","2010","2009","2015","gif","gifs","photo","photos","picture","pictures","post","reblog","tumblr","me","text","art","love","cute","lol","music","mine","original","edit","edits","queue","follow","like"]);
const normalize=x=>String(x||"").toLowerCase().replace(/^#/,"").replace(/[_-]+/g," ").replace(/\s+/g," ").trim();
export const hash=x=>{let n=2166136261;for(const c of String(x)){n^=c.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0};
export function tasteProfile(liked={},saved={},followed=[]){
 const weights=new Map(),blogWeights=new Map();
 const add=(tag,amount)=>{const key=normalize(tag);if(!key||noise.has(key)||key.length>45||/^\d+$/.test(key))return;weights.set(key,Math.min(40,(weights.get(key)||0)+amount))};
 for(const [collection,multiplier] of [[liked,5],[saved,7]]){
  for(const post of Object.values(collection||{})){
   if(!post||typeof post!=="object")continue;
   for(const tag of (Array.isArray(post.tags)?post.tags:[]).slice(0,20))add(tag,multiplier);
   const blog=normalize(post.blog);if(blog)blogWeights.set(blog,(blogWeights.get(blog)||0)+multiplier);
  }
 }
 for(const blog of followed||[])if(typeof blog==="string")blogWeights.set(normalize(blog),(blogWeights.get(normalize(blog))||0)+2);
 for(const [tag,weight] of [...weights])for(const neighbor of related[tag]||[])add(neighbor,weight*.18);
 return {weights,blogWeights,hasTaste:weights.size>0,likedIds:new Set(Object.keys(liked||{})),savedIds:new Set(Object.keys(saved||{}))};
}
export function suggestedTags(profile,rotation=0,count=4){
 const fromLikes=[...profile.weights].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(x=>x[0]);
 const sequence=[...fromLikes,...discoverySeeds.filter(x=>!fromLikes.includes(x))];
 const chosen=[],seen=new Set();
 // Keep at least two genuinely learned interests, while rotating the other categories.
 for(const tag of fromLikes.slice(0,2))if(!seen.has(tag)){chosen.push(tag);seen.add(tag)}
 const candidate=sequence.filter(tag=>!seen.has(tag));
 let index=(rotation*3)%Math.max(1,candidate.length);
 while(chosen.length<count&&seen.size<sequence.length){
  const tag=candidate[index%candidate.length];index++;
  if(!tag||seen.has(tag))continue;
  chosen.push(tag);seen.add(tag);
 }
 return chosen.slice(0,count);
}
export function eraAnchors(date,monthIndexes=[0,2,4,6,8,10]){
 // YYYY-MM-DD is a local-time-independent historical cutoff; don't skip the chosen day.
 const d=new Date(date+"T12:00:00Z");
 if(!Number.isFinite(d.getTime()))return [];
 return monthIndexes.map(months=>{
  const target=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-months,Math.min(d.getUTCDate(),28),23,59,59));
  if(months===0)target.setTime(Date.parse(date+"T23:59:59Z"));
  return Math.floor(target.getTime()/1000)+1;
 }).filter(t=>t>=Date.UTC(2009,0,1)/1000);
}
export function oldestEraTimestamp(date,months=12){
 const d=new Date(date+"T12:00:00Z");
 return Math.floor(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-months,1)/1000);
}
export function scorePost(post,profile,{sort="top",tag="",rotation=0}={}){
 const notes=Math.max(0,Number(post.notes)||0);
 const popularity=Math.log10(notes+1)*3.0;
 const tags=Array.isArray(post.tags)?post.tags.map(normalize):[];
 const target=normalize(tag);
 let affinity=0;
 for(const t of tags){const weight=profile.weights.get(t)||0;if(weight)affinity+=Math.min(14,weight)*.58}
 const blogMatch=profile.blogWeights.get(normalize(post.blog))||0;
 affinity+=Math.min(14,blogMatch)*.75;
 if(target&&tags.includes(target))affinity+=4;
 const format=(post.images||[]).length?1.4:(post.text||"").length>35?0.65:0;
 const emptyPenalty=!(post.images||[]).length&&!(post.text||"").trim()&&!(post.quote||"")?4:0;
 const savedPenalty=profile.savedIds.has(String(post.id))||profile.likedIds.has(String(post.id))?4:0;
 const variance=(hash(post.id+"@"+rotation)%1000)/1000;
 return popularity+affinity+format+variance*1.8-emptyPenalty-savedPenalty;
}
export function rankDiscovered(posts,profile,options={}){
 const seen=new Set(),unique=[];
 for(const p of posts){if(!p?.id||seen.has(String(p.id)))continue;seen.add(String(p.id));unique.push(p)}
 if(options.sort==="recent")return unique.sort((a,b)=>b.timestamp-a.timestamp);
 const sorted=unique.sort((a,b)=>scorePost(b,profile,options)-scorePost(a,profile,options));
 const result=[],remaining=[...sorted],counts=new Map();
 // A very popular blog shouldn't monopolize the first screen.
 while(remaining.length){
  let i=remaining.findIndex(p=>(counts.get(p.blog)||0)<(result.length<20?2:5));
  if(i<0)i=0;
  const post=remaining.splice(i,1)[0];result.push(post);
  counts.set(post.blog,(counts.get(post.blog)||0)+1);
 }
 return result;
}
