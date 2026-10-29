import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const $=id=>document.getElementById(id);
// A selected, authorized exported map; synthetic training is opt-in only.
const mapQuery=new URLSearchParams(location.search);
const requested=mapQuery.get("map")||"burninghall";
const mapId=/^[a-z0-9_-]{1,80}$/i.test(requested)?requested:"burninghall";
const demoMode=mapQuery.get("demo")==="1";
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=false;document.body.insertBefore(renderer.domElement,document.body.firstChild);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x6d879d);scene.fog=new THREE.Fog(0x6d879d,25,100);
const camera=new THREE.PerspectiveCamera(74,innerWidth/innerHeight,.05,250);const clock=new THREE.Clock();
scene.add(new THREE.HemisphereLight(0xd8e4ff,0x31353a,2));const sun=new THREE.DirectionalLight(0xffe9bc,2);sun.position.set(12,24,8);scene.add(sun);
let visual=null,collision=null,usingReal=false,targets=[],player=new THREE.Vector3(0,1.7,0),yaw=0,pitch=0,started=false,shots=0,ammo=30,raycaster=new THREE.Raycaster(),collisionMeshes=[],otherMeshes=[],dead=false;let lastShot=0;
const loader=new GLTFLoader();const load=path=>new Promise((resolve,reject)=>loader.load(path,resolve,undefined,reject));
const valid=async url=>{try{const r=await fetch(url,{method:"HEAD",cache:"no-store"});return r.ok&&!(r.headers.get("content-type")||"").includes("text/html")}catch{return false}};
function procedural(){const mat=new THREE.MeshStandardMaterial({color:0x6f7780,roughness:.9});const floor=new THREE.Mesh(new THREE.BoxGeometry(32,.6,22),mat);floor.position.y=-.3;scene.add(floor);const wallMat=new THREE.MeshStandardMaterial({color:0x435465});function wall(x,z,w,d,h=3.5){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wallMat);m.position.set(x,h/2,z);scene.add(m);collisionMeshes.push(m)}wall(-16,0,.7,22);wall(16,0,.7,22);wall(0,-11,32,.7);wall(0,11,32,.7);wall(-7,-4,.6,8);wall(7,4,.6,9);wall(0,0,5,.5);wall(-2,6,3,1);wall(8,-6,2,4);player.set(-11,1.7,7);for(let i=0;i<6;i++)targetAt(-11+i*4,1.25,-7+(i%2)*1.5)}
const targetMat=new THREE.MeshStandardMaterial({color:0xe8ac4b,roughness:.6}),badMat=new THREE.MeshStandardMaterial({color:0x8f2734,roughness:.8});
function targetAt(x,y,z){const group=new THREE.Group();const m=new THREE.Mesh(new THREE.BoxGeometry(.8,1.7,.5),targetMat);m.position.y=.85;group.add(m);const center=new THREE.Mesh(new THREE.BoxGeometry(.45,.6,.53),badMat);center.position.y=.95;group.add(center);group.position.set(x,0,z);scene.add(group);targets.push({group,hp:3});otherMeshes.push(...group.children)}
function hitCheck(origin,dir,maxDist=.65){raycaster.set(origin,dir);raycaster.far=maxDist;return raycaster.intersectObjects(collisionMeshes,false).length>0}
function shift(dx,dz){const pos=player.clone();const can=(x,z)=>{const p=new THREE.Vector3(x,player.y,z);return ![new THREE.Vector3(1,0,0),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-1)].some(d=>hitCheck(p,d,.36))};if(can(pos.x+dx,pos.z))player.x+=dx;if(can(player.x,pos.z+dz))player.z+=dz}
function shoot(){if(!started||ammo<=0||performance.now()-lastShot<170)return;lastShot=performance.now();ammo--;$("ammo").textContent=ammo;raycaster.set(camera.position,new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion));raycaster.far=100;const targetHits=raycaster.intersectObjects(otherMeshes);const wallHits=raycaster.intersectObjects(collisionMeshes);if(targetHits.length&&(!wallHits.length||targetHits[0].distance<wallHits[0].distance)){const target=targets.find(t=>t.group.children.includes(targetHits[0].object));if(target&&--target.hp<=0){target.group.visible=false;shots++;$("hits").textContent=shots;if(targets.every(t=>t.hp<=0)){for(const t of targets){t.hp=3;t.group.visible=true}}}}}
const key=new Set();let joy={x:0,y:0},joyID=null,lookID=null,oldX=0,oldY=0;
window.addEventListener("keydown",e=>{key.add(e.code);if(e.code==="KeyR")$("reload").click();if(["Space","ArrowUp","ArrowDown"].includes(e.code))e.preventDefault()});window.addEventListener("keyup",e=>key.delete(e.code));window.addEventListener("blur",()=>key.clear());
window.addEventListener("mousemove",e=>{if(started&&document.pointerLockElement===renderer.domElement){yaw-=e.movementX*.002;pitch=THREE.MathUtils.clamp(pitch-e.movementY*.002,-1.35,1.35)}});renderer.domElement.addEventListener("mousedown",e=>{if(started&&e.button===0)shoot()});renderer.domElement.addEventListener("click",()=>{if(started&&matchMedia("(pointer:fine)").matches&&document.pointerLockElement!==renderer.domElement)renderer.domElement.requestPointerLock?.().catch(()=>{})});
$("reload").addEventListener("click",()=>{ammo=30;$("ammo").textContent=ammo});$("fire").addEventListener("pointerdown",e=>{e.preventDefault();shoot()});
const move=$("move"),nub=$("nub"),look=$("look");function onJoy(e){const r=move.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/(r.width*.36),dy=(e.clientY-r.top-r.height/2)/(r.height*.36),length=Math.max(1,Math.hypot(dx,dy));joy={x:dx/length,y:dy/length};nub.style.transform="translate("+(joy.x*37)+"px,"+(joy.y*37)+"px)"}
move.addEventListener("pointerdown",e=>{joyID=e.pointerId;move.setPointerCapture(joyID);onJoy(e)});move.addEventListener("pointermove",e=>{if(e.pointerId===joyID)onJoy(e)});function stopJoy(e){if(e.pointerId===joyID){joyID=null;joy={x:0,y:0};nub.style.transform="translate(0,0)"}}move.addEventListener("pointerup",stopJoy);move.addEventListener("pointercancel",stopJoy);
look.addEventListener("pointerdown",e=>{lookID=e.pointerId;oldX=e.clientX;oldY=e.clientY;look.setPointerCapture(lookID)});look.addEventListener("pointermove",e=>{if(e.pointerId===lookID){yaw-=(e.clientX-oldX)*.005;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-oldY)*.005,-1.35,1.35);oldX=e.clientX;oldY=e.clientY}});look.addEventListener("pointerup",()=>lookID=null);look.addEventListener("pointercancel",()=>lookID=null);
function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.05);if(started){const f=(key.has("KeyW")?1:0)-(key.has("KeyS")?1:0)-joy.y,r=(key.has("KeyD")?1:0)-(key.has("KeyA")?1:0)+joy.x,l=Math.max(1,Math.hypot(f,r)),speed=(key.has("ShiftLeft")?4.5:2.8)*dt/l;shift((-Math.sin(yaw)*f+Math.cos(yaw)*r)*speed,(-Math.cos(yaw)*f-Math.sin(yaw)*r)*speed);if(key.has("Space"))shoot();camera.position.copy(player);camera.rotation.order="YXZ";camera.rotation.set(pitch,yaw,0)}renderer.render(scene,camera)}
window.addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});loop();
async function init(){
 const begin=$("begin");
 begin.disabled=true;
 $("map-label").textContent=mapId.toUpperCase()+" · CHECKING ASSETS";
 const base="/assets/maps/"+mapId+"/";
 const paths=["visual.glb","collision.glb","collision.json"].map(name=>base+name);
 const ok=await Promise.all(paths.map(valid));
 if(ok.every(Boolean)){
   try{
     const [map,col,raw]=await Promise.all([
       load(paths[0]),load(paths[1]),fetch(paths[2],{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("collision.json HTTP "+r.status);return r.json()})
     ]);
     visual=map.scene;collision=col.scene;
     scene.add(visual);
     collision.updateMatrixWorld(true);
     collision.traverse(obj=>{if(obj.isMesh){obj.updateMatrixWorld(true);collisionMeshes.push(obj)}});
     if(!collisionMeshes.length)throw Error("Collision GLB ไม่มีผิวชนที่อ่านได้");
     const spawn=raw.respawns?.find(r=>Array.isArray(r.pos)&&r.pos.length>=3)?.pos
       || (Array.isArray(raw.spawnSuggestion)?raw.spawnSuggestion:null);
     if(Array.isArray(spawn)&&spawn.length>=3&&spawn.slice(0,3).every(Number.isFinite)){
       player.set(spawn[0],spawn[1]+(raw.respawns?.length?1.6:.7),spawn[2]);
     }else{
       const bounds=new THREE.Box3().setFromObject(collision);
       bounds.getCenter(player);player.y+=1.7;
     }
     usingReal=true;
     $("headline").textContent="โหลดแผนที่ GLB แล้ว: "+mapId;
     $("description").textContent="ใช้ visual.glb / collision.glb ที่นำเข้าจริงใน Safari เครื่องนี้ โหมดนี้เป็นเพียงการเดินสำรวจเพื่อทดสอบ ไม่ใช่เกม Point Blank เต็มรูปแบบ";
     $("map-label").textContent=mapId.toUpperCase()+" · IMPORTED GLB";
     begin.textContent="เริ่มเดินสำรวจแผนที่";
     begin.disabled=false;
   }catch(e){
     $("description").textContent="พบไฟล์แต่เปิด GLB/Collision ไม่สำเร็จ: "+String(e?.message||e).slice(0,170);
   }
 }else{
   const missing=paths.filter((_,i)=>!ok[i]).map(p=>p.split("/").pop());
   $("headline").textContent="ยังขาดแผนที่ GLB ที่ใช้งานได้";
   $("description").textContent="แผนที่ "+mapId+" ขาด: "+missing.join(", ")+" · กลับไปหน้า /play/ แล้วนำเข้า ZIP Assets ที่แปลงเป็น Web GLB/JSON";
 }
 if(!usingReal){
   if(visual){scene.remove(visual);visual=null}
   if(collision){scene.remove(collision);collision=null}
   collisionMeshes=[];
   if(demoMode){
     procedural();
     $("headline").textContent="ฉากฝึกจำลอง (ไม่ใช่ Point Blank)";
     $("map-label").textContent="SYNTHETIC DEMO";
     begin.textContent="เริ่มฉากจำลอง";
     begin.disabled=false;
   }else{
     $("map-label").textContent="ASSETS MISSING · "+mapId.toUpperCase();
     begin.textContent="ยังเริ่มไม่ได้ — ไม่มีแผนที่ที่เปิดได้";
     begin.disabled=true;
   }
 }
 begin.addEventListener("click",()=>{
   if(begin.disabled)return;
   started=true;$("panel").classList.add("off");
   if(matchMedia("(pointer:fine)").matches)renderer.domElement.requestPointerLock?.().catch(()=>{});
 });
}
init();