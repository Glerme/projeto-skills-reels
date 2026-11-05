#!/usr/bin/env bash
# Renders a video project end to end and checks it: scripts/render.sh videos/<slug>
# build the engine -> assemble (mix, captions, index.html) -> hyperframes check -> render final.mp4 -> QA.
# Stops at the first failure. Needs video.json, words.json and assets/voice.wav in the project.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
DIR=$(cd "$1" && pwd)
PY=${SHORTS_PY:-$HOME/.venvs/shorts/bin/python}
HF=(node /home/gui/.claude/plugins/cache/hyperframes/hyperframes/0.9.9/skills/hyperframes/scripts/plugin-cli.mjs)
cd "$ROOT"
npm run -s build >/dev/null
npm run -s validate:build >/dev/null
"$PY" -m pipeline.assemble "$DIR"
cd "$DIR"
"${HF[@]}" check --json > check.json 2>/dev/null || true
"$PY" - check.json <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
errs = [f"{k}: {f['code']} {f['message'][:160]}" for k in ("lint", "runtime", "layout", "audio") for f in d.get(k, {}).get("findings", []) if f.get("severity") == "error"]
if errs:
    print("hyperframes check falhou:\n" + "\n".join(errs), file=sys.stderr); sys.exit(1)
print("hyperframes check: ok")
PY
"${HF[@]}" render --quality delivery --output "$DIR/final.mp4"
cd "$ROOT"
"$PY" -m pipeline.qa "$DIR"
echo "$DIR/final.mp4"
