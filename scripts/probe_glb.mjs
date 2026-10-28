// Diagnostic-only glTF probe. Output remains on the ephemeral Actions runner.
import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const [toolRoot, packRoot, outRoot, mapName = "", weaponsCsv = ""] = process.argv.slice(2);
if (!toolRoot || !packRoot || !outRoot) {
  console.error("usage: probe_glb.mjs TOOL_ROOT PACK_DIR OUT_DIR [MAP] [WEAPONS_CSV]");
  process.exit(2);
}
const absolute = (p) => path.resolve(p);
const info = { map: null, weapons: [], errors: [] };
const fileInfo = (p) => fs.existsSync(p) ? { exists: true, bytes: fs.statSync(p).size } : { exists: false };

try {
  const { exportVisual } = await import(pathToFileURL(path.join(absolute(toolRoot), "export-visual.mjs")).href);
  if (mapName) {
    const target = path.join(absolute(outRoot), "maps");
    const record = { name: mapName };
    try {
      const output = exportVisual(mapName, { packDir: absolute(packRoot), outRoot: target });
      record.summary = output.summary;
      record.glb = fileInfo(path.join(target, mapName.toLowerCase(), "visual.glb"));
      record.ok = output.summary?.check?.ok === true && record.glb.exists;
    } catch (error) {
      record.ok = false;
      record.error = String(error?.message || error).slice(0, 600);
    }
    info.map = record;
  }
} catch (error) {
  info.errors.push("Cannot import map exporter: " + String(error?.message || error).slice(0, 600));
}

try {
  const { exportWeapon } = await import(pathToFileURL(path.join(absolute(toolRoot), "export-model.mjs")).href);
  for (const name of weaponsCsv.split(",").filter(Boolean)) {
    const id = name.toLowerCase().replace(/^weapon_/, "").replace(/[^a-z0-9]+/g, "_");
    const record = { name, id };
    try {
      const output = exportWeapon({ pack: name, id, kind: "unknown", packDir: absolute(packRoot) },
        { outRoot: path.join(absolute(outRoot), "model"), maxTex: 512, log: () => {} });
      record.summary = { triangles: output.tris, meshes: output.meshes, textures: output.textures,
        missing_texture_count: output.missingTextures.length };
      record.glb = fileInfo(path.join(absolute(outRoot), "model", "weapons", "models", id + ".glb"));
      record.ok = record.glb.exists && record.summary.triangles > 0;
    } catch (error) {
      record.ok = false;
      record.error = String(error?.message || error).slice(0, 600);
    }
    info.weapons.push(record);
  }
} catch (error) {
  info.errors.push("Cannot import weapon exporter: " + String(error?.message || error).slice(0, 600));
}
console.log("PB_PROBE_JSON=" + JSON.stringify(info));
