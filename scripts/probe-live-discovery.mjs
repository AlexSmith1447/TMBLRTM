// Public endpoint probe. Never reads or prints the Tumblr API key.
const base=process.env.BASE_URL||"https://tmblrtm.pages.dev";
const probes=[
 ["creepypasta","2012-12-31"],["creepypasta","2012-06-30"],
 ["emo","2012-12-31"],["slenderman","2013-12-31"],
 ["homestuck","2013-12-31"],["invader zim","2012-12-31"],
 ["scene","2014-12-31"]
];
for(const [tag,date] of probes){
 const before=Math.floor(Date.parse(date+"T23:59:59Z")/1000)+1;
 const url=base+"/api/tumblr?"+new URLSearchParams({mode:"tag",tag,before:String(before),limit:"20"});
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
  const json=await response.json();
  if(!response.ok){console.log(JSON.stringify({tag,date,http:response.status,error:json.code||json.error||"API unavailable"}));continue}
  const arr=json.posts||[],eligible=arr.filter(p=>p.timestamp&&p.timestamp<before);
  const dates=eligible.map(p=>p.date).filter(Boolean).sort();
  console.log(JSON.stringify({tag,date,http:response.status,returned:arr.length,eligible:eligible.length,earliest:dates[0]||null,latest:dates.at(-1)||null,notesPopulated:eligible.filter(p=>p.notes>0).length,hasMore:json.hasMore}));
 }catch(e){console.log(JSON.stringify({tag,date,error:e.message}))}
}
console.log("LIVE_TAG_COVERAGE_PROBE_COMPLETE");
