import React,{useRef,useState} from "react";
import {Check,Cloud,LockKeyhole,LogIn,LogOut,Upload,RefreshCw,Image as ImageIcon} from "lucide-react";
import "./account.css";

async function resizeImage(file){
 if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw Error("Choose a JPEG, PNG or WebP picture.");
 if(file.size>12*1024*1024)throw Error("Image must be under 12 MB.");
 let bitmap,dispose=()=>{};
 if(typeof createImageBitmap==="function"){
  bitmap=await createImageBitmap(file);
  dispose=()=>bitmap.close?.();
 }else{
  const url=URL.createObjectURL(file),img=new Image();
  try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error("Could not open picture"));img.src=url})}
  catch(e){URL.revokeObjectURL(url);throw e}
  bitmap=img;dispose=()=>URL.revokeObjectURL(url);
 }
 try{
  const width=bitmap.naturalWidth||bitmap.width,height=bitmap.naturalHeight||bitmap.height;
  const side=Math.min(width,height),size=160;
  const canvas=document.createElement("canvas");canvas.width=size;canvas.height=size;
  const ctx=canvas.getContext("2d");
  ctx.fillStyle="#fff";ctx.fillRect(0,0,size,size);
  const x=(width-side)/2,y=(height-side)/2;
  ctx.drawImage(bitmap,x,y,side,side,0,0,size,size);
  let uri=canvas.toDataURL("image/jpeg",0.82);
  if(uri.length>110000)uri=canvas.toDataURL("image/jpeg",0.64);
  if(uri.length>110000)throw Error("Image couldn't be compressed; try another picture.");
  return uri;
 }finally{dispose()}
}
export default function AccountPanel({account,compact=false}){
 const {status,profile,error,pending,login,logout,avatar,refresh,importLocal}=account;
 const [password,setPassword]=useState("");
 const [message,setMessage]=useState("");
 const [imageError,setImageError]=useState("");
 const [aiDiagnostic,setAiDiagnostic]=useState(null);
 const [checkingAI,setCheckingAI]=useState(false);
 const file=useRef(null);
 const photo=profile.avatar?
  <img src={profile.avatar} alt="" className="tm-account-photo"/>:
  <span className="tm-account-letter">W</span>;
 async function submit(e){
  e.preventDefault();setMessage("");
  if(await login(password)){setPassword("");setMessage("Signed in — your profile is now shared across devices.")}
 }
 async function testImageAI(){
  if(checkingAI)return;
  setCheckingAI(true);setAiDiagnostic(null);
  try{
   const response=await fetch("/api/visual?mode=diagnostics",{credentials:"same-origin",cache:"no-store"});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||"AI diagnostics unavailable");
   setAiDiagnostic(data);
  }catch(e){setAiDiagnostic({error:e.message||"Couldn't test the AI model"})}
  finally{setCheckingAI(false)}
 }
 async function selectAvatar(event){
  const picked=event.target.files?.[0];if(!picked)return;
  setImageError("");setMessage("");
  try{
   const uri=await resizeImage(picked);
   if(await avatar(uri))setMessage("Profile picture saved.");
  }catch(e){setImageError(e.message)}
  event.target.value="";
 }
 return <section className={"tm-account-panel"+(compact?" compact":"")} aria-label="Tumblr account settings">
   <div className="tm-account-heading"><span className="tm-account-image">{photo}</span><div>
     <strong>{profile.handle||"Wesley1337"}</strong>
     <small>{status.signedIn?"Your account · synced between devices":status.configured?"Sign in to your account":"Local browsing mode"}</small>
   </div></div>
   {status.loading?<p>Connecting…</p>:!status.configured?
    <div className="tm-account-help"><Cloud size={19}/>
      <p>Cloud account storage hasn't been connected. The site is usable, but changes won't sync yet.</p>
      <a href="https://github.com/AlexSmith1447/TMBLRTM/blob/main/docs/SYNCED_ACCOUNT.md" target="_blank" rel="noopener noreferrer">Account setup instructions</a>
      <button className="tm-account-button" onClick={refresh}>Check connection</button>
    </div>:
    !status.signedIn?
    <form onSubmit={submit} className="tm-account-login">
      <label htmlFor="tm-profile-password">Account password</label>
      <input id="tm-profile-password" type="password" autoComplete="current-password" minLength={1}
        value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your private password"/>
      <button type="submit" className="tm-account-primary" disabled={pending||!password}><LogIn size={15}/> Sign in</button>
      <p className="tm-account-note"><LockKeyhole size={12}/> One private account, not a real Tumblr login.</p>
    </form>:
    <div className="tm-account-settings">
      <div className="tm-account-setting"><div><strong>Profile picture</strong><small>Shown in the dashboard and Account tab</small></div>
        <button onClick={()=>file.current?.click()} disabled={pending} className="tm-account-button"><ImageIcon size={15}/> Change</button>
      </div>
      <input ref={file} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={selectAvatar}/>
      <div className="tm-account-setting"><div><strong>Saved to your account</strong><small>{profile.follows.length} following · {Object.keys(profile.likes).length} likes · {Object.keys(profile.saved).length} saved</small></div>
        <button onClick={refresh} className="tm-account-button" title="Check other device"><RefreshCw size={15}/> Sync</button>
      </div>
      <div className="tm-account-setting"><div><strong>Import previous local activity</strong><small>Bring over likes, bookmarks and follows from this device; existing cloud items are preserved</small></div>
       <button onClick={async()=>{setMessage("");if(await importLocal())setMessage("Previous device activity imported.")}} disabled={pending} className="tm-account-button"><Upload size={14}/> Import</button>
      </div>
      <div className="tm-account-setting"><div><strong>Image recommendations</strong><small>Verify real image processing and check the temporary image index.</small></div>
        <button type="button" onClick={testImageAI} disabled={checkingAI} className="tm-account-button"><RefreshCw size={15}/> {checkingAI?"Checking…":"Test AI"}</button>
      </div>
      {aiDiagnostic&&<div className="tm-account-ai-result" role="status">
        {aiDiagnostic.error?<strong>{aiDiagnostic.error}</strong>:<>
         <div><strong>Model inference</strong><span>{aiDiagnostic.textEmbedding?.ok?"Working":"Not working"}</span></div>
         <div><strong>Live image embedding</strong><span>{aiDiagnostic.imageEmbedding?.ok?"Working":aiDiagnostic.imageEmbeddings?"Not verified":"Not yet available"}</span></div>
         <div><strong>Indexed images</strong><span>{aiDiagnostic.imageEmbeddings||0} real images / {aiDiagnostic.indexed||0} total</span></div>
         {!aiDiagnostic.textEmbedding?.ok&&<p>{aiDiagnostic.textEmbedding?.reason||"Worker model inference failed."}</p>}
         {!aiDiagnostic.imageEmbedding?.ok&&<p>{aiDiagnostic.imageEmbedding?.reason||"No valid photo available."}</p>}
         <small>Checks use Workers AI and may count toward your daily free allocation. Results verify inference, not recommendation quality.</small>
        </>}
      </div>}
      <button className="tm-account-signout" onClick={logout} disabled={pending}><LogOut size={15}/> Sign out</button>
    </div>}
   {message&&<p className="tm-account-success"><Check size={14}/>{message}</p>}
   {(imageError||error)&&<p className="tm-account-error">{imageError||error}</p>}
 </section>
}