#!/usr/bin/env python3
"""Read only metadata from a Point Blank Biah i3Pack. No asset files are emitted."""
import json, struct, sys
from pathlib import Path

def rotate(a, n):
    return bytes(((a[i] >> n) | (a[(i-1) % len(a)] << (8-n))) & 255 for i in range(len(a)))
def inspect(path):
    b = Path(path).read_bytes()
    magic = b[:4].decode("latin1")
    if magic not in ("Biah", "I3R2", "AVIX"):
        raise ValueError("Unknown header")
    u32 = lambda i: struct.unpack_from("<I", b, i)[0]
    so, ss, count, to, ts = [u32(x) for x in (0x10,0x18,0x20,0x24,0x2c)]
    if count > 10000 or so + ss > len(b) or to + count * 28 > len(b):
        raise ValueError("Invalid table bounds")
    nodes = []
    for k in range(count):
        _, ident, _, off, _, size, _ = struct.unpack_from("<7I", b, to + k*28)
        if off+size > len(b) or not size:
            raise ValueError("Invalid node bounds")
        length = b[off]
        name = b[off+1:off+1+length].decode("latin1", "replace")
        p = off + 1 + length + 0x4c
        while p+4 <= off+size and u32(p) <= count:
            p += 4
        if p+8 > off+size: raise ValueError("Missing file index")
        v = rotate(b[p:p+8],3)
        version = v[:4].decode("latin1")
        num = struct.unpack_from("<I", v, 4)[0] if version in ("PFN2","PFN3") else 0
        if num > 10000 or p+8+num*92 > len(b): raise ValueError("Bad entry count")
        entries = []
        if version == "PFN2":
            for j in range(num):
                raw = rotate(b[p+8+j*92:p+8+(j+1)*92],2)
                nm = raw[:64].split(b"\0")[0].decode("latin1","replace")
                size2 = (struct.unpack_from("<H",raw,0x4a)[0]<<16) | struct.unpack_from("<H",raw,0x46)[0]
                off2 = (struct.unpack_from("<H",raw,0x48)[0]<<16) | struct.unpack_from("<H",raw,0x50)[0]
                if off2+size2 > len(b): raise ValueError("Bad file bounds")
                entries.append({"name":nm, "bytes":size2, "magic":b[off2:off2+4].decode("latin1","replace")})
        nodes.append({"name":name,"index_type":version,"file_count":num,"files":entries[:10]})
    return {"magic": magic, "total_bytes": len(b), "nodes": nodes}
if __name__ == "__main__":
    print(json.dumps(inspect(sys.argv[1]),ensure_ascii=False,indent=2))
