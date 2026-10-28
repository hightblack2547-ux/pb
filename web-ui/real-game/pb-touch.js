// Experimental iPhone touch-to-input bridge for the actual Webport offline game.
// Only activates on /game/?play... with a coarse pointer; not original PB mobile input.
(function(){
  "use strict";
  if(!new URLSearchParams(location.search).has("play") || !matchMedia("(pointer:coarse)").matches)return;
  window.__pbTouchEnabled=true;
  const style=document.createElement("style");
  style.textContent=[
    "body.pb-touch{touch-action:none;user-select:none;-webkit-user-select:none}",
    "body.pb-touch #blocker{display:none!important}",
    "#pb-touch{position:fixed;inset:0;z-index:999;pointer-events:none;color:white;font:700 13px system-ui,sans-serif}",
    "#pb-stick{position:absolute;bottom:max(100px,calc(env(safe-area-inset-bottom) + 95px));left:18px;width:136px;height:136px;border:2px solid #edf6ff9a;border-radius:50%;background:#1c344b77;pointer-events:auto;touch-action:none;display:grid;place-items:center}",
    "#pb-nub{width:55px;height:55px;border-radius:50%;background:#e9b75dbb;border:2px solid #ffe4a6}",
    "#pb-look{position:absolute;right:0;top:15%;bottom:17%;width:51%;pointer-events:auto;touch-action:none}",
    "#pb-fire{position:absolute;bottom:max(128px,calc(env(safe-area-inset-bottom) + 122px));right:18px;width:90px;height:90px;border-radius:50%;border:3px solid #f1c674;background:#b9353ecf;color:white;font-size:17px;font-weight:900;pointer-events:auto;touch-action:none}",
    "#pb-extra{position:absolute;bottom:max(45px,calc(env(safe-area-inset-bottom) + 35px));right:18px;display:flex;gap:8px;pointer-events:auto}",
    "#pb-extra button{padding:9px 12px;border:1px solid #8aa3be;background:#203348d9;color:white;border-radius:8px}",
    "#pb-touch a{position:absolute;top:env(safe-area-inset-top);right:10px;margin-top:12px;background:#152c42d9;color:#fff;padding:10px;pointer-events:auto;text-decoration:none;border:1px solid #546d81}"
  ].join("");
  document.head.append(style);
  function boot(){
    if(!document.body)return;
    document.body.classList.add("pb-touch");
    const root=document.createElement("div");root.id="pb-touch";
    root.innerHTML='<div id="pb-look" aria-label="Drag to aim"></div><div id="pb-stick" aria-label="Movement joystick"><div id="pb-nub"></div></div><button id="pb-fire" type="button">FIRE</button><div id="pb-extra"><button type="button" id="pb-reload">RELOAD</button><button type="button" id="pb-jump">JUMP</button></div><a href="/play/">EXIT</a>';
    document.body.append(root);
    const $=id=>document.getElementById(id);
    const held=new Set();
    function setKey(code,down){
      if(held.has(code)===down)return;
      if(down)held.add(code);else held.delete(code);
      window.dispatchEvent(new KeyboardEvent(down?"keydown":"keyup",{code,key:code,bubbles:true}));
    }
    function pulse(code){setKey(code,true);setTimeout(()=>setKey(code,false),75)}
    const joy=$("pb-stick"),nub=$("pb-nub");
    let joystickId=null;
    function move(e){
      const b=joy.getBoundingClientRect(),x=(e.clientX-b.left-b.width/2)/(b.width*.35),y=(e.clientY-b.top-b.height/2)/(b.height*.35),n=Math.max(1,Math.hypot(x,y)),a=x/n,c=y/n;
      nub.style.transform="translate("+(a*39)+"px,"+(c*39)+"px)";
      setKey("KeyW",c<-.25);setKey("KeyS",c>.25);setKey("KeyA",a<-.25);setKey("KeyD",a>.25);
    }
    joy.addEventListener("pointerdown",e=>{e.preventDefault();joystickId=e.pointerId;joy.setPointerCapture(e.pointerId);move(e)});
    joy.addEventListener("pointermove",e=>{if(e.pointerId===joystickId)move(e)});
    function stop(e){if(e.pointerId!==joystickId)return;joystickId=null;nub.style.transform="translate(0px,0px)";["KeyW","KeyS","KeyA","KeyD"].forEach(k=>setKey(k,false))}
    joy.addEventListener("pointerup",stop);joy.addEventListener("pointercancel",stop);
    const aim=$("pb-look");let aimId=null,lastX=0,lastY=0;
    aim.addEventListener("pointerdown",e=>{e.preventDefault();aimId=e.pointerId;lastX=e.clientX;lastY=e.clientY;aim.setPointerCapture(e.pointerId)});
    aim.addEventListener("pointermove",e=>{
      if(aimId!==e.pointerId)return;
      const dx=(e.clientX-lastX)*1.8,dy=(e.clientY-lastY)*1.8;lastX=e.clientX;lastY=e.clientY;
      const ev=new MouseEvent("mousemove",{bubbles:true});
      Object.defineProperty(ev,"movementX",{value:dx});
      Object.defineProperty(ev,"movementY",{value:dy});
      document.dispatchEvent(ev);
    });
    aim.addEventListener("pointerup",()=>aimId=null);aim.addEventListener("pointercancel",()=>aimId=null);
    const fire=$("pb-fire");function sendMouse(down){document.dispatchEvent(new MouseEvent(down?"mousedown":"mouseup",{bubbles:true,button:0,buttons:down?1:0}))}
    fire.addEventListener("pointerdown",e=>{e.preventDefault();fire.setPointerCapture(e.pointerId);sendMouse(true)});
    fire.addEventListener("pointerup",e=>{e.preventDefault();sendMouse(false)});
    fire.addEventListener("pointercancel",()=>sendMouse(false));
    $("pb-reload").addEventListener("click",()=>pulse("KeyR"));
    $("pb-jump").addEventListener("click",()=>pulse("Space"));
    window.addEventListener("blur",()=>{held.forEach(k=>setKey(k,false));sendMouse(false)});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
