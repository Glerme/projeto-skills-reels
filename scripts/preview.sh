#!/usr/bin/env bash
# Stills of a video.json without voice or captions: scripts/preview.sh <video.json> <out-dir> <t1,t2,...>
# Resolves the cast from the kit, builds a test project and tiles the stills into <out-dir>/sheet.jpg.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd) SPEC=$1 OUT=$2 AT=$3
mkdir -p "$OUT"
(cd "$ROOT" && npm run -s build >/dev/null)
(cd "$ROOT" && "${SHORTS_PY:-$HOME/.venvs/shorts/bin/python}" -c "
import json, sys; sys.path.insert(0, '.')
from pipeline.assemble import resolve_cast
json.dump(resolve_cast(json.load(open(sys.argv[1]))), open(sys.argv[2], 'w'), ensure_ascii=False)" "$SPEC" "$OUT/spec.json")
bash "$ROOT/scripts/mk-test-video.sh" "$OUT/spec.json" "$OUT/proj" >/dev/null
SNAP=$(dirname "$(bash "$ROOT/scripts/snap.sh" "$OUT/proj" "$AT" | head -1)")
ffmpeg -loglevel error -y -pattern_type glob -i "$SNAP/frame-*.png" -vf "scale=270:480,tile=6x4:padding=4" -frames:v 1 "$OUT/sheet.jpg"
echo "$OUT/sheet.jpg"
