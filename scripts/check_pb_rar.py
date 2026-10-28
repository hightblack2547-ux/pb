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

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        result["errors"].append(str(e))
        save()
        print("FAILED:", e, file=sys.stderr)
        sys.exit(1)
    save()
