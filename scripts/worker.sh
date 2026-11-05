#!/usr/bin/env bash
# Runs one worker of the orchestrated mode: scripts/worker.sh <papel> videos/<slug> ["nota extra"]
# Prompt in skill/agentes/<papel>.md. Codex does roteirista/diretor/corretor; Claude Haiku does revisor.
# Last message goes to videos/<slug>/agentes/<papel>.txt.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
PAPEL=$1 DIR=${2%/} NOTA=${3:-}
TPL="$ROOT/skill/agentes/$PAPEL.md"
[ -f "$TPL" ] || { echo "papel desconhecido: $PAPEL (veja skill/agentes/)" >&2; exit 2; }
mkdir -p "$ROOT/$DIR/agentes"
OUT="$ROOT/$DIR/agentes/$PAPEL.txt"
PROMPT="$(sed "s|{dir}|$DIR|g" "$TPL")

Nota: $NOTA"
cd "$ROOT"
case $PAPEL in
  revisor) printf '%s' "$PROMPT" | claude -p --model haiku --allowedTools 'Read,Bash(bash scripts/snap.sh:*),Bash(scripts/snap.sh:*)' > "$OUT" ;;
  *) codex exec -s workspace-write -c web_search='"live"' -o "$OUT" "$PROMPT" < /dev/null ;;
esac
cat "$OUT"
