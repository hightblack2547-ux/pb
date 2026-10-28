#!/usr/bin/env node
// Package the actual MIT Webport browser client into /game/, while keeping
// its existing root-relative /bundle paths intact. No original PB art is copied.
import fs from "node:fs";
import path from "node:path";
const dist=path.resolve(process.argv[2]||"webport/dist");
const original=path.join(dist,"index.html");
let html=fs.readFileSync(original,"utf8");
const tag='<script defer src="/pb-touch.js"></script>';
if(!html.includes(tag)) {
  if(!html.includes("</head>"))throw new Error("Upstream built index.html has no closing head");
  html=html.replace("</head>",tag+"\n</head>");
}
fs.mkdirSync(path.join(dist,"game"),{recursive:true});
fs.mkdirSync(path.join(dist,"play"),{recursive:true});
fs.writeFileSync(path.join(dist,"game/index.html"),html);
fs.copyFileSync("web-ui/real-game/pb-touch.js",path.join(dist,"pb-touch.js"));
fs.copyFileSync("web-ui/real-game/index.html",path.join(dist,"play/index.html"));
console.log("Packaged actual Webport game at /game/ and licensed-asset gate at /play/");
