// PB Webport development UI. Guest profile and loadout exist only in this browser.
// This is not an authenticated game account or a replacement for the match server.
"use strict";
const GUNS = Object.freeze([
  {id:"ak_47_pbic2013", name:"AK-47 PBIC2013", kind:"Assault Rifle", details:"13 meshes · 3,178 สามเหลี่ยม · พื้นผิวครบ", missing:0},
  {id:"colt45", name:"Colt45", kind:"Pistol", details:"3 meshes · 14,205 สามเหลี่ยม · พื้นผิวครบ", missing:0},
  {id:"m4a1", name:"M4A1", kind:"Assault Rifle", details:"5 meshes · 4,497 สามเหลี่ยม · ขาดพื้นผิว 1 รายการ", missing:1},
  {id:"aks74u", name:"AKS74U", kind:"SMG", details:"4 meshes · 4,982 สามเหลี่ยม · พื้นผิวครบ", missing:0},
  {id:"spas_15_pbsc2013_nonlogo", name:"SPAS-15 PBSC2013", kind:"Shotgun", details:"3 meshes · 2,310 สามเหลี่ยม · พื้นผิวครบ", missing:0},
  {id:"deserteagle_grs", name:"Desert Eagle GRS", kind:"Pistol", details:"3 meshes · 1,184 สามเหลี่ยม · พื้นผิวครบ", missing:0},
  {id:"870mcs_sl", name:"870MCS SL", kind:"Shotgun", details:"6 meshes · 1,532 สามเหลี่ยม · ยังไม่มีพื้นผิวที่อ่านได้ 2 รายการ", missing:2},
  {id:"karambit", name:"Karambit", kind:"Melee", details:"1 mesh · 1,758 สามเหลี่ยม · พื้นผิวครบ", missing:0},
  {id:"mp7", name:"MP7", kind:"SMG", details:"6 meshes · 2,964 สามเหลี่ยม · ขาดพื้นผิว 1 รายการ", missing:1},
  {id:"k_2", name:"K-2", kind:"Assault Rifle", details:"3 meshes · 1,831 สามเหลี่ยม · พื้นผิวครบ", missing:0},
  {id:"ak_47_boar_zombie", name:"AK-47 Boar Zombie", kind:"Assault Rifle", details:"11 meshes · 17,600 สามเหลี่ยม · พื้นผิวครบ", missing:0},
  {id:"aug_a3_esports", name:"AUG-A3 Esports", kind:"Assault Rifle", details:"4 meshes · 3,441 สามเหลี่ยม · พื้นผิวครบ", missing:0},
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
    badge.textContent = weapon.missing ? "3D / TEXTURE PENDING" : "3D VERIFIED";
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
$("start-training").addEventListener("click", () => {
  // Standalone playable FPS prototype: synthetic geometry and targets only.
  // The real Burning Hall map will be enabled after authorized assets are integrated.
  window.location.assign("/map3d/");
});
if (guest && guest.trim().length >= 2) showLobby(); else showLogin();
