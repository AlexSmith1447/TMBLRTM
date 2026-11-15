import {useCallback,useEffect,useRef,useState} from "react";

// The real data lives in Cloudflare D1, not in localStorage.
// Guest activity stays local until the owner signs in and explicitly imports it.
const empty={handle:"Wesley1337",avatar:"",follows:[],likes:{},saved:{},drafts:[]};
const clean=s=>String(s||"").toLowerCase().trim().replace(/\.tumblr\.com$/,"");
async function call(payload){
 const response=await fetch("/api/account",{method:"POST",credentials:"same-origin",
  headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),cache:"no-store"});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error||"Profile could not be updated");
 return data;
}
async function readProfile(){
 const res=await fetch("/api/account",{credentials:"same-origin",cache:"no-store"});
 if(!res.ok)throw Error("Not signed in");
 const body=await res.json();return body.profile;
}
export function usePseudoAccount(){
 const [status,setStatus]=useState({loading:true,configured:false,signedIn:false});
 const [profile,setProfile]=useState(empty);
 const [error,setError]=useState("");
 const [pending,setPending]=useState(false);
 const current=useRef(empty);
 const update=p=>{current.current=p;setProfile(p)};
 const refresh=useCallback(async()=>{
  setError("");
  try{
   const response=await fetch("/api/account?mode=status",{cache:"no-store",credentials:"same-origin"});
   const info=await response.json();const configured=Boolean(info.configured),signedIn=Boolean(info.signedIn);
   setStatus({loading:false,configured,signedIn});
   if(signedIn)update({...empty,...await readProfile()});
   else update(empty);
  }catch{setStatus({loading:false,configured:false,signedIn:false});setError("Profile connection unavailable")}
 },[]);
 useEffect(()=>{refresh()},[refresh]);
 // When returning to the site on another device, catch up with remote changes.
 useEffect(()=>{
  const check=()=>{if(document.visibilityState==="visible"&&current.current&&status.signedIn)refresh()};
  document.addEventListener("visibilitychange",check);
  return()=>document.removeEventListener("visibilitychange",check)
 },[status.signedIn,refresh]);
 const login=async password=>{
  setPending(true);setError("");
  try{
   const data=await call({action:"login",password});
   update({...empty,...data.profile});setStatus({loading:false,configured:true,signedIn:true});return true;
  }catch(e){setError(e.message);return false}
  finally{setPending(false)}
 };
 const logout=async()=>{
  setPending(true);
  try{await call({action:"logout"});update(empty);setStatus({loading:false,configured:true,signedIn:false});return true}
  catch(e){setError(e.message);return false}finally{setPending(false)}
 };
 const item=async(kind,id,active,post)=>{
  if(!status.signedIn){setError("Sign in to save your changes across devices");return false}
  const old=current.current;
  const next={...old};
  if(kind==="follow"){
   const name=clean(id);
   if(!/^[a-z0-9_-]{1,64}$/.test(name))return false;
   next.follows=active?[name,...old.follows.filter(n=>n!==name)]:old.follows.filter(n=>n!==name);
   id=name;
  }else if(kind==="like"||kind==="save"){
   const key=kind==="like"?"likes":"saved";
   const values={...old[key]};
   if(active)values[id]=post;else delete values[id];
   next[key]=values;
  }else if(kind==="draft"){
   next.drafts=active?[post,...old.drafts.filter(d=>String(d.id)!==String(id))]:old.drafts.filter(d=>String(d.id)!==String(id));
  }
  update(next);
  try{await call({action:"item",kind,id:String(id),active,post});return true}
  catch(e){setError(e.message);update(old);return false}
 };
 const follow=name=>item("follow",clean(name),!current.current.follows.includes(clean(name)));
 const like=post=>item("like",String(post.id),!current.current.likes[post.id],post);
 const save=post=>item("save",String(post.id),!current.current.saved[post.id],post);
 const draft=post=>item("draft",String(post.id),true,post);
 const avatar=async uri=>{
  if(!status.signedIn)return false;
  setPending(true);
  try{const data=await call({action:"avatar",avatar:uri});update({...current.current,avatar:data.avatar});return true}
  catch(e){setError(e.message);return false}finally{setPending(false)}
 };
 const importLocal=async()=>{
  if(!status.signedIn)return false;
  const parse=(key,defaultValue)=>{try{return JSON.parse(localStorage.getItem(key))??defaultValue}catch{return defaultValue}};
  const local={follows:parse("tm-follows",[]),likes:parse("tm2-likes",{}),
   saved:parse("tm2-saved",{}),drafts:parse("tm-posts",[])};
  setPending(true);
  try{const data=await call({action:"import",profile:local});update({...empty,...data.profile});return true}
  catch(e){setError(e.message);return false}finally{setPending(false)}
 };
 return {status,profile,error,pending,login,logout,refresh,follow,like,save,draft,avatar,importLocal};
}
