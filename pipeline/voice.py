"""Narração pt-BR com Kokoro (voz pm_alex).

Uso: python -m pipeline.voice <roteiro.txt> <saida.wav>

Chama o kokoro_onnx direto porque `hyperframes tts` falha nesta máquina (o espeakng_loader do pacote procura o
phontab num caminho de CI inexistente): usa o espeak-ng do sistema e os modelos que o HyperFrames baixou em
~/.cache/hyperframes/tts. Roda com o python de ~/.venvs/shorts (scripts/setup_venv.sh); se o kokoro_onnx não estiver
no python atual, reexecuta lá.
"""
import os
import re
import sys
from pathlib import Path

MODELS = Path.home() / ".cache/hyperframes/tts"
VENV_PY = Path(os.environ.get("SHORTS_VENV", Path.home() / ".venvs/shorts")) / "bin/python"
ESPEAK_LIB, ESPEAK_DATA = "/usr/lib/libespeak-ng.so.1", "/usr/share/espeak-ng-data"

# what Kokoro would read wrong: numbers must be written out, symbols spelled, no links
_PROBLEMS = [
    (re.compile(r"\d"), "tem dígitos: escreva os números por extenso"),
    (re.compile(r"%"), "tem '%': escreva 'por cento'"),
    (re.compile(r"R\$"), "tem 'R$': escreva 'reais'"),
    (re.compile(r"&"), "tem '&': escreva 'e'"),
    (re.compile(r"/"), "tem '/': escreva a palavra (ou, por, barra)"),
    (re.compile(r"\+"), "tem '+': escreva 'mais'"),
    (re.compile(r"https?://|www\.|\.(com|br|io|org|net)\b", re.I), "tem um link: não leia endereços na narração"),
]


def check_text(text: str) -> list[str]:
    """Problemas do roteiro para a voz, em pt-BR (lista vazia = pode sintetizar)."""
    return [msg for rx, msg in _PROBLEMS if rx.search(text)]


def synth(text: str, out: Path, voice: str = "pm_alex") -> float:
    """Gera a narração em `out` (wav 24 kHz) e devolve a duração em segundos."""
    problems = check_text(text)
    if problems:
        raise ValueError("roteiro não pode ir para a voz: " + "; ".join(problems))
    import soundfile as sf
    from kokoro_onnx import EspeakConfig, Kokoro

    k = Kokoro(str(MODELS / "models/kokoro-v1.0.onnx"), str(MODELS / "voices/voices-v1.0.bin"),
               espeak_config=EspeakConfig(lib_path=ESPEAK_LIB, data_path=ESPEAK_DATA))
    audio, sr = k.create(text, voice=voice, speed=1.0, lang="pt-br")
    out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(out), audio, sr)
    return len(audio) / sr


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__.strip().splitlines()[2], file=sys.stderr)
        return 2
    try:
        import kokoro_onnx  # noqa: F401
    except ImportError:
        if VENV_PY.exists() and Path(sys.executable) != VENV_PY:
            os.execv(str(VENV_PY), [str(VENV_PY), "-m", "pipeline.voice", *argv])
        print("kokoro-onnx não instalado: rode scripts/setup_venv.sh", file=sys.stderr)
        return 1
    text = Path(argv[0]).read_text(encoding="utf-8").strip()
    try:
        dur = synth(text, Path(argv[1]))
    except ValueError as e:
        print(e, file=sys.stderr)
        return 1
    print(f"{argv[1]}: {dur:.2f} s")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
