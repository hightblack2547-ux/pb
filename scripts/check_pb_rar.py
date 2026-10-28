import hashlib
import json
import os
import pathlib
import re
import subprocess
import sys

FILE_ID = os.environ.get("PB_DRIVE_FILE_ID", "").strip()
if not re.fullmatch(r"[a-zA-Z0-9_-]{15,128}", FILE_ID):
    raise ValueError("Valid PB_DRIVE_FILE_ID is required")
EXPECTED_BYTES = 5043997994
ROOT = pathlib.Path("pb_work")
ROOT.mkdir(exist_ok=True)
RAR = ROOT / "Point-Blank-Portable-V1.1.rar"
REPORT = pathlib.Path("pb_cloud_result.json")
result = {"expected_size": EXPECTED_BYTES, "steps": {}, "errors": []}

def save():
    REPORT.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")

def cmd(*args, cwd=None, timeout=1800):
    p = subprocess.run(args, cwd=cwd, capture_output=True, text=True, errors="replace", timeout=timeout)
    return p.returncode, (p.stdout or "") + (p.stderr or "")

def main():
    import gdown
    output = gdown.download(id=FILE_ID, output=str(RAR), quiet=False, resume=True)
    size = RAR.stat().st_size if RAR.exists() else 0
    result["steps"]["download"] = {"size": size, "complete": bool(output) and size == EXPECTED_BYTES}
    save()
    if size != EXPECTED_BYTES:
        raise RuntimeError(f"Incomplete download: expected {EXPECTED_BYTES}, got {size}")
    with RAR.open("rb") as f:
        if not f.read(8).startswith(b"Rar!\x1a\x07"):
            raise RuntimeError("Not a RAR archive")
    rc, listing = cmd("7z", "l", "-slt", str(RAR), timeout=600)
    if rc:
        raise RuntimeError("RAR index failed: " + listing[-1000:])
    entries = []
    for block in re.split(r"\n\s*\n", listing):
        fields = dict(line.split(" = ", 1) for line in block.splitlines() if " = " in line)
        if fields.get("Path") and fields.get("Size", "").isdigit():
            entries.append((fields["Path"], int(fields["Size"])))
    packs = [(name, size) for name, size in entries if name.lower().endswith(".i3pack")]
    result["steps"]["index"] = {"total_entries": len(entries), "packs": len(packs), "examples": [name for name, _ in packs[:20]]}
    save()
    if not packs:
        raise RuntimeError("No i3Pack files found")
    candidates = [x for x in packs if x[0].lower().endswith("weapon_gh5007_dayak.i3pack")]
    if not candidates:
        candidates = [x for x in packs if 0 < x[1] < 8000000]
    if not candidates:
        raise RuntimeError("No i3Pack under 8MB")
    name, expected = candidates[0]
    sample = ROOT / "sample.i3Pack"
    with sample.open("wb") as f:
        p = subprocess.run(["7z", "e", "-so", str(RAR), name], stdout=f, stderr=subprocess.PIPE, timeout=300)
    if p.returncode != 0 or sample.stat().st_size != expected:
        raise RuntimeError("Sample extract failed")
    result["steps"]["sample"] = {"bytes": expected, "sha256": hashlib.sha256(sample.read_bytes()).hexdigest()}
    save()
    # Probe one map and up to three model packs, but keep raw assets on the
    # ephemeral runner only. GitHub receives JSON diagnostics, never game data.
    by_file = {pathlib.PurePosixPath(k).name.lower(): (k, n) for k, n in packs}
    selected = []
    map_name = ""
    for candidate in ("BurningHall", "Airport", "Metro", "NStation"):
        key = (candidate + ".i3pack").lower()
        if key in by_file:
            map_name = candidate
            selected.append(by_file[key])
            tex = by_file.get((candidate + "_Textures.i3Pack").lower())
            if tex:
                selected.append(tex)
            for suffix in ("_Col", "_Scene"):
                related = by_file.get((candidate + suffix + ".i3Pack").lower())
                if related:
                    selected.append(related)
            break
    preferred = ("Weapon_AK-47_PBIC2013", "Weapon_AK-47", "Weapon_Colt45",
                 "Weapon_AUG_A3", "Weapon_M4A1", "Weapon_Aks74u")
    weapon_names = []
    options = [by_file[(n + ".i3pack").lower()] for n in preferred
               if (n + ".i3pack").lower() in by_file]
    if not options:
        options = sorted([t for k, t in by_file.items()
                          if k.startswith("weapon_") and
                          300000 < t[1] < 12000000 and k.endswith(".i3pack")],
                         key=lambda t: t[1], reverse=True)[:8]
    for candidate_name, candidate_size in options:
        if len(weapon_names) >= 3:
            break
        base = pathlib.PurePosixPath(candidate_name).name
        if 100000 < candidate_size < 30000000 and base not in weapon_names:
            selected.append((candidate_name, candidate_size))
            weapon_names.append(base[:-7])
    # Look for character packs in this Portable release. The upstream
    # exporter expects Chara_<name>.i3Pack; do not assume Chara.i3Pack
    # contains the same independent rig format.
    character_entries = sorted(
        [(k, value[1]) for k, value in by_file.items() if k.startswith("chara")],
        key=lambda x: x[0]
    )
    result["steps"]["character_inventory"] = {
        "count": len(character_entries),
        "examples": [{"file": k, "bytes": n} for k, n in character_entries[:40]],
    }
    preferred_chars = ("Chara_SWAT_Male", "Chara_REBEL_Male", "Chara_SWAT_Female",
                       "Chara_REBEL_Female", "Chara_D-Fox")
    char_options = [by_file[(n + ".i3pack").lower()] for n in preferred_chars
                    if (n + ".i3pack").lower() in by_file]
    if not char_options:
        char_options = sorted(
            [value for key, value in by_file.items()
             if key.startswith("chara_") and key.endswith(".i3pack")
             and 100000 < value[1] < 45000000],
            key=lambda x: x[1], reverse=True
        )[:2]
    character_names = []
    for archive_name, archive_bytes in char_options:
        base = pathlib.PurePosixPath(archive_name).name
        if len(character_names) >= 2:
            break
        if (base.lower().startswith("chara_") and
                100000 < archive_bytes < 45000000 and
                re.fullmatch(r"[A-Za-z0-9_.-]+", base)):
            selected.append((archive_name, archive_bytes))
            character_names.append(base[6:-7])
    pack_dir = ROOT / "selected_packs"
    pack_dir.mkdir(exist_ok=True)
    records = []
    for archive_name, pack_size in selected:
        base = pathlib.PurePosixPath(archive_name).name
        if not re.fullmatch(r"[A-Za-z0-9_.-]+", base):
            records.append({"pack": base, "status": "rejected_unsafe_name"})
            continue
        if pack_size > 45000000:
            records.append({"pack": base, "status": "skipped_size", "bytes": pack_size})
            continue
        # The upstream model loader always opens a canonical .i3Pack suffix.
        # Portable archives sometimes use .i3pack; normalize on the runner.
        canonical = base[:-7] + ".i3Pack" if base.lower().endswith(".i3pack") else base
        target = pack_dir / canonical
        with target.open("wb") as f:
            process = subprocess.run(["7z", "e", "-so", str(RAR), archive_name],
                                     stdout=f, stderr=subprocess.PIPE, timeout=300)
        ok = process.returncode == 0 and target.stat().st_size == pack_size
        if not ok:
            target.unlink(missing_ok=True)
        elif target.suffix != ".i3Pack":
            target.rename(pack_dir / (target.stem + ".i3Pack"))
        records.append({"pack": base, "bytes": pack_size, "status": "extracted" if ok else "failed"})
    available = {x["pack"].lower() for x in records if x["status"] == "extracted"}
    if (map_name + ".i3Pack").lower() not in available:
        map_name = ""
    weapon_names = [name for name in weapon_names if (name + ".i3Pack").lower() in available]
    character_names = [name for name in character_names if
                       ("Chara_" + name + ".i3Pack").lower() in available]
    result["steps"]["probe_packs"] = {
        "map": map_name, "weapons": weapon_names,
        "characters": character_names, "packs": records
    }
    save()
    RAR.unlink()
    # Validate this client format separately from the upstream unpacker. This
    # reports metadata only; neither the original archive nor extracted assets
    # are uploaded as artifacts.
    rc, log = cmd("python3", "scripts/biah_metadata.py", str(sample.resolve()), timeout=60)
    if rc:
        raise RuntimeError("Biah metadata parse failed: " + log[-1200:])
    result["steps"]["biah_metadata"] = json.loads(log)
    save()
    tool = ROOT / "pb-extract-tools"
    rc, log = cmd("git", "clone", "--depth", "1", "https://github.com/LeandroDettmer/pb-extract-tools-public.git", str(tool), timeout=300)
    if rc:
        raise RuntimeError("Git clone failed: " + log[-500:])
    # The upstream unpacker checks for I3R2 or AVIX but Portable V1.1
    # uses a Biah wrapper with the same verified header/table layout.
    # Patch only a disposable clone in this diagnostic runner.
    unpack_js = tool / "i3pack" / "unpack.mjs"
    upstream = unpack_js.read_text(encoding="utf-8")
    magic_check = "magic !== 'I3R2' && magic !== 'AVIX'"
    if upstream.count(magic_check) != 1:
        raise RuntimeError("Unpacker guard changed upstream; refusing an unsafe patch")
    # Portable PFN2 tables can contain valid extended Latin-1 filenames.
    # Keep strict path safety: no slash, backslash, control characters,
    # '.' or '..', and do not relax the check for other client formats.
    filename_guard = r"&& /^[\x20-\x7e]+$/.test(f.name));"
    if upstream.count(filename_guard) != 1:
        raise RuntimeError("Unpacker filename check changed upstream")
    safe_biah_guard = r"""&& (d.toString('latin1', 0, 4) === 'Biah'
      ? (f.name.length > 0 && !/[\\/\x00-\x1f]/.test(f.name) && f.name !== '.' && f.name !== '..')
      : /^[\x20-\x7e]+$/.test(f.name)));"""
    unpack_js.write_text(
        upstream.replace(magic_check, magic_check + " && magic !== 'Biah'")
        .replace(filename_guard, safe_biah_guard),
        encoding="utf-8"
    )
    rc, log = cmd("npm", "install", "--no-audit", "--no-fund", cwd=tool, timeout=600)
    if rc:
        raise RuntimeError("npm install failed: " + log[-500:])
    out = ROOT / "unpacked"
    out.mkdir(exist_ok=True)
    rc, log = cmd("node", "pbx.mjs", "unpack", str(sample.resolve()), "--out", str(out.resolve()), cwd=tool, timeout=300)
    extracted = [str(p.relative_to(out)) for p in out.rglob("*") if p.is_file()]
    manifest_count = sum(1 for p in out.rglob("manifest.json"))
    result["steps"]["pbx_unpack"] = {
        "returncode": rc,
        "outputs": extracted[:40],
        "output_count": len(extracted),
        "manifest_count": manifest_count,
        "log_tail": log[-4000:],
        "status": "passed" if rc == 0 and len(extracted) > 1 else ("partial" if len(extracted) > 1 else "failed")
    }
    save()
    if rc != 0 or not manifest_count:
        raise RuntimeError("pbx unpack needs further Biah compatibility work; see pbx_unpack in JSON")
    if map_name or weapon_names or character_names:
        probe_script = pathlib.Path("scripts/probe_glb.mjs").resolve()
        rc, log = cmd("node", str(probe_script), str(tool.resolve()), str(pack_dir.resolve()),
                      str((ROOT / "glb_probe").resolve()), map_name, ",".join(weapon_names),
                      ",".join(character_names), timeout=420)
        marker = "PB_PROBE_JSON="
        try:
            probe = json.loads(log.rsplit(marker, 1)[1].splitlines()[0]) if marker in log else {}
        except (ValueError, IndexError):
            probe = {}
        attempted = (([probe["map"]] if probe.get("map") else []) +
                     probe.get("weapons", []) + probe.get("characters", []))
        probe_status = ("passed" if attempted and all(x.get("ok") for x in attempted)
                        and not probe.get("errors") and rc == 0 else "partial")
        result["steps"]["glb_probe"] = {"exit_code": rc, "status": probe_status,
                                         "data": probe,
                                         "log_tail": log[-1200:] if not probe else ""}
        save()
    if map_name and (pack_dir / (map_name + "_Col.i3Pack")).exists():
        out_root = (ROOT / "glb_probe" / "maps").resolve()
        rc, log = cmd("node", str((tool / "export-collision.mjs").resolve()),
                      map_name, "--pack-dir", str(pack_dir.resolve()), "--out", str(out_root),
                      timeout=420)
        col_json = out_root / map_name.lower() / "collision.json"
        col_glb = out_root / map_name.lower() / "collision.glb"
        col_summary = {}
        if col_json.exists():
            raw = json.loads(col_json.read_text(encoding="utf-8"))
            col_summary = {key: raw.get(key) for key in
                           ("meshes", "tris", "verts", "bounds", "spawnSuggestion", "spawnSource")}
            col_summary["respawn_count"] = len(raw.get("respawns", []))
        result["steps"]["collision_probe"] = {
            "exit_code": rc, "summary": col_summary,
            "glb_bytes": col_glb.stat().st_size if col_glb.exists() else 0,
            "log_tail": log[-1400:],
        }
        save()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        result["errors"].append(str(e))
        save()
        print("FAILED:", e, file=sys.stderr)
        sys.exit(1)
    save()
