// PB Webport development UI. Guest profile and loadout exist only in this browser.
// This is not an authenticated game account or a replacement for the match server.
"use strict";
const GUNS = Object.freeze([
  {id:"ak47_pbic2013", name:"AK-47 PBIC2013", kind:"Assault Rifle", details:"โมเดล 3D ผ่านการแปลงพร้อมพื้นผิว · 3,178 สามเหลี่ยม", verified:true},
  {id:"colt45", name:"Colt45", kind:"Pistol", details:"โมเดล 3D ผ่านการแปลงพร้อมพื้นผิว · 14,205 สามเหลี่ยม", verified:true},
  {id:"m4a1", name:"M4A1", kind:"Assault Rifle", details:"โมเดล 3D ผ่านการแปลง · 4,497 สามเหลี่ยม · ขาดพื้นผิว 1 รายการ", verified:true},
]);
const $ = (id) => document.getElementById(id);
const guestKey = "pb-webport-local-guest-v1";
const gunKey = "pb-webport-local-weapon-v1";
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k,v) { try { localStorage.setItem(k,v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
let selected = GUNS.find((w) => w.id === store.get(gunKey)) || GUNS[0];
let guest = store.get(guestKey) || "";
function showLogin() {
  $("login-view").classList.remove("hidden");
  $("lobby-view").classList.add("hidden");
  $("nickname").value = guest;
}
function showLobby() {
  $("login-view").classList.add("hidden");
  $("lobby-view").classList.remove("hidden");
  $("callsign").textContent = guest;
  showPanel("home");
  renderGuns();
}
function showPanel(id) {
  for (const tab of document.querySelectorAll("[data-panel]")) {
    const current = tab.dataset.panel === id;
    tab.classList.toggle("active", current);
    tab.setAttribute("aria-current", String(current));
  }
  for (const panel of document.querySelectorAll(".panel"))
    panel.classList.toggle("hidden", panel.id !== "panel-" + id);
}
function renderGuns() {
  $("weapons").replaceChildren();
  for(const weapon of GUNS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "weapon" + (selected.id === weapon.id ? " selected" : "");
    btn.setAttribute("aria-pressed", String(selected.id === weapon.id));
    const label = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = weapon.name;
    const subtitle = document.createElement("small");
    subtitle.textContent = weapon.kind;
    label.append(title, subtitle);
    const badge = document.createElement("span");
    badge.textContent = "3D VERIFIED";
    btn.append(label, badge);
    btn.addEventListener("click", () => { selected = weapon; renderGuns(); });
    $("weapons").append(btn);
  }
  $("selected-weapon").textContent = selected.name;
  $("weapon-details").textContent = selected.details;
}
$("guest-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const nick = $("nickname").value.trim().replace(/[<>\r\n]/g, "").slice(0,18);
  if (nick.length < 2) { $("nickname").setCustomValidity("กรอกอย่างน้อย 2 ตัวอักษร"); $("nickname").reportValidity(); return; }
  $("nickname").setCustomValidity("");
  guest = nick;
  store.set(guestKey, guest);
  showLobby();
});
$("nickname").addEventListener("input", () => $("nickname").setCustomValidity(""));
$("logout").addEventListener("click", () => { guest = ""; store.del(guestKey); showLogin(); });
for(const item of document.querySelectorAll("[data-panel]"))
  item.addEventListener("click", () => showPanel(item.dataset.panel));
for(const item of document.querySelectorAll("[data-go]"))
  item.addEventListener("click", () => showPanel(item.dataset.go));
$("equip-weapon").addEventListener("click", () => {
  store.set(gunKey, selected.id);
  $("equip-result").textContent = "บันทึกการเลือก " + selected.name + " เฉพาะหน้าเมนูแล้ว (ยังไม่ได้เชื่อมกับ loadout ของเกม)";
});
async function assetHead(path) {
  try {
    const response = await fetch(path, {method:"HEAD", cache:"no-store"});
    const type = response.headers.get("content-type") || "";
    return response.ok && !type.includes("text/html");
  } catch { return false; }
}
$("start-training").addEventListener("click", async () => {
  const button = $("start-training"), message = $("training-check");
  button.disabled = true;
  message.className = "check-results";
  message.textContent = "ตรวจหาแผนที่ / Collision / คลังอาวุธในโฮสต์ที่ใช้งาน...";
  const checks = await Promise.all([
    assetHead("/assets/maps/burninghall/visual.glb"),
    assetHead("/assets/maps/burninghall/collision.glb"),
    assetHead("/assets/maps/burninghall/collision.json"),
    assetHead("/assets/weapons/models/index.json"),
  ]);
  button.disabled = false;
  if (!checks.every(Boolean)) {
    const names = ["visual.glb", "collision.glb", "collision.json", "weapons/models/index.json"];
    message.className = "check-results error";
    message.textContent = "ยังเปิดโหมดฝึกไม่ได้: ไฟล์เกมบนเว็บยังไม่ครบ\nขาดหรือเข้าถึงไม่ได้: " +
      names.filter((_,i)=>!checks[i]).join(", ") +
      "\nระบบแปลงบน GitHub ใช้ไฟล์ชั่วคราว และยังไม่ได้เผยแพร่ Assets บน Netlify";
    return;
  }
  message.className = "check-results good";
  message.textContent = "พบ Assets หลักครบเบื้องต้น กำลังเปิด Webport โหมดฝึก... (ยังต้องตรวจทรัพยากรอื่นเมื่อเข้าเกม)";
  window.location.assign("/?play&map=burninghall");
});
if (guest && guest.trim().length >= 2) showLobby(); else showLogin();
