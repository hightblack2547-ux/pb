#!/usr/bin/env python3
"""Private, limited Webport museum/gallery export from the owner's Portable RAR.
Outputs NO game code or online DB. Entire artifact gets encrypted in CI.
Do not confuse Portable model ids with PBCross game item ids.
"""
import json, pathlib, shutil, zipfile, sys
root=pathlib.Path("pb_work/glb_probe")
diag=json.loads(pathlib.Path("pb_cloud_result.json").read_text())
report=diag.get("steps",{}).get("glb_probe",{}).get("data",{})
if diag.get("errors"): raise RuntimeError("Export had errors")
if report.get("map",{}).get("ok") is not True: raise RuntimeError("Burning Hall GLB unavailable")
out=pathlib.Path("pb_private_export")
if out.exists(): shutil.rmtree(out)
a=out/"assets"
maproot=a/"maps"/"burninghall";maproot.mkdir(parents=True,exist_ok=True)
for f in ("visual.glb","collision.glb","collision.json"):
 src=root/"maps"/"burninghall"/f
 if not src.is_file() or src.stat().st_size==0: raise RuntimeError("Missing "+str(src))
 shutil.copyfile(src,maproot/f)
collision=json.loads((maproot/"collision.json").read_text())
num=len(collision.get("respawns",[]))
if not num: raise RuntimeError("No real spawn points")
maps=[{"id":"burninghall","pack":"BurningHall","mapId":None,"mapIdSource":None,"name":"Burning Hall (Portable)","nameEn":"Burning Hall","source":"Owner-provided Point Blank Portable V1.1 (not PBCross)","tris":report["map"].get("summary",{}).get("tris",0),"collisionTris":collision.get("tris",0),"bounds":collision.get("bounds",{}),"respawns":num,"teams":{"red":num//2,"blue":num-num//2},"respawnSource":"Converted original i3Pack","check":{"visual":True,"collisionGlb":True,"respawnsInside":f"{num}/{num}","collisionInsideVisual":True,"dMin":[0,0,0],"dMax":[0,0,0]}}]
(a/"maps"/"index.json").write_text(json.dumps(maps,ensure_ascii=False,indent=2))
wroot=a/"weapons"/"models";wroot.mkdir(parents=True,exist_ok=True)
weapons=[]
for gun in report.get("weapons",[]):
 if not gun.get("ok"):continue
 name,id=gun["name"],gun["id"]
 if not id.replace("_","").isalnum():continue
 src=root/"model"/"weapons"/"models"/(id+".glb")
 if not src.is_file():continue
 shutil.copyfile(src,wroot/(id+".glb"))
 weapons.append({"id":id,"file":id+".glb","kind":"Portable preview only","name":name.removeprefix("Weapon_").replace("_"," "),"itemIds":[]})
if not weapons:raise RuntimeError("No actual weapon models")
(wroot/"index.json").write_text(json.dumps({"weapons":weapons,"note":"Converted Portable models, no PBCross item id mapping verified"},indent=2))
croot=a/"chars";croot.mkdir(parents=True,exist_ok=True);chars=[]
for ch in report.get("characters",[]):
 if not ch.get("ok"):continue
 id=ch["id"];src=root/"model"/"chars"/id
 if not (src/"model.glb").exists():continue
 (croot/id).mkdir()
 shutil.copyfile(src/"model.glb",croot/id/"model.glb")
 arm=src/"arms_1pv.glb"
 if arm.is_file():shutil.copyfile(arm,croot/id/"arms_1pv.glb")
 chars.append({"name":id,"team":"red" if "rebel" in id else "blue","family":"male","model":id+"/model.glb","arms1pv":{"model":id+"/arms_1pv.glb"} if arm.exists() else None,"itemId":None,"clipsFrom":None})
(croot/"index.json").write_text(json.dumps({"chars":chars,"note":"Portable model GLBs; no confirmed compatible PBCross animations or rig"},indent=2))
(out/"PRIVATE-README.txt").write_text("""PERSONAL USE ONLY. Original Point Blank art remains owned by Zepetto.
This archive contains converted BurningHall (visual/collision/spawn), selected
Portable weapon models and one Portable character model. Import at /play/
or /collection/ in a browser you control. Not for public deployment/reposting.
This is NOT the complete PBCross asset set or a multiplayer server.
The /collection/ viewer can show these real models.
Full battle may still fail due to missing Cross items, UI, sounds, AI and
animation assets; do not claim compatibility until actually tested.
""")
target=pathlib.Path("private_pb_bundle.zip")
with zipfile.ZipFile(target,"w",zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for f in sorted(out.rglob("*")):
  if f.is_file():z.write(f,f.relative_to(out))
assert target.exists()
print("Converted private preview bundle bytes:",target.stat().st_size)
print("Map + models:",1,len(weapons),len(chars),"real spawns:",num)
