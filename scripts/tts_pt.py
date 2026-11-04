# Narração pt-BR com Kokoro (voz padrão: pm_alex).
# Uso: python tts_pt.py "<texto>" saida.wav [voz]   (rode com o python de um venv que tenha: pip install kokoro-onnx soundfile)
# Chama o kokoro_onnx direto porque `hyperframes tts` falha nesta máquina: o espeakng_loader do pacote procura o
# phontab num caminho de CI inexistente. Usa o espeak-ng do sistema (pacote espeak-ng) e os modelos que o
# HyperFrames já baixou em ~/.cache/hyperframes/tts.
import os, sys
import soundfile as sf
from kokoro_onnx import Kokoro, EspeakConfig

M = os.path.expanduser("~/.cache/hyperframes/tts")
text, out = sys.argv[1], sys.argv[2]
voice = sys.argv[3] if len(sys.argv) > 3 else "pm_alex"
k = Kokoro(f"{M}/models/kokoro-v1.0.onnx", f"{M}/voices/voices-v1.0.bin",
           espeak_config=EspeakConfig(lib_path="/usr/lib/libespeak-ng.so.1", data_path="/usr/share/espeak-ng-data"))
audio, sr = k.create(text, voice=voice, speed=1.0, lang="pt-br")
sf.write(out, audio, sr)
print(f"{out}: {voice}, {len(audio) / sr:.1f} s")
