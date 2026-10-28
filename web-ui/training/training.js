"use strict";
const canvas=document.getElementById("scene"),ctx=canvas.getContext("2d",{alpha:false});
const $=id=>document.getElementById(id);
const MAP=[
"1111111111111111",
"1000000000000001",
"1000110000110001",
"1000100000010001",
"1000000000000001",
"1000001100000001",
"1000001100000001",
"1000000000000001",
"1000100000010001",
"1000110000110001",
"1000000000000001",
"1111111111111111"
];
const walls=(x,y)=>{let cx=Math.floor(x),cy=Math.floor(y);return cy<0||cy>=MAP.length||cx<0||cx>=MAP[0].length||MAP[cy][cx]==="1"};
const player={x:3.5,y:3.5,a:.35,health:100,ammo:30,kills:0};
const targets=[{x:7.5,y:3.5,hp:3},{x:11.5,y:4.5,hp:3},{x:6.5,y:8.5,hp:3},{x:12.5,y:9.5,hp:3}];
let width=1,height=1,running=false,shotAt=0,last=0,flash=0,lookPointer=null,joyPointer=null,joyX=0,joyY=0;
const held=new Set();let zbuffer=new Float32Array(1);
function resize(){let dpr=Math.min(devicePixelRatio||1,1.5);width=Math.max(1,innerWidth);height=Math.max(1,innerHeight);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=width+"px";canvas.style.height=height+"px";ctx.setTransform(dpr,0,0,dpr,0,0)}
window.addEventListener("resize",resize);resize();
function move(dx,dy){const rad=.22;if(!walls(player.x+dx+Math.sign(dx)*rad,player.y)&&!walls(player.x+dx,player.y))player.x+=dx;if(!walls(player.x,player.y+dy+Math.sign(dy)*rad)&&!walls(player.x,player.y+dy))player.y+=dy}
function cast(a){const dx=Math.cos(a),dy=Math.sin(a);let mx=Math.floor(player.x),my=Math.floor(player.y),sideX=Math.abs(1/dx),sideY=Math.abs(1/dy),sx=dx<0?-1:1,sy=dy<0?-1:1,distX=(dx<0?player.x-mx:mx+1-player.x)*sideX,distY=(dy<0?player.y-my:my+1-player.y)*sideY,side=0;for(let i=0;i<44;i++){if(distX<distY){distX+=sideX;mx+=sx;side=0}else{distY+=sideY;my+=sy;side=1}if(walls(mx+.5,my+.5))break}const distance=side===0?distX-sideX:distY-sideY;return{dist:Math.max(.01,distance),side,hitX:player.x+dx*distance,hitY:player.y+dy*distance}}
function draw(){
 const W=width,H=height,horizon=H*.51;
 ctx.fillStyle="#52667c";ctx.fillRect(0,0,W,horizon);ctx.fillStyle="#333c43";ctx.fillRect(0,horizon,W,H-horizon);
 const sw=Math.max(2,Math.ceil(W/380)),cols=Math.ceil(W/sw);if(zbuffer.length!==cols)zbuffer=new Float32Array(cols);
 for(let i=0;i<cols;i++){let x=i*sw,rel=Math.atan((x/W-.5)*1.36),a=player.a+rel,r=cast(a),dist=r.dist*Math.cos(rel),hh=Math.min(H*2,H/(dist*.72)),start=horizon-hh/2,fog=Math.max(.18,1-dist/19),shade=Math.floor(135*fog*(r.side?.74:1));ctx.fillStyle="rgb("+shade+","+(shade+13)+","+(shade+24)+")";ctx.fillRect(x,start,sw+1,hh);let gridOffset=(r.side?r.hitX:r.hitY)%1;if(gridOffset<.07||gridOffset>.93){ctx.fillStyle="rgba(9,18,27,.3)";ctx.fillRect(x,start,sw+1,hh)}zbuffer[i]=dist}
 const objects=targets.filter(t=>t.hp>0).map(t=>{const dx=t.x-player.x,dy=t.y-player.y;return{t,dist:Math.hypot(dx,dy),angle:Math.atan2(dy,dx)-player.a}}).sort((a,b)=>b.dist-a.dist);
 for(const o of objects){const angle=Math.atan2(Math.sin(o.angle),Math.cos(o.angle));if(Math.abs(angle)>.85)continue;const px=W*(.5+Math.tan(angle)/1.36),size=Math.min(H,H/(o.dist*.72)),left=px-size*.25,top=horizon-size*.52,bi=Math.floor(px/sw);if(bi<0||bi>=cols||zbuffer[bi]<o.dist-.25)continue;ctx.fillStyle="#232a30";ctx.fillRect(left,top,size*.5,size*.67);ctx.fillStyle="#f5b941";ctx.fillRect(left+size*.08,top+size*.08,size*.34,size*.45);ctx.fillStyle="#b22f34";ctx.fillRect(left+size*.13,top+size*.16,size*.24,size*.28);ctx.fillStyle="#121b24";ctx.fillRect(left+size*.17,top+size*.2,size*.16,size*.19)}
 ctx.fillStyle="#dbe8ef";ctx.fillRect(W/2-10,H/2,7,2);ctx.fillRect(W/2+3,H/2,7,2);ctx.fillRect(W/2,H/2-10,2,7);ctx.fillRect(W/2,H/2+3,2,7);
 // Stylized weapon silhouette, not an imported Point Blank weapon model.
 const bx=W/2,by=H;ctx.fillStyle="#18212a";ctx.beginPath();ctx.moveTo(bx-56,by);ctx.lineTo(bx-37,by-67);ctx.lineTo(bx-21,by-106);ctx.lineTo(bx-15,by-172);ctx.lineTo(bx+15,by-172);ctx.lineTo(bx+21,by-106);ctx.lineTo(bx+42,by-68);ctx.lineTo(bx+66,by);ctx.fill();ctx.fillStyle="#4c5966";ctx.fillRect(bx-10,by-170,20,54);ctx.fillStyle="#c59347";ctx.fillRect(bx-6,by-160,12,28);
 if(flash>0){ctx.fillStyle="rgba(255,230,150,.7)";ctx.beginPath();ctx.arc(bx,by-172,24,0,Math.PI*2);ctx.fill();flash--}
}
function hasLOS(t){const a=Math.atan2(t.y-player.y,t.x-player.x),d=Math.hypot(t.x-player.x,t.y-player.y);return cast(a).dist>d-.2}
function fire(){if(!running)return;if(performance.now()-shotAt<180)return;shotAt=performance.now();if(player.ammo<=0){toast("กระสุนหมด · กด RELOAD");return}player.ammo--;flash=4;let best=null,min=Infinity;for(const t of targets){if(t.hp<=0)continue;const angle=Math.atan2(Math.sin(Math.atan2(t.y-player.y,t.x-player.x)-player.a),Math.cos(Math.atan2(t.y-player.y,t.x-player.x)-player.a));const d=Math.hypot(t.x-player.x,t.y-player.y);if(Math.abs(angle)<.1+(.1/d) && d<min && hasLOS(t)){min=d;best=t}}if(best){best.hp--;if(best.hp<=0){player.kills++;toast("TARGET DOWN");if(targets.every(t=>t.hp<=0)){targets.forEach(t=>t.hp=3);toast("CLEAR! เริ่มเป้าชุดใหม่")}}else toast("HIT")}updateHUD()}
let toastTimer;function toast(s){$("toast").textContent=s;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").textContent="",950)}
function updateHUD(){$("ammo").textContent=player.ammo+" / ∞";$("hits").textContent=player.kills}
function tick(now){requestAnimationFrame(tick);if(!running){draw();return}const dt=Math.min(.05,(now-(last||now))/1000);last=now;const f=(held.has("KeyW")?1:0)-(held.has("KeyS")?1:0)-joyY,s=(held.has("KeyD")?1:0)-(held.has("KeyA")?1:0)+joyX,speed=(held.has("ShiftLeft")?4.1:2.8)*dt,len=Math.max(1,Math.hypot(f,s)),a=player.a;move((Math.cos(a)*f-Math.sin(a)*s)*speed/len,(Math.sin(a)*f+Math.cos(a)*s)*speed/len);if(held.has("ArrowLeft"))player.a-=dt*1.7;if(held.has("ArrowRight"))player.a+=dt*1.7;if(held.has("Space"))fire();draw()}
requestAnimationFrame(tick);
function start(){running=true;$("overlay").classList.add("hidden");last=performance.now();if(matchMedia("(pointer:fine)").matches)canvas.requestPointerLock?.().catch(()=>{})}
$("start").addEventListener("click",start);
$("reload").addEventListener("click",()=>{player.ammo=30;updateHUD();toast("RELOADED")});
$("fire").addEventListener("pointerdown",e=>{e.preventDefault();$("fire").setPointerCapture(e.pointerId);fire()});
addEventListener("keydown",e=>{if(["Space","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();held.add(e.code);if(e.code==="KeyR"){$("reload").click()}if(e.code==="Escape"&&running){running=false;$("overlay").classList.remove("hidden")}});
addEventListener("keyup",e=>held.delete(e.code));addEventListener("blur",()=>held.clear());
document.addEventListener("mousemove",e=>{if(running&&document.pointerLockElement===canvas)player.a+=e.movementX*.0023});
canvas.addEventListener("click",()=>{if(running&&matchMedia("(pointer:fine)").matches){if(document.pointerLockElement===canvas)fire();else canvas.requestPointerLock?.().catch(()=>{})}});
const stick=$("stick"),nub=$("nub"),look=$("look");
function updateJoy(e){const b=stick.getBoundingClientRect(),cx=b.left+b.width/2,cy=b.top+b.height/2,dx=(e.clientX-cx)/(b.width*.35),dy=(e.clientY-cy)/(b.height*.35),len=Math.max(1,Math.hypot(dx,dy));joyX=dx/len;joyY=dy/len;nub.style.transform="translate("+joyX*34+"px,"+joyY*34+"px)"}
stick.addEventListener("pointerdown",e=>{joyPointer=e.pointerId;stick.setPointerCapture(e.pointerId);updateJoy(e)});
stick.addEventListener("pointermove",e=>{if(joyPointer===e.pointerId)updateJoy(e)});
function endJoy(e){if(joyPointer===e.pointerId){joyPointer=null;joyX=joyY=0;nub.style.transform="translate(0,0)"}}
stick.addEventListener("pointerup",endJoy);stick.addEventListener("pointercancel",endJoy);
let lastLookX=0;
look.addEventListener("pointerdown",e=>{lookPointer=e.pointerId;lastLookX=e.clientX;look.setPointerCapture(e.pointerId)});
look.addEventListener("pointermove",e=>{if(lookPointer===e.pointerId&&running){player.a+=(e.clientX-lastLookX)*.006;lastLookX=e.clientX}});
look.addEventListener("pointerup",e=>{if(lookPointer===e.pointerId)lookPointer=null});
look.addEventListener("pointercancel",e=>{if(lookPointer===e.pointerId)lookPointer=null});
