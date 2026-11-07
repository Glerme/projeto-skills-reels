#!/usr/bin/env bash
# Runs one worker of the orchestrated mode: scripts/worker.sh <papel> videos/<slug> ["nota extra"]
# Prompt in skill/agentes/<papel>.md. Claude Opus does roteirista, Claude Haiku does revisor, Codex does the rest.
# Last message goes to videos/<slug>/agentes/<papel>.txt.
# WORKER_MODEL=opus runs any role on Claude Opus instead (AGENTS.md: when Codex misses the same point twice).
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
case ${WORKER_MODEL:+opus}$PAPEL in
  opus*) printf '%s' "$PROMPT" | claude -p --model claude-opus-5-5 --add-dir "$HOME/.claude/skills" \
    --allowedTools 'Read,Glob,Grep,Write,Edit,Bash' > "$OUT" ;;
  roteirista) printf '%s' "$PROMPT" | claude -p --model claude-opus-5-5 --add-dir "$HOME/.claude/skills" \
    --allowedTools 'Read,Glob,Grep,Write,Edit,WebSearch,WebFetch' > "$OUT" ;;
  revisor) printf '%s' "$PROMPT" | claude -p --model haiku --allowedTools 'Read,Bash(bash scripts/snap.sh:*),Bash(scripts/snap.sh:*)' > "$OUT" ;;
  *) codex exec -s workspace-write -c web_search='"live"' -o "$OUT" "$PROMPT" < /dev/null ;;
esac
cat "$OUT"
