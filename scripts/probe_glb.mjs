// Diagnostic-only glTF probe. Output remains on the ephemeral Actions runner.
import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const [toolRoot, packRoot, outRoot, mapName = "", weaponsCsv = "", charactersCsv = ""] = process.argv.slice(2);
if (!toolRoot || !packRoot || !outRoot) {
  console.error("usage: probe_glb.mjs TOOL_ROOT PACK_DIR OUT_DIR [MAP] [WEAPONS_CSV]");
  process.exit(2);
}
const absolute = (p) => path.resolve(p);
const info = { map: null, weapons: [], characters: [], errors: [] };
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

try {
  const { exportChara } = await import(pathToFileURL(path.join(absolute(toolRoot), "export-model.mjs")).href);
  for (const name of charactersCsv.split(",").filter(Boolean)) {
    // Diagnostics only: suppress animation loading until a client animation
    // directory can be identified independently and its format verified.
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const record = { name, id, animations_tested: false };
    try {
      const output = exportChara(
        { name, team: "unknown", id, packDir: absolute(packRoot), animDir: null },
        { outRoot: path.join(absolute(outRoot), "model"), maxTex: 512, log: () => {} }
      );
      record.summary = { bones: output.bones, triangles: output.tris,
        textures: output.textures, clips: output.clips?.length ?? 0,
        keyed_geometries_skipped: output.keyedGeometriesSkipped,
        missing_texture_count: output.missingTextures?.length ?? 0 };
      record.glb = fileInfo(path.join(absolute(outRoot), "model", "chars", id, "model.glb"));
      record.arms_1pv = fileInfo(path.join(absolute(outRoot), "model", "chars", id, "arms_1pv.glb"));
      record.ok = record.glb.exists && output.tris > 0 && output.bones > 0;
    } catch (error) {
      record.ok = false;
      record.error = String(error?.message || error).slice(0, 800);
    }
    info.characters.push(record);
  }
} catch (error) {
  info.errors.push("Cannot import character exporter: " + String(error?.message || error).slice(0, 700));
}

console.log("PB_PROBE_JSON=" + JSON.stringify(info));
