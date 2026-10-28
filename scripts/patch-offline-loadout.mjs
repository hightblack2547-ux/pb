#!/usr/bin/env node
// Change only the offline ?play test loadout of the temporary upstream checkout.
// Use the chosen, real weapon item id from the asset-driven Safari armory.
// No server inventory/auth changes; no placeholder gun is invented.
import fs from "node:fs";
const target=process.argv[2]||"webport/src/game/testLoadout.ts";
let s=fs.readFileSync(target,"utf8");
const anchor="export const TEST_EQUIPPED: RespawnLoadout = {";
if(!s.includes(anchor))throw Error("Upstream TEST_EQUIPPED changed: cannot safely patch");
if(s.includes("pbChosenWeapon(")){console.log("Offline weapon patch already present");process.exit(0)}
const helper=`/** Browser-only selected item, chosen in /collection/ (not the account server). */
function pbChosenWeapon(fallback: number, slot: number): number {
  try {
    if(typeof localStorage === "undefined") return fallback;
    const value = JSON.parse(localStorage.getItem("pb-webport-v8-weapon") || "null") as { id?: number } | null;
    const id = Number(value?.id);
    if(!Number.isSafeInteger(id) || id <= 0 || Math.floor(id / 100000) !== slot) return fallback;
    return id;
  }catch{return fallback}
}

`;
s=s.replace(anchor,helper+anchor);
const slots={primary:1,secondary:2,melee:3,grenade:4,special:5};
for(const [slot,num] of Object.entries(slots)){
 const old=`${slot}: TEST_WEAPONS.${slot}[0].id,`;
 if(!s.includes(old))throw Error("Upstream default slot changed: "+slot);
 s=s.replace(old,`${slot}: pbChosenWeapon(TEST_WEAPONS.${slot}[0].id, ${num}),`);
}
const oldIds="const ids = Object.values(TEST_WEAPONS).flatMap((l) => l.map((w) => w.id));";
if(!s.includes(oldIds))throw Error("Upstream testInventory changed");
s=s.replace(oldIds,`const ids = [...new Set([...Object.values(TEST_WEAPONS).flatMap((l) => l.map((w) => w.id)), ...Object.values(TEST_EQUIPPED).filter((id) => id > 0)])];`);
fs.writeFileSync(target,s);
console.log("Patched upstream offline loadout to honor locally selected armory item, when that item ID is in the compatible export");
