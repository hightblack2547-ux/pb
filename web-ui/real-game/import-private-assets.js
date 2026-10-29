/* Private, on-device .zip installer for personally authorized PB Cross exports.
   A regular archive has entries: assets/maps/index.json, assets/maps/<map>/visual.glb,
   assets/weapons/models/index.json, etc. ZIP is parsed on-device, never uploaded.
   Requires browser-native DecompressionStream('deflate-raw') (Safari >= 16.4).
   This is deliberately bounded for iPhone storage and is NOT a 5-GB game importer. */
(()=>{
"use strict";
const CACHE="pb-private-user-assets-v1";
const MAX_TOTAL=900*1024*1024, MAX_ENTRY=128*1024*1024, MAX_CDIR=32*1024*1024;
const $=id=>document.getElementById(id);
const MIME={json:"application/json",glb:"model/gltf-binary",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",webp:"image/webp",dds:"image/vnd.ms-dds",ktx2:"image/ktx2",ogg:"audio/ogg",mp3:"audio/mpeg",wav:"audio/wav",bin:"application/octet-stream",wasm:"application/wasm",txt:"text/plain",fnt:"text/plain"};
function installUI(){
  const box=document.createElement("section");box.className="panel";box.innerHTML=
    '<strong>นำเข้า Assets ส่วนตัวจาก iPhone (ZIP)</strong>'+
    '<p>เลือก ZIP ที่แปลงเป็นไฟล์ Web GLB/JSON แล้ว (จาก Cross หรือ Portable ที่แปลงสำเร็จ) โดยมี <code>assets/</code> อยู่ภายใน เก็บไว้ใน Safari เครื่องนี้เท่านั้น ไม่อัปโหลดไป GitHub/Netlify</p>'+
    '<input id="asset-file" aria-label="เลือก ZIP Assets" type="file" accept=".zip,application/zip" style="width:100%;padding:13px 2px">'+
    '<p id="import-info" role="status" aria-live="polite">รองรับ ZIP แบบไม่เข้ารหัส ที่ใช้ Store/Deflate เท่านั้น ขนาดนำเข้าสูงสุดราว 900 MB ต่อครั้ง ขึ้นกับพื้นที่ว่างของ iPhone</p>'+
    '<button type="button" id="clear-private" style="margin-top:5px">ล้าง Assets ที่นำเข้าจากเครื่องนี้</button>'+
    '<p class="warn">ไฟล์ Portable .RAR หรือ .i3Pack ยังนำเข้าเป็น Cross Assets โดยตรงไม่ได้ ต้องแปลงเป็นไฟล์ GLB/JSON/Texture ที่ Webport รองรับก่อน และ ZIP ที่นำเข้าเพียงบางส่วนอาจยังเล่นไม่ได้</p>';
  const zone=document.getElementById("private-import-zone");
  const sections=document.querySelectorAll("section.panel");
  if(zone)zone.replaceWith(box);
  else if(sections.length)sections[0].after(box);
  else document.querySelector("main")?.append(box);
  $("asset-file").addEventListener("change",event=>{
    const file=event.target.files?.[0];if(file)void installZip(file);
  });
  $("clear-private").addEventListener("click",async()=>{
    if(!confirm("ลบไฟล์ Assets ส่วนตัวทั้งหมดที่จัดเก็บไว้ใน Safari ของเว็บไซต์นี้?"))return;
    try{await caches.delete(CACHE);$("import-info").textContent="ล้างไฟล์แล้ว";location.reload()}
    catch(e){$("import-info").textContent="ล้างไม่สำเร็จ: "+e.message}
  });
}
function safeName(raw){
  const name=raw.replace(/\\/g,"/").replace(/^\/+/, "");
  if(name.includes("\0")||name.split("/").some(p=>p===".."||p==="."))return null;
  let at=name.indexOf("public/assets/");
  let rel=at>=0?name.slice(at+"public/assets/".length):
    (name.startsWith("assets/")?name.slice("assets/".length):null);
  if(!rel||rel.endsWith("/")||rel.length>400)return null;
  const ext=rel.split(".").pop().toLowerCase();
  if(!MIME[ext])return null;
  // No HTML, JavaScript or other executable uploads are ever served.
  if(!rel.split("/").every(p=>p&&p.length<=160))return null;
  return {url:"/assets/"+rel.split("/").map(encodeURIComponent).join("/"),mime:MIME[ext]};
}
function toView(ab){return new DataView(ab)}
async function listZip(file){
  const len=Math.min(65557,file.size);
  const start=file.size-len, tail=toView(await file.slice(start).arrayBuffer());
  let end=-1;
  for(let i=tail.byteLength-22;i>=0;i--)if(tail.getUint32(i,true)===0x06054b50){end=i;break}
  if(end<0)throw Error("ไม่พบ Central Directory ของ ZIP");
  const records=tail.getUint16(end+10,true),cdSize=tail.getUint32(end+12,true),cdOffset=tail.getUint32(end+16,true);
  if(records===65535||cdSize===0xffffffff||cdOffset===0xffffffff)throw Error("ZIP64 ยังไม่รองรับ ให้แบ่ง ZIP เป็นส่วนเล็กลง");
  if(cdSize>MAX_CDIR||cdOffset+cdSize>file.size)throw Error("ZIP directory มีขนาดผิดปกติ");
  const c=toView(await file.slice(cdOffset,cdOffset+cdSize).arrayBuffer());
  const dec=new TextDecoder("utf-8",{fatal:false});let p=0,total=0;
  const items=[];
  while(p+46<=c.byteLength&&c.getUint32(p,true)===0x02014b50){
    const flags=c.getUint16(p+8,true),method=c.getUint16(p+10,true);
    const size=c.getUint32(p+24,true),packed=c.getUint32(p+20,true);
    const n=c.getUint16(p+28,true),extra=c.getUint16(p+30,true),comment=c.getUint16(p+32,true),off=c.getUint32(p+42,true);
    if(p+46+n+extra+comment>c.byteLength)throw Error("ZIP directory ไม่สมบูรณ์");
    const raw=dec.decode(new Uint8Array(c.buffer,c.byteOffset+p+46,n));
    const safe=safeName(raw);
    if(safe){
      if(flags&1)throw Error("ZIP ที่มีรหัสผ่านยังไม่รองรับ");
      if(method!==0&&method!==8)throw Error("ZIP นี้ใช้การบีบอัดที่ Safari ไม่รองรับ");
      if(size>MAX_ENTRY||size===0xffffffff||off===0xffffffff)throw Error("พบไฟล์ใหญ่มาก/ZIP64: "+raw);
      if(size>1024*1024&&packed>0&&size/packed>300)throw Error("ไฟล์มีอัตราการขยายผิดปกติ: "+raw);
      total+=size;if(total>MAX_TOTAL)throw Error("ขนาดรวมเกิน 900 MB: โปรดเลือกเฉพาะ Assets ที่จำเป็น");
      items.push({...safe,size,packed,off,method});
      if(items.length>20000)throw Error("ZIP มีไฟล์มากเกินขีดจำกัด");
    }
    p+=46+n+extra+comment;
  }
  if(!items.length)throw Error("ไม่พบไฟล์ assets/ ภายใน ZIP");
  if(items.length>records)throw Error("ZIP directory ไม่สอดคล้องกัน");
  return {items,total};
}
async function readEntry(file,e){
  const b=toView(await file.slice(e.off,e.off+30).arrayBuffer());
  if(b.byteLength!==30||b.getUint32(0,true)!==0x04034b50)throw Error("Local header ZIP ไม่ถูกต้อง");
  const headerEnd=e.off+30+b.getUint16(26,true)+b.getUint16(28,true);
  if(headerEnd+e.packed>file.size)throw Error("ข้อมูล ZIP ไม่ครบ");
  const slice=file.slice(headerEnd,headerEnd+e.packed);
  const blob=e.method===0?slice:await new Response(slice.stream().pipeThrough(new DecompressionStream("deflate-raw"))).blob();
  if(blob.size!==e.size)throw Error("ขนาดไฟล์แตก ZIP ไม่ตรงกับดัชนี");
  return blob;
}
let busy=false;
async function installZip(file){
  if(busy)return;busy=true;
  $("asset-file").disabled=true;
  const info=$("import-info");
  try{
    if(!("serviceWorker" in navigator)||!("caches" in window)||!("DecompressionStream" in window))throw Error("Safari นี้ไม่รองรับการติดตั้ง Assets ในเบราว์เซอร์");
    const reg=await navigator.serviceWorker.register("/pb-private-sw.js",{scope:"/"});
    await navigator.serviceWorker.ready;
    const {items,total}=await listZip(file);
    const quota=await navigator.storage?.estimate?.().catch(()=>null);
    if(quota&&quota.quota&&quota.usage&&quota.quota-quota.usage<total)throw Error("พื้นที่จัดเก็บ Safari ไม่พอสำหรับ ZIP นี้");
    info.textContent="กำลังนำเข้า "+items.length+" ไฟล์ ("+Math.ceil(total/1048576)+" MB) อย่าปิด Safari";
    const cache=await caches.open(CACHE);
    let count=0;
    for(const e of items){
      const blob=await readEntry(file,e);
      const u=new URL(e.url,location.origin).href;
      await cache.put(new Request(u),new Response(blob,{headers:{"Content-Type":e.mime}}));
      count++;
      if(count===items.length||count%10===0){info.textContent="นำเข้า "+count+"/"+items.length+" ไฟล์ • "+e.url;await new Promise(r=>setTimeout(r,0))}
    }
    info.textContent="นำเข้า "+count+" ไฟล์ใน Safari แล้ว กำลังตรวจดัชนีแผนที่…";
    if(!navigator.serviceWorker.controller){
      await new Promise(resolve=>{const wait=setTimeout(resolve,1800);navigator.serviceWorker.addEventListener("controllerchange",()=>{clearTimeout(wait);resolve()},{once:true})});
    }
    // Refresh is required so HEAD probes and real Webport fetches use the SW.
    location.reload();
  }catch(e){info.textContent="นำเข้าไม่สำเร็จ: "+(e?.message||String(e));console.error("[private asset import]",e)}
  finally{busy=false;$("asset-file").disabled=false}
}
async function boot(){
  installUI();
  try{
    if("serviceWorker" in navigator)await navigator.serviceWorker.register("/pb-private-sw.js",{scope:"/"});
    const has=await caches.open(CACHE).then(c=>c.keys());
    $("import-info").textContent=has.length?("มี Assets ส่วนตัวใน Safari แล้ว "+has.length+" ไฟล์ สามารถเลือก ZIP เพิ่มได้"):"ยังไม่มี Assets ส่วนตัวใน Safari เครื่องนี้";
  }catch(e){$("import-info").textContent="Service Worker ไม่พร้อม: "+e.message}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else void boot();
})();