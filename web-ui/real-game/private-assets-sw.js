/* Locally stored licensed Point Blank Cross exports.
   Only /assets/* is intercepted; no files are transmitted to GitHub/Netlify. */
"use strict";
const PRIVATE_CACHE="pb-private-user-assets-v1";
self.addEventListener("install",e=>e.waitUntil(self.skipWaiting()));
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",e=>{
  const req=e.request, url=new URL(req.url);
  if(url.origin!==self.location.origin||!url.pathname.startsWith("/assets/")||!["GET","HEAD"].includes(req.method))return;
  e.respondWith((async()=>{
    const cache=await caches.open(PRIVATE_CACHE);
    const key=new Request(url.origin+url.pathname,{method:"GET"});
    const result=await cache.match(key);
    if(!result)return fetch(req);
    if(req.method==="HEAD")return new Response(null,{status:200,headers:result.headers});
    return result;
  })());
});
