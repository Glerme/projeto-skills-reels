#!/usr/bin/env bash
# Python environment for the whole pipeline (voice, words, captions, sound, QA): ~/.venvs/shorts.
# Needs the system espeak-ng (pt-BR phonemes for Kokoro) and ffmpeg. Idempotent.
set -euo pipefail
V=${SHORTS_VENV:-$HOME/.venvs/shorts}
[ -x "$V/bin/python" ] || python3 -m venv "$V"
"$V/bin/pip" install -q kokoro-onnx soundfile numpy scipy pillow
command -v espeak-ng >/dev/null || echo "aviso: instale o espeak-ng (pacote do sistema)" >&2
echo "$V/bin/python"
