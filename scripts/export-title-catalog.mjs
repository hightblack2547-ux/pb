#!/usr/bin/env node
// Build an inventory of non-art title rule metadata from the MIT Webport source.
// This is for an OFFLINE UI preview, never authoritative account progression.
import fs from "node:fs";
import path from "node:path";
const source=path.resolve(process.argv[2]||"webport/src/lobby/core/titleData.ts");
const target=path.resolve(process.argv[3]||"webport/dist/collection/title-catalog.json");
const text=fs.readFileSync(source,"utf8");
const titles=[];
const regex=/\{\s*id:\s*(\d+),\s*set:\s*(\d+),[^{}]*?classId:\s*(\d+),\s*ribbon:\s*(\d+),\s*ensign:\s*(\d+),\s*medal:\s*(\d+),\s*master:\s*(\d+),\s*rank:\s*(\d+),\s*slot:\s*(\d+),\s*req1:\s*(\d+),\s*req2:\s*(\d+)\s*\}/g;
for(const m of text.matchAll(regex)){
 const [id,set,classId,ribbon,ensign,medal,master,rank,slot,req1,req2]=m.slice(1).map(Number);
 titles.push({id,set,classId,ribbon,ensign,medal,master,rank,slot,req1,req2});
}
if(titles.length<10)throw Error("Upstream title table changed; refusing to create a fake title catalog");
const seen=new Set(titles.map(t=>t.id));if(seen.size!==titles.length)throw Error("Duplicate title IDs");
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,JSON.stringify({source:"LeandroDettmer/point-blank-webport/src/lobby/core/titleData.ts",note:"Rule metadata only, local offline preview; not an authenticated PB account",titles},null,2));
console.log("Title metadata: "+titles.length+" entries");
