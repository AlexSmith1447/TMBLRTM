import React,{useEffect,useState,useRef} from "react";
import {ChevronLeft,ChevronRight,X,ExternalLink,Maximize2} from "lucide-react";
import "./photosets.css";
export default function PhotoViewer({images,postUrl,onClose,initialIndex=0}){
 const [index,setIndex]=useState(initialIndex);
 const closeRef=useRef(null);
 useEffect(()=>{
  const old=document.body.style.overflow;document.body.style.overflow="hidden";
  const key=e=>{if(e.key==="Escape")onClose();if(e.key==="ArrowRight")setIndex(i=>(i+1)%images.length);if(e.key==="ArrowLeft")setIndex(i=>(i+images.length-1)%images.length)};
  window.addEventListener("keydown",key);closeRef.current?.focus();
  return()=>{document.body.style.overflow=old;window.removeEventListener("keydown",key)};
 },[images.length,onClose]);
 if(!images.length)return null;
 return <div className="tm-lightbox-backdrop" role="dialog" aria-modal="true" aria-label="View photoset" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
  <div className="tm-lightbox-window">
    <div className="tm-lightbox-bar"><span><Maximize2 size={13}/> Photo {index+1} of {images.length}</span><div>{postUrl&&<a href={postUrl} target="_blank" rel="noopener noreferrer" title="Open original Tumblr post"><ExternalLink size={16}/></a>}<button ref={closeRef} onClick={onClose} title="Close"><X size={19}/></button></div></div>
    <div className="tm-lightbox-photo">
      {images.length>1&&<button className="tm-lightbox-prev" onClick={()=>setIndex(i=>(i+images.length-1)%images.length)} aria-label="Previous photo"><ChevronLeft size={27}/></button>}
      <img key={images[index]} src={images[index]} alt={"Photo "+(index+1)+" of "+images.length} />
      {images.length>1&&<button className="tm-lightbox-next" onClick={()=>setIndex(i=>(i+1)%images.length)} aria-label="Next photo"><ChevronRight size={27}/></button>}
    </div>
    {images.length>1&&<div className="tm-lightbox-thumbs">{images.map((u,i)=><button key={u+i} onClick={()=>setIndex(i)} className={i===index?"active":""} aria-label={"View image "+(i+1)}><img src={u} loading="lazy" alt=""/></button>)}</div>}
  </div>
 </div>;
}
