#!/usr/bin/env bash
# Stills of a video project: scripts/snap.sh <dir> <t1,t2,...>. Prints the PNG paths.
set -euo pipefail
DIR=$(cd "$1" && pwd) AT=$2
HF=${HF:-node /home/gui/.claude/plugins/cache/hyperframes/hyperframes/0.9.9/skills/hyperframes/scripts/plugin-cli.mjs}
before=$(date +%s)
(cd "$DIR" && $HF snapshot --at "$AT" >&2)
find "$DIR/.hyperframes/artifacts/snapshots" -name '*.png' -newermt "@$before" | sort
