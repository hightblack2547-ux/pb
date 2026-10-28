import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const $=id=>document.getElementById(id);
const read=(k,otherwise)=>{try{const j=localStorage.getItem("pb-webport-v8-"+k);return j===null?otherwise:JSON.parse(j)}catch{return otherwise}};
const save=(k,v)=>{try{localStorage.setItem("pb-webport-v8-"+k,JSON.stringify(v));return true}catch{return false}};
const safeRel=p=>typeof p==="string"&&!p.startsWith("/")&&!p.includes("..")&&!p.includes(":")&&/^[\w.\-\/]+$/.test(p);
async function json(url){try{const r=await fetch(url,{cache:"no-cache"});if(!r.ok||(r.headers.get("content-type")||"").includes("text/html"))return null;return await r.json()}catch{return null}}
const state={models:[],guns:[],charas:[],maps:[],titles:[],strings:{},selectedGun:null,selectedChara:null,selectedMap:null,selectedTitle:null,active:"weapons",profile:read("profile",{nickname:"SOLDIER",rank:1,badges:{ribbon:0,ensign:0,medal:0,master:0},owned:[],equipped:[0,0,0]})};
const profile=state.profile;
if(!profile.badges||typeof profile.badges!=="object")profile.badges={ribbon:0,ensign:0,medal:0,master:0};
if(!Array.isArray(profile.owned))profile.owned=[];
if(!Array.isArray(profile.equipped))profile.equipped=[0,0,0];
const loader=new GLTFLoader();
let renderer=null,scene=null,camera=null,orbit=null,object=null,frame=0,host=null,job=0,observer=null;
function clearScene(){job++;if(frame)cancelAnimationFrame(frame);frame=0;if(orbit)orbit.dispose();orbit=null;if(object){scene?.remove(object);object=null}if(renderer){renderer.dispose();renderer.domElement.remove();renderer.forceContextLoss();renderer=null}scene=null;camera=null;host=null;if(observer){observer.disconnect();observer=null}}
function useTab(tab){if(state.active!==tab){clearScene();state.active=tab}for(const b of document.querySelectorAll("[data-tab]"))b.classList.toggle("active",b.dataset.tab===tab);for(const p of document.querySelectorAll(".page"))p.hidden=p.id!=="page-"+tab;
 const val=tab==="weapons"?state.selectedGun?.glb:tab==="characters"?state.selectedChara?.glb:null;
 const id=tab==="weapons"?"weapon-preview":tab==="characters"?"character-preview":null;
 if(val&&id)void showGLB(id,val);
}
for(const b of document.querySelectorAll("[data-tab]"))b.addEventListener("click",()=>useTab(b.dataset.tab));

