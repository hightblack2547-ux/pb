// Diagnostic-only reader for UI containers. Never exports or publishes visual assets.
// Runs in an ephemeral GitHub Actions worker.
import fs from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";

const [toolRoot, packDir, csv] = process.argv.slice(2);
if (!toolRoot || !packDir) { console.error("usage: node probe_ui.mjs TOOL_ROOT PACK_DIR [PACK_NAMES]"); process.exit(2); }
const files=(csv||"").split(",").filter(Boolean);
const result=[];
const trunc=(x,n=80)=>String(x||"").slice(0,n);
let parsePack,readGuiSets;
try{
  ({parsePack}=await import(pathToFileURL(path.resolve(toolRoot,"i3pack/unpack.mjs")).href));
  ({readGuiSets}=await import(pathToFileURL(path.resolve(toolRoot,"i3gui/i3gui.mjs")).href));
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
  const rec={pack:trunc(name),bytes:0,nodes:0,files:0,ui_scenes:0,controls:0,ui_names:[],extensions:{},texture_refs:0};
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
