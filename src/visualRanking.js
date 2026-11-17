/**
 * Multimodal (image + caption) similarity ranking, using EmbeddingGemma 2 vectors.
 * Cosine nearest-neighbour retrieval + Maximal Marginal Relevance (MMR) diversification.
 * This code does NOT invent Tumblr posts or historical likes/notes.
 */
export const VISUAL_DIMENSIONS=256;
export const VISUAL_MODEL="@cf/google/embeddinggemma-2";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function isVector(v){return Array.isArray(v)&&v.length===VISUAL_DIMENSIONS&&v.every(x=>Number.isFinite(x))}
export function normalizedVector(v){
 if(!isVector(v))return null;
 let sum=0;for(const x of v)sum+=x*x;
 const magnitude=Math.sqrt(sum);
 if(!magnitude||!Number.isFinite(magnitude))return null;
 return v.map(x=>x/magnitude);
}
export function similarity(a,b){
 if(!a||!b||a.length!==b.length)return 0;
 let dot=0;for(let i=0;i<a.length;i++)dot+=a[i]*b[i];
 return clamp(dot,-1,1);
}
export function averageVectors(arr){
 const vectors=arr.filter(v=>v&&v.length===VISUAL_DIMENSIONS);
 if(!vectors.length)return null;
 const v=Array(VISUAL_DIMENSIONS).fill(0);
 for(const x of vectors)for(let i=0;i<v.length;i++)v[i]+=x[i];
 return normalizedVector(v.map(x=>x/vectors.length));
}
export function safePost(raw){
 if(!raw||typeof raw!=="object")return null;
 const id=String(raw.id||"");
 if(!/^\d{5,25}$/.test(id))return null;
 const blog=String(raw.blog||"").toLowerCase();
 if(!/^[a-z0-9_-]{1,64}$/.test(blog))return null;
 const stamp=Number(raw.timestamp)||0;
 if(!Number.isSafeInteger(stamp)||stamp<1230768000||stamp>4102444800)return null;
 const images=(Array.isArray(raw.images)?raw.images:[]).filter(u=>typeof u==="string"&&/^https:\/\//i.test(u)).slice(0,3).map(u=>u.slice(0,1900));
 return {id,blog,timestamp:stamp,date:new Date(stamp*1000).toISOString().slice(0,10),
  title:String(raw.title||"").slice(0,180),text:String(raw.text||"").slice(0,1100),
  type:String(raw.type||"text").slice(0,22),images,
  imageCandidates:(Array.isArray(raw.imageCandidates)?raw.imageCandidates:[])
   .filter(u=>typeof u==="string"&&/^https:\/\//i.test(u)).slice(0,4).map(u=>u.slice(0,1900)),
  tags:(Array.isArray(raw.tags)?raw.tags:[]).filter(t=>typeof t==="string").slice(0,18).map(t=>t.slice(0,70)),
  notes:clamp(Number(raw.notes)||0,0,1e9),
  quote:String(raw.quote||"").slice(0,800),quoteSource:String(raw.quoteSource||"").slice(0,200),
  url:typeof raw.url==="string"&&/^https:\/\//.test(raw.url)?raw.url.slice(0,1900):null,
  reblogFrom:String(raw.reblogFrom||"").slice(0,70)};
}
export function scoreCandidates(rows,{anchorVectors=[],seedVector=null,excludeIds=[],before=Infinity,limit=32,rotation=0}={}){
 const anchors=anchorVectors.filter(Boolean);
 const exclude=new Set(excludeIds.map(String));
 const dedup=new Set(),pool=[];
 for(const row of rows){
  const post=row.post||row,vec=normalizedVector(row.vector||row.vec);
  if(!post||!vec||!post.id||dedup.has(String(post.id))||exclude.has(String(post.id)))continue;
  if(post.timestamp>=before)continue;
  dedup.add(String(post.id));
  const affinity=anchors.length?Math.max(...anchors.map(a=>similarity(a,vec))):0;
  const focal=seedVector?similarity(seedVector,vec):0;
  // Preferences dominate. Popularity is only a gentle tie-breaker.
  const popularity=Math.log1p(Math.max(0,Number(post.notes)||0))/15;
  const variance=(hash(String(post.id)+":"+rotation)%1000)/1000;
  const relevance=anchors.length||seedVector?
    clamp((seedVector?.75*focal:0)+(anchors.length?.88*affinity:0),-1,1.6):
    .15+popularity*.15;
  pool.push({...row,post,vector:vec,base:relevance+popularity*.035+variance*.028});
 }
 pool.sort((a,b)=>b.base-a.base);
 const chosen=[],usedBlogs=new Map(),seenImages=new Set();
 const max=Math.max(1,Math.min(60,Number(limit)||32));
 while(pool.length&&chosen.length<max){
  let winner=-1,best=-Infinity;
  const candidates=pool.slice(0,260);
  for(let i=0;i<candidates.length;i++){
   const c=candidates[i],blog=c.post.blog||"";
   const used=usedBlogs.get(blog)||0;
   if(used>= (chosen.length<20?2:4))continue;
   const img=c.post.images?.[0]||"";
   if(img&&seenImages.has(img))continue;
   const mostSimilar=chosen.length?Math.max(...chosen.map(p=>similarity(c.vector,p.vector))):0;
   // 0.79 relevance, 0.21 novelty: standard MMR formulation.
   const mmr=c.base*.79-mostSimilar*.21;
   if(mmr>best){best=mmr;winner=i}
  }
  if(winner<0)break;
  const item=pool.splice(winner,1)[0];
  chosen.push(item);usedBlogs.set(item.post.blog,(usedBlogs.get(item.post.blog)||0)+1);
  if(item.post.images?.[0])seenImages.add(item.post.images[0]);
 }
 return chosen.map(item=>({...item.post,visualScore:item.base}));
}
function hash(s){let n=2166136261>>>0;for(const c of String(s)){n^=c.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0}