async function showGLB(id,path){
 clearScene();const ticket=job;host=$(id);if(!host)return;
 host.querySelector("p.preview-error")?.remove();
 if(!path){showError("ยังไม่มี GLB ที่ตรงกับรายการนี้");return}
 try{
  const bounds=host.getBoundingClientRect();
  if(!bounds.width||!bounds.height)return;
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.3));renderer.setSize(bounds.width,bounds.height);
  host.append(renderer.domElement);
  scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xffffff,0x3d5063,2.1));
  const sun=new THREE.DirectionalLight(0xffe6ba,2);sun.position.set(3,5,8);scene.add(sun);
  camera=new THREE.PerspectiveCamera(52,bounds.width/bounds.height,.05,500);
  orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.enablePan=false;orbit.maxDistance=150;orbit.minDistance=.3;
  const result=await loader.loadAsync(path);
  if(ticket!==job)return;object=result.scene;scene.add(object);
  const box=new THREE.Box3().setFromObject(object),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  if(!size.length()||!Number.isFinite(size.length()))throw Error("โมเดล GLB ไม่มีขนาดที่ใช้งานได้");
  const largest=Math.max(size.x,size.y,size.z,.01);
  camera.position.set(center.x+largest*.9,center.y+largest*.55,center.z+largest*1.7);
  camera.near=Math.max(.001,largest/1000);camera.far=Math.max(100,largest*100);camera.updateProjectionMatrix();orbit.target.copy(center);orbit.update();
  observer=new ResizeObserver(()=>{if(!renderer||!camera||!host)return;const r=host.getBoundingClientRect();renderer.setSize(r.width,r.height);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix()});observer.observe(host);
  function animate(){if(ticket!==job)return;orbit.update();renderer.render(scene,camera);frame=requestAnimationFrame(animate)}animate();
 }catch(e){if(ticket!==job)return;showError("พรีวิว GLB ไม่สำเร็จ: "+String(e.message).slice(0,120))}
 function showError(text){if(!host)return;const p=document.createElement("p");p.className="preview-error";p.textContent=text;p.style.cssText="position:absolute;top:8px;left:12px;right:12px;color:#f3b2ae;z-index:2;font-size:12px";host.append(p)}
}
function makeButton(name,desc,active,click){
 const b=document.createElement("button");b.type="button";b.className="item"+(active?" on":"");
 const strong=document.createElement("strong"),small=document.createElement("small");strong.textContent=String(name);small.textContent=String(desc||"");b.append(strong,small);b.addEventListener("click",click);return b;
}
function emptyList(el,msg){el.replaceChildren();const p=document.createElement("p");p.className="muted";p.textContent=msg;el.append(p)}
function gunEntries(){
 const names=new Map(state.guns.map(w=>[Number(w.id),w]));
 const entries=[];
 for(const model of state.models){
  if(!model||!model.id||!safeRel(model.file))continue;
  const ids=Array.isArray(model.itemIds)?model.itemIds.map(Number).filter(Number.isFinite):[];
  if(ids.length){for(const id of ids){const w=names.get(id);entries.push({id,model,name:w?.name||model.id,slot:w?.slot||Math.trunc(id/100000),kind:w?.className||"",glb:"/assets/weapons/models/"+model.file,skin:model.id})}}
  else entries.push({id:null,model,name:model.id,slot:0,kind:"ไม่พบรหัสอาวุธ",glb:"/assets/weapons/models/"+model.file,skin:model.id});
 }
 return entries;
}
let weaponAll=[];
function renderWeapons(){
 const container=$("weapon-list");container.replaceChildren();
 const filter=$("gun-filter").value,query=$("gun-search").value.trim().toLowerCase();
 const matches=weaponAll.filter(w=>(filter==="all"||String(w.slot)===filter)&&(w.name+" "+w.skin+" "+(w.id??"")).toLowerCase().includes(query));
 $("weapon-count").textContent=matches.length+" รายการ";
 for(const w of matches.slice(0,180))container.append(makeButton(w.name,w.kind+" · สกิน/โมเดล: "+w.skin+(w.id?" · #"+w.id:""),state.selectedGun===w,()=>{state.selectedGun=w;renderWeapons();renderWeaponDetail();void showGLB("weapon-preview",w.glb)}));
 if(!matches.length)emptyList(container,"ยังไม่มีรายการที่ตรงกับการค้นหา หรือไม่มี Weapons GLB ที่ได้รับอนุญาตใน Safari");
 if(matches.length>180){const note=document.createElement("p");note.className="muted";note.textContent="แสดง 180 รายการแรก กรุณาใช้ช่องค้นหา";container.append(note)}
}
function renderWeaponDetail(){
 const w=state.selectedGun;
 $("weapon-name").textContent=w?.name||"เลือกปืนจากรายการ";
 $("weapon-detail").textContent=w?"รุ่นโมเดล: "+w.skin+" · Item ID: "+(w.id??"ไม่มี")+" · หมวด "+w.kind:"ต้องนำเข้า assets/weapons/models/index.json และไฟล์ GLB";
 $("equip").disabled=!w?.id;
}
$("gun-search").addEventListener("input",renderWeapons);
$("gun-filter").addEventListener("change",renderWeapons);
$("equip").addEventListener("click",()=>{
 const w=state.selectedGun;if(!w?.id)return;
 save("weapon",{id:w.id,name:w.name,skin:w.skin,glb:w.glb});
 $("equip-note").textContent="บันทึก "+w.name+" ในโปรไฟล์ทดสอบแล้ว · ไม่ใช่การเปลี่ยน Loadout ของเซิร์ฟเวอร์";
});
function renderCharacters(){
 const list=$("character-list");list.replaceChildren();$("character-count").textContent=state.charas.length+" ตัว";
 if(!state.charas.length)return emptyList(list,"ยังไม่มี /assets/chars/index.json จาก Point Blank Cross");
 state.charas.slice(0,300).forEach(c=>list.append(makeButton(c.name||"Unnamed",String(c.team||"ไม่ระบุทีม")+" · "+(c.itemId||""),c===state.selectedChara,()=>{
  state.selectedChara=c;renderCharacters();renderCharaDetail();void showGLB("character-preview",c.glb);
 })));
}
function renderCharaDetail(){
 const c=state.selectedChara;
 $("character-name").textContent=c?.name||"เลือกตัวละคร";
 $("character-detail").textContent=c?"ทีม: "+(c.team||"ไม่ระบุ")+" · รหัส: "+(c.itemId||"—"):"ยังไม่มีไฟล์ตัวละคร";
 $("select-character").disabled=!c;
}
$("select-character").addEventListener("click",()=>{const c=state.selectedChara;if(c)save("character",{name:c.name,id:c.itemId,team:c.team})});
function renderMaps(){
 const list=$("map-list");list.replaceChildren();$("map-count").textContent=state.maps.length+" แผนที่";
 if(!state.maps.length)return emptyList(list,"ยังไม่มี /assets/maps/index.json จาก Point Blank Cross");
 state.maps.forEach(m=>list.append(makeButton(m.name||m.id,m.id+" · "+(m.check?.visual&&m.check?.collisionGlb?"ผ่านตรวจไฟล์ GLB":"ยังไม่ผ่านตรวจ"),m===state.selectedMap,()=>{
 state.selectedMap=m;renderMaps();renderMapDetail();
 })));
}
function renderMapDetail(){
 const m=state.selectedMap;$("map-name").textContent=m?.name||"เลือกแผนที่";
 $("map-detail").textContent=m?"Map ID: "+m.id+" · Visual: "+Boolean(m.check?.visual)+" · Collision: "+Boolean(m.check?.collisionGlb)+" · จุดเกิด: "+(m.respawns??"ไม่ทราบ"):"ยังไม่มีดัชนีแผนที่";
 $("play-map").disabled=!(m?.check?.visual&&m?.check?.collisionGlb);
}
$("play-map").addEventListener("click",()=>{const m=state.selectedMap;if(!m||!/^[a-z\d_-]+$/i.test(m.id))return;location.href="/game/?play&map="+encodeURIComponent(m.id)+"&bots=4"});
function renderRank(){
 $("rank").value=String(Math.max(1,Number(profile.rank)||1));$("nickname").value=profile.nickname||"SOLDIER";
 const k="STBL_IDX_RANK_"+profile.rank,real=state.strings[k];
 $("rank-label").textContent=real?real+" (Rank "+profile.rank+")":"Rank "+profile.rank+" · ยังไม่มีไฟล์ชื่อยศต้นฉบับ";
}
$("save-profile").addEventListener("click",()=>{profile.rank=Math.min(99,Math.max(1,Math.trunc(Number($("rank").value)||1)));profile.nickname=$("nickname").value.trim().slice(0,20)||"SOLDIER";save("profile",profile);renderRank();renderTitles();$("rank-note").textContent="บันทึกยศสำหรับพรีวิวแล้ว · ไม่ได้เพิ่ม EXP บนเซิร์ฟเวอร์"});
function titleName(t){const v=state.strings["STR_TBL_DESIGNATION_NAME_NO"+(t.set-1)];return v||"ฉายา #"+t.id}
function titleReason(t){
 if(profile.owned.includes(t.id))return "มีแล้ว";
 if(profile.rank<t.rank)return "ต้องมียศ "+t.rank;
 for(const k of ["ribbon","ensign","medal","master"])if((Number(profile.badges[k])||0)<t[k])return "ต้องใช้ "+k+" "+t[k];
 if(t.req1&&!profile.owned.includes(t.req1))return "ต้องมีฉายา #"+t.req1;
 if(t.req2&&!profile.owned.includes(t.req2))return "ต้องมีฉายา #"+t.req2;
 return null;
}
function renderTitles(){
 const list=$("title-list");list.replaceChildren();$("title-count").textContent=state.titles.length+" ฉายา";
 if(!state.titles.length){emptyList(list,"ไม่พบตารางฉายาจากโมดูล Webport");return}
 state.titles.forEach(t=>list.append(makeButton(titleName(t),"ID "+t.id+" · ยศ "+t.rank+" · "+(profile.owned.includes(t.id)?"ได้รับแล้ว":(titleReason(t)||"พร้อมรับทดสอบ")),state.selectedTitle===t,()=>{state.selectedTitle=t;renderTitles();renderTitleDetail()})));
 renderTitleDetail();
}
function renderTitleDetail(){
 const t=state.selectedTitle;
 $("title-name").textContent=t?titleName(t):"เลือกฉายา";
 $("title-detail").textContent=t?"Rank ขั้นต่ำ: "+t.rank+" · ฉายาที่ต้องมี: "+[t.req1,t.req2].filter(Boolean).join(", ").replace(/^$/,"ไม่มี")+" · คลาส: "+t.classId:"ตารางฉายาโหลดจากโค้ด Webport เท่านั้น";
 for(const k of ["ribbon","ensign","medal","master"])$(k).value=String(Number(profile.badges[k])||0);
 $("badge-state").replaceChildren();
 const span=document.createElement("span");span.className="chip";span.textContent="สวมแล้ว: "+profile.equipped.filter(Boolean).length+"/3";$("badge-state").append(span);
 $("unlock-title").disabled=!t||!!titleReason(t);
 $("equip-title").disabled=!t||!profile.owned.includes(t.id)||profile.equipped.includes(t.id);
 $("title-equipped").replaceChildren();
 profile.equipped.forEach((id,i)=>{const b=document.createElement("button");b.textContent=(i+1)+": "+(id?(state.titles.find(t=>t.id===id)?titleName(state.titles.find(t=>t.id===id)):"ฉายา #"+id):"ว่าง")+(id?" ×":"");b.title="กดเพื่อถอดฉายา";b.addEventListener("click",()=>{profile.equipped[i]=0;save("profile",profile);renderTitles()});$("title-equipped").append(b)});
}
for(const k of ["ribbon","ensign","medal","master"])$(k).addEventListener("change",()=>{profile.badges[k]=Math.max(0,Math.floor(Number($(k).value)||0));save("profile",profile);renderTitles()});
$("unlock-title").addEventListener("click",()=>{
 const t=state.selectedTitle;if(!t||titleReason(t))return;
 for(const k of ["ribbon","ensign","medal","master"])profile.badges[k]-=t[k];
 profile.owned.push(t.id);save("profile",profile);
 $("title-status").textContent="รับฉายาทดสอบแล้ว: "+titleName(t)+" · ไม่มีผลต่อบัญชี PB";renderTitles();
});
$("equip-title").addEventListener("click",()=>{
 const t=state.selectedTitle;if(!t||!profile.owned.includes(t.id)||profile.equipped.includes(t.id))return;
 if(profile.equipped.some(id=>id&&state.titles.find(t=>t.id===id)?.classId===t.classId)){ $("title-status").textContent="ฉายาคลาสเดียวกันสวมซ้ำไม่ได้";return;}
 const ix=profile.equipped.findIndex(x=>!x);if(ix<0){$("title-status").textContent="ไม่มีช่องฉายาว่าง";return}
 profile.equipped[ix]=t.id;save("profile",profile);$("title-status").textContent="สวมฉายาทดสอบแล้ว: "+titleName(t);renderTitles();
});
async function init(){
 const [wm,ww,cc,mm,tt,ss]=await Promise.all([
 json("/assets/weapons/models/index.json"),json("/assets/cross/weapons/weapons.json"),
 json("/assets/chars/index.json"),json("/assets/maps/index.json"),
 json("/collection/title-catalog.json"),json("/assets/ui/cross/strings.json")
 ]);
 state.strings=ss&&typeof ss==="object"?ss:{};
 state.guns=Array.isArray(ww?.weapons)?ww.weapons:[];
 state.models=Array.isArray(wm?.weapons)?wm.weapons:[];
 weaponAll=gunEntries();
 state.charas=Array.isArray(cc?.chars)?cc.chars.filter(c=>c&&safeRel(c.model)).map(c=>({...c,glb:"/assets/chars/"+c.model})):[];
 state.maps=Array.isArray(mm)?mm.filter(m=>m&&typeof m.id==="string"&&/^[a-z\d_-]+$/i.test(m.id)):[];
 state.titles=Array.isArray(tt?.titles)?tt.titles:[];
 state.selectedGun=weaponAll[0]||null;
 state.selectedChara=state.charas[0]||null;
 state.selectedMap=state.maps[0]||null;
 state.selectedTitle=state.titles[0]||null;
 renderWeapons();renderWeaponDetail();renderCharacters();renderCharaDetail();renderMaps();renderMapDetail();renderRank();renderTitles();
 if(state.selectedGun)void showGLB("weapon-preview",state.selectedGun.glb);
}
init();
