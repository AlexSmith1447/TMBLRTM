import {chromium} from "playwright-core";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const base=process.env.BASE_URL||"http://127.0.0.1:4173";
const browser=await chromium.launch({headless:true,executablePath:"/usr/bin/google-chrome",args:["--no-sandbox","--disable-dev-shm-usage"]});
let errors=[];
const photoSvg="data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="760" height="520"><rect width="760" height="520" fill="#d6cfb4"/><rect x="55" y="60" width="650" height="380" fill="#778c95"/><circle cx="380" cy="230" r="90" fill="#d6d6cf"/><rect x="90" y="380" width="560" height="32" fill="#b4b7ad"/></svg>');
const fixturePosts=[
 {id:"iphone-test-1",blog:"staff",date:"2012-06-21",timestamp:1340236800,type:"photo",title:"Summer, 2012",text:"An old summer photograph.",images:[photoSvg],notes:347,tags:["creepypasta","photography"],url:"https://www.tumblr.com/"},
 {id:"iphone-test-2",blog:"staff",date:"2012-06-20",timestamp:1340150400,type:"text",text:"A note from an old Tumblr dashboard.",images:[],notes:12,tags:["emo","2012"],url:"https://www.tumblr.com/"}
];
try{
 const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,userAgent:"Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"});
 phone.on("pageerror",err=>errors.push("PHONE: "+err.message));
 await phone.route("**/api/tumblr?**",route=>{
   const q=new URL(route.request().url()).searchParams;
   if(q.get("mode")==="status")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({configured:true})});
   if(q.get("mode")==="info")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({blog:{title:"staff",description:"A preserved Tumblr blog"}})});
   return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({posts:fixturePosts,nextBefore:null,nextOffset:2,hasMore:false})});
 });
 const r=await phone.goto(base,{waitUntil:"domcontentloaded",timeout:25000});assert.equal(r.status(),200);
 await phone.locator(".tm-iphone").waitFor({state:"visible",timeout:15000});
 await phone.locator(".tt-post").first().waitFor({state:"visible",timeout:15000});
 const dimensions=await phone.evaluate(()=>({width:innerWidth,body:document.documentElement.scrollWidth,shell:getComputedStyle(document.querySelector(".tm-iphone")).position,tabbar:Math.round(document.querySelector(".tm-ios-tabbar").getBoundingClientRect().height)}));
 assert.ok(dimensions.body<=dimensions.width+3,"phone horizontal overflow");
 assert.equal(dimensions.shell,"fixed");
 console.log("IPHONE_SHELL_OK",JSON.stringify(dimensions));
 await phone.screenshot({path:"/tmp/tumblr-iphone-dashboard.jpg",type:"jpeg",quality:76});
 await phone.locator(".tm-photo-cell").first().click();
 await phone.getByRole("dialog",{name:"View photoset"}).waitFor({state:"visible"});
 await phone.getByRole("button",{name:"Close"}).first().click();
 console.log("PHOTO_VIEWER_OK");
 await phone.getByRole("button",{name:"Like",exact:true}).first().click();
 await phone.getByRole("button",{name:"Account",exact:true}).click();
 await phone.getByRole("button",{name:"Likes",exact:true}).click();
 await phone.locator(".tt-post").first().waitFor({state:"visible"});
 console.log("LOCAL_LIKES_OK");
 await phone.getByRole("button",{name:"Search tags",exact:true}).click();
 await phone.locator(".tm-ios-tag-list button").filter({hasText:"creepypasta"}).click();
 await phone.locator(".tt-post").first().waitFor({state:"visible"});
 assert.ok((await phone.locator(".tm-ios-nav-title").textContent()).includes("creepypasta"));
 console.log("TAG_NAV_OK");
 await phone.getByRole("button",{name:"Compose",exact:true}).click();
 await phone.locator(".tm-ios-compose-grid").waitFor({state:"visible"});
 await phone.screenshot({path:"/tmp/tumblr-iphone-compose.jpg",type:"jpeg",quality:76});
 await phone.locator(".tm-ios-compose-type.photo").click();
 await phone.locator(".tt-post").first().waitFor({state:"visible"});
 console.log("COMPOSE_BROWSE_OK");
 await phone.getByRole("button",{name:"Open Time Machine"}).click();
 await phone.getByRole("dialog",{name:"Time Machine controls"}).waitFor({state:"visible"});
 await phone.getByRole("button",{name:"Close Time Machine"}).click();
 console.log("TIME_DRAWER_OK");
 const manifest=await phone.request.get(base+"/manifest.webmanifest");
 assert.equal(manifest.status(),200);
 const app=await manifest.json();
 assert.equal(app.display,"standalone");
 assert.ok(app.icons.length);
 const icon=await phone.request.get(base+"/icons/tumblr-touch-180.png");
 assert.equal(icon.status(),200);
 assert.ok((icon.headers()["content-type"]||"").includes("image/png"));
 console.log("PWA_ASSETS_OK");
 const desktop=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 desktop.on("pageerror",err=>errors.push("DESKTOP: "+err.message));
 await desktop.route("**/api/tumblr?**",route=>{
  const q=new URL(route.request().url()).searchParams;
  return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(q.get("mode")==="status"?{configured:true}:{posts:fixturePosts,nextBefore:null,nextOffset:2,hasMore:false})});
 });
 await desktop.goto(base,{waitUntil:"domcontentloaded"});
 await desktop.locator(".classic-topbar").waitFor({state:"visible",timeout:10000});
 assert.equal(await desktop.locator(".tm-iphone").count(),0);
 await desktop.locator(".tt-post").first().waitFor({state:"visible"});
 console.log("DESKTOP_UNCHANGED_OK");
 const mobileScroll=await phone.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewWidth:innerWidth}));
 assert.ok(mobileScroll.scrollWidth<=mobileScroll.viewWidth+3);
 if(errors.length)throw new Error(errors.join("\n"));
 console.log("ZERO_JS_ERRORS");
 for(const [name,path] of [["DASHBOARD","/tmp/tumblr-iphone-dashboard.jpg"],["COMPOSE","/tmp/tumblr-iphone-compose.jpg"]]){
  console.log("IMAGE_"+name+"_START");
  console.log(readFileSync(path).toString("base64"));
  console.log("IMAGE_"+name+"_END");
 }
}finally{await browser.close()}
