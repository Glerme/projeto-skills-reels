# Copy a GLB, renaming its external texture uri: retex.py <src.glb> <dst.glb> <old uri> <new uri>
import json, struct, sys
src, dst, old, new = sys.argv[1:]
b = open(src, "rb").read()
n = struct.unpack("<I", b[12:16])[0]
j = json.loads(b[20:20 + n])
hits = [i for i in j.get("images", []) if i.get("uri") == old]
assert hits, f"{src}: no image with uri {old}"
for i in hits: i["uri"] = new
js = json.dumps(j, separators=(",", ":")).encode()
js += b" " * (-len(js) % 4)
rest = b[20 + n:]
out = b[:8] + struct.pack("<I", 12 + 8 + len(js) + len(rest)) + struct.pack("<I", len(js)) + b"JSON" + js + rest
open(dst, "wb").write(out)
# self-check: round-trip parses and points at the new uri
m = struct.unpack("<I", out[12:16])[0]
assert json.loads(out[20:20 + m]) == j and all(i["uri"] == new for i in hits)
assert struct.unpack("<I", out[8:12])[0] == len(out)
