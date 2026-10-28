// Diagnostic-only reader for UI containers. Never exports or publishes visual assets.
// Runs in an ephemeral GitHub Actions worker.
import fs from "node:fs";
import {createHash} from "node:crypto";
import path from "node:path";
import {pathToFileURL} from "node:url";

const [toolRoot, packDir, csv] = process.argv.slice(2);
if (!toolRoot || !packDir) { console.error("usage: node probe_ui.mjs TOOL_ROOT PACK_DIR [PACK_NAMES]"); process.exit(2); }
const files=(csv||"").split(",").filter(Boolean);
const result=[];
const trunc=(x,n=80)=>String(x||"").slice(0,n);
let parsePack,decodeContent,readGuiSets,parseScene,readI3IB,decodeI3IB,encodePNG;
try{
  ({parsePack,decodeContent}=await import(pathToFileURL(path.resolve(toolRoot,"i3pack/unpack.mjs")).href));
  ({readGuiSets}=await import(pathToFileURL(path.resolve(toolRoot,"i3gui/i3gui.mjs")).href));
  ({parseScene}=await import(pathToFileURL(path.resolve(toolRoot,"ui-export/lib.mjs")).href));
  ({readI3IB,decodeI3IB,encodePNG}=await import(pathToFileURL(path.resolve(toolRoot,"i3r2/skin-glb.mjs")).href));
}catch(error){
  console.log("PB_UI_JSON="+JSON.stringify({error:trunc(error?.message,400),packs:[]}));
  process.exit(0);
}
function flatten(n,acc){
  if(!n||acc.length>30000)return;
  acc.push({name:trunc(n.name),type:trunc(n.cls),width:n.w,height:n.h});
  for(const c of (n.children||[]))flatten(c,acc);
}
for(const name of files){
  const rec={pack:trunc(name),bytes:0,nodes:0,files:0,ui_scenes:0,controls:0,ui_names:[],extensions:{},texture_refs:0,ui_layouts:0,ui_layout_errors:0,layout_samples:[],ui_textures_ok:0,ui_textures_failed:0,ui_texture_samples:[]};
  try{
    const f=path.resolve(packDir,name);
    if(!f.startsWith(path.resolve(packDir)+path.sep))throw Error("unsafe UI pack path");
    const buf=fs.readFileSync(f);
    rec.bytes=buf.length;
    try{
      const tree=parsePack(buf);
      rec.nodes=tree.nodes.length;
      const names=[];
      for(const node of tree.nodes){
        for(const e of node.files){
          rec.files++;
          const ext=path.extname(e.name).toLowerCase()||"(none)";
          rec.extensions[ext]=(rec.extensions[ext]||0)+1;
          if(names.length<50 && /(ui|login|lobby|room|ready|inventory|weapon|shop|start|menu)/i.test(e.name))names.push(trunc(e.name));
        }
      }
      rec.ui_names=names;
      const found=[];
      for(const node of tree.nodes){
        for(const e of node.files){
          if(!/\.i3UIs$/i.test(e.name))continue;
          if(!Number.isSafeInteger(e.offset)||!Number.isSafeInteger(e.size)||
              e.offset<0||e.size<100||e.offset+e.size>buf.length) {
            rec.ui_layout_errors++; continue;
          }
          try {
            let data=buf.subarray(e.offset,e.offset+e.size);
            if(e.attr && (e.attr & 0x08000000)) data=decodeContent(data,e.attr);
            if(!data)throw Error("cannot decode UI data");
            const scene=parseScene(data);
            rec.ui_layouts++;
            const relevant=/(login|main|lobby|ready|room|shop|inven|weapon|hud|loading|result|select|menu)/i.test(e.name);
            if(relevant && found.length<70)found.push({
              file:trunc(e.name,105), scene:trunc(scene.name,70), design:scene.design,
              controls:scene.controls.length, script:trunc(scene.script,90),
              first_controls:scene.controls.slice(0,5).map(c=>({
                name:trunc(c.name),type:trunc(c.cls),x:c.x,y:c.y,w:c.w,h:c.h
              }))
            });
          }catch(err){ rec.ui_layout_errors++; if(!rec.first_layout_error)rec.first_layout_error=trunc(err.message,240); }
        }
      }
      rec.layout_samples=found.slice(0,36);
      for(const node of tree.nodes) {
        for(const e of node.files) {
          if(!/\.i3i$/i.test(e.name) || rec.ui_textures_ok+rec.ui_textures_failed>=10)continue;
          if(e.offset<0||e.size<64||e.offset+e.size>buf.length)continue;
          try{
            let data=buf.subarray(e.offset,e.offset+e.size);
            if(e.attr&&(e.attr&0x08000000)) data=decodeContent(data,e.attr);
            if(!data)throw Error("texture decryption unsupported");
            let at=0;
            if(data.toString("latin1",0,4)!=="I3IB"){
              at=data.indexOf("I3IB");
              if(at<0 || at>512)throw Error("no I3IB header");
            }
            const tex=readI3IB(data,at,data.length);
            if(!tex||tex.kind==="unsupported"||tex.w*tex.h>4000000)throw Error("unsupported image");
            const rgba=decodeI3IB(data,tex);
            const png=encodePNG(rgba,tex.w,tex.h,true);
            rec.ui_textures_ok++;
            rec.ui_texture_samples.push({
              name:trunc(e.name,70),width:tex.w,height:tex.h,
              kind:tex.kind,png_bytes:png.length,
              png_sha256:createHash("sha256").update(png).digest("hex").slice(0,24)
            });
          }catch(err){
            rec.ui_textures_failed++;
            if(!rec.first_texture_error)rec.first_texture_error=trunc(err.message,200);
          }
        }
      }
    }catch(e){rec.parse_error=trunc(e.message,300);}
    try{
      const sets=readGuiSets(buf);
      rec.ui_scenes=sets.length;
      const controls=[];
      const names=[];
      const textures=new Set();
      for(const set of sets){
        const flat=[];
        for(const root of set.roots||[])flatten(root,flat);
        controls.push(...flat);
        for(const n of flat)if(names.length<55 && n.name)names.push(n.name);
        for(const ref of Object.values(set.textures||{}))if(ref)textures.add(String(ref));
      }
      rec.controls=controls.length;
      rec.ui_names=[...new Set([...rec.ui_names,...names])].slice(0,75);
      rec.texture_refs=textures.size;
      rec.texture_names=[...textures].slice(0,30).map(x=>trunc(x,110));
    }catch(e){rec.gui_error=trunc(e.message,300);}
  }catch(e){rec.error=trunc(e.message,300);}
  result.push(rec);
}
console.log("PB_UI_JSON="+JSON.stringify({packs:result}));
