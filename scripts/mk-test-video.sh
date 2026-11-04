#!/usr/bin/env bash
# Test project from a spec: scripts/mk-test-video.sh <spec.json> <dir>. Fills template/index.html (empty captions
# and badge), copies lib/engine.js (run `npm run build` first), links the Kenney kit, writes silent assets/mix.wav.
set -euo pipefail
SPEC=$1 DIR=$2 ROOT=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$DIR/lib" "$DIR/assets"
cp "$ROOT/lib/engine.js" "$DIR/lib/engine.js"
cp "$ROOT/template/hyperframes.json" "$DIR/"
ln -sfn "$ROOT/kit/kenney" "$DIR/assets/kenney"
DUR=$(python3 -I - "$ROOT/template/index.html" "$SPEC" "$DIR/index.html" <<'PY'
import json, sys
tpl, spec_p, out = sys.argv[1:]
spec = json.load(open(spec_p))
html = (open(tpl).read().replace("{{SPEC}}", json.dumps(spec, ensure_ascii=False).replace("</", "<\\/"))
        .replace("{{DURATION}}", str(spec["duration"])).replace("{{CAPTIONS_HOST}}", "").replace("{{FICTION_BADGE}}", ""))
open(out, "w").write(html)
print(spec["duration"])
PY
)
ffmpeg -loglevel error -y -f lavfi -i anullsrc=r=48000:cl=stereo -t "$DUR" "$DIR/assets/mix.wav"
echo "$DIR"
