"""Tempo de cada palavra da narração, com o texto do roteiro.

Uso: python -m pipeline.words <voz.wav> <roteiro.txt> <words.json>

O Whisper escreve números como dígitos ("setenta e quatro" -> "74"), junta e separa palavras e inventa frases no
silêncio. A legenda usa sempre o texto do roteiro: `align` casa as palavras do roteiro com as ouvidas e reparte os
tempos; `drop_silent_tail` tira o que o Whisper "ouviu" no silêncio final.
"""
import difflib
import json
import re
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path

from pipeline.types import Word

HF = ["node", "/home/gui/.claude/plugins/cache/hyperframes/hyperframes/0.9.9/skills/hyperframes/scripts/plugin-cli.mjs"]
MIN_DUR = 0.02  # every word lasts at least this long, so times stay strictly ordered


def _norm(w: str) -> str:
    s = unicodedata.normalize("NFD", w.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^\w]", "", s)


def transcribe(wav: Path) -> list[Word]:
    """Palavras ouvidas com tempo (Whisper small, pt). Nunca use modelo .en: ele traduz para inglês."""
    with tempfile.TemporaryDirectory() as d:
        r = subprocess.run([*HF, "transcribe", str(wav.resolve()), "--model", "small", "--language", "pt",
                            "--engine", "whisper", "--json"], cwd=d, capture_output=True, text=True)
        if r.returncode != 0:
            raise RuntimeError("transcrição falhou: " + (r.stderr.strip().splitlines() or ["?"])[-1])
        info = json.loads(r.stdout)
        words = json.loads(Path(info["transcriptPath"]).read_text(encoding="utf-8"))
    return [{"id": f"h{i}", "text": w["text"], "start": float(w["start"]), "end": float(w["end"])} for i, w in enumerate(words)]


def _spread(texts: list[str], t0: float, t1: float) -> list[tuple[float, float]]:
    """split [t0, t1] among words proportionally to their character counts"""
    lens = [max(1, len(_norm(t))) for t in texts]
    tot, acc, out = sum(lens), 0, []
    for n in lens:
        a = t0 + (t1 - t0) * acc / tot
        acc += n
        out.append((a, t0 + (t1 - t0) * acc / tot))
    return out


def align(script: str, heard: list[Word]) -> list[Word]:
    """Palavras do roteiro (texto do roteiro) com os tempos das palavras ouvidas correspondentes."""
    sw = script.split()
    hn = [_norm(h["text"]) for h in heard]
    times: list[tuple[float, float] | None] = [None] * len(sw)
    sm = difflib.SequenceMatcher(None, [_norm(w) for w in sw], hn, autojunk=False)
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            for k in range(i2 - i1):
                times[i1 + k] = (heard[j1 + k]["start"], heard[j1 + k]["end"])
        elif op == "replace":
            times[i1:i2] = _spread(sw[i1:i2], heard[j1]["start"], heard[j2 - 1]["end"])
        # "delete" (script words nobody heard) is filled below from the gap; "insert" (heard extras) is dropped
    out: list[Word] = []
    i = 0
    while i < len(sw):
        if times[i] is not None:
            i += 1
            continue
        j = i
        while j < len(sw) and times[j] is None:
            j += 1
        t0 = times[i - 1][1] if i > 0 else (heard[0]["start"] if heard else 0.0)
        t1 = times[j][0] if j < len(sw) else (heard[-1]["end"] if heard else t0)
        t1 = max(t1, t0 + MIN_DUR * (j - i))
        times[i:j] = _spread(sw[i:j], t0, t1)
        i = j
    prev = 0.0
    for k, (w, (a, b)) in enumerate(zip(sw, times)):
        a = max(a, prev)
        b = max(b, a + MIN_DUR)
        out.append({"id": f"w{k}", "text": w, "start": round(a, 3), "end": round(b, 3)})
        prev = a
    return out


def drop_silent_tail(words: list[Word], wav: Path) -> list[Word]:
    """Tira palavras que começam dentro do silêncio final (o Whisper inventa 'Obrigado.' ali)."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(wav), "-af", "silencedetect=noise=-35dB:d=0.6",
                        "-f", "null", "-"], capture_output=True, text=True)
    starts = [float(m) for m in re.findall(r"silence_start: ([\d.]+)", r.stderr)]
    ends = re.findall(r"silence_end: ([\d.]+)", r.stderr)
    if not starts or len(ends) >= len(starts):  # no silence running to the end of the file
        return words
    tail = starts[-1]
    return [w for w in words if w["start"] < tail]


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print(__doc__.strip().splitlines()[2], file=sys.stderr)
        return 2
    wav, script, out = Path(argv[0]), Path(argv[1]).read_text(encoding="utf-8"), Path(argv[2])
    words = align(script, drop_silent_tail(transcribe(wav), wav))
    out.write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{out}: {len(words)} palavras, até {words[-1]['end']:.2f} s" if words else f"{out}: vazio")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
