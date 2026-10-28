#!/usr/bin/env node
// Non-invasive iPhone touch bridge for LeandroDettmer's MIT-licensed Webport.
// The upstream Input class intentionally requires mouse pointer lock.
// Safari iOS touch does not offer the same desktop pointer-lock experience.
// Only relax that getter when the offline /game/ touch controller is enabled.
import fs from "node:fs";
import path from "node:path";
const file=path.resolve(process.argv[2]||"webport/src/game/input.ts");
let src=fs.readFileSync(file,"utf8");
const from="return document.pointerLockElement === this.lockTarget;";
const to="return document.pointerLockElement === this.lockTarget || Boolean((window as Window & { __pbTouchEnabled?: boolean }).__pbTouchEnabled);";
if(src.includes(to)){console.log("Mobile patch already present");process.exit(0)}
if(src.split(from).length!==2)throw new Error("Upstream Input.locked changed: abort rather than apply wrong patch");
fs.writeFileSync(file,src.replace(from,to),"utf8");
console.log("Patched Webport offline touch input without changing weapons, map or gameplay rules");
