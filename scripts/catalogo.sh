#!/usr/bin/env bash
# Regenerate the kit contact sheets. Chrome runs only through snap.sh.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
npm run build
node_modules/.bin/esbuild engine/catalog-cli.ts --bundle --platform=node --format=esm --outfile=dist/catalogo.mjs
node dist/catalogo.mjs "$ROOT" > dist/catalogo-sheets.txt
mkdir -p docs/kit/catalogo
while IFS= read -r sheet; do
  dir="videos/_catalogo-$sheet"
  bash scripts/mk-test-video.sh "$dir/video.json" "$dir"
  python3 -I - "$dir" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
html = p / 'index.html'
html.write_text(html.read_text().replace('<!-- three.js stage', (p / 'catalog-script.html').read_text() + '\n<!-- three.js stage'))
PY
  count=0
  # One Chrome run per sheet: snap every time at once, then pick each frame by its time in the file name.
  rm -rf "$dir/.hyperframes/artifacts/snapshots"
  pngs=$(bash scripts/snap.sh "$dir" "$(cut -f2 "$dir/frames.tsv" | paste -sd,)")
  while IFS=$'\t' read -r index at name; do
    png=$(grep -E "frame-[0-9]+-at-${at}(\.0+)?s\.png$" <<< "$pngs" | head -1)
    test -f "$png" || { echo "catalogo: sem still em ${at}s para $name ($dir)" >&2; exit 1; }
    printf '%s' "$name" > "$dir/label.txt"
    tile=$(printf '%s/tile-%03d.jpg' "$dir" "$index")
    ffmpeg -loglevel error -y -i "$png" -vf "scale=360:640,pad=360:688:0:0:color=0xf4f1e8,drawtext=textfile=$dir/label.txt:expansion=none:fontcolor=0x202020:fontsize=22:x=(w-tw)/2:y=650" -frames:v 1 "$tile"
    count=$((count + 1))
  done < "$dir/frames.tsv"
  rows=$(((count + 3) / 4))
  ffmpeg -loglevel error -y -framerate 1 -i "$dir/tile-%03d.jpg" -vf "tile=4x$rows:nb_frames=$count:padding=12:margin=12:color=0xf4f1e8" -frames:v 1 "docs/kit/catalogo/$sheet.jpg"
done < dist/catalogo-sheets.txt
