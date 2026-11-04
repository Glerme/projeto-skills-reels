"""Legendas no estilo E: uma frase curta por vez, MAIÚSCULAS, branca, Archivo Black, contorno preto grosso, sem faixa
e sem destacar a palavra falada, centralizada com a base a 640 px do fundo (acima dos 20 % de baixo).

Uso: python -m pipeline.captions <words.json> <projeto>   (escreve <projeto>/compositions/captions.html)

Segue references/captions.md do HyperFrames: grupos com tempos das palavras, um grupo visível por vez, fitTextFontSize
(base 78, mínimo 42, maxWidth 900), hard kill no fim de cada grupo, o primeiro grupo começa >= 0,1 s.
"""
import html
import json
import re
import sys
from pathlib import Path

from pipeline.types import Group, Word

SENTENCE_END = re.compile(r"[.!?:…]$")
FINAL_PUNCT = re.compile(r"[\s.,!?;:…]+$")
HOLD = 0.4  # a group stays up this long after its last word (or until the next group starts)


def group(words: list[Word], max_words: int = 5, max_chars: int = 26, pause: float = 0.15) -> list[Group]:
    """Frases curtas para a tela: corta em fim de frase, pausa >= `pause`, `max_words` ou `max_chars`."""
    chunks: list[list[Word]] = []
    cur: list[Word] = []
    for w in words:
        if cur:
            chars = len(" ".join(x["text"] for x in cur + [w]))
            if len(cur) >= max_words or chars > max_chars or w["start"] - cur[-1]["end"] >= pause:
                chunks.append(cur)
                cur = []
        cur.append(w)
        if SENTENCE_END.search(w["text"]):
            chunks.append(cur)
            cur = []
    if cur:
        chunks.append(cur)
    out: list[Group] = []
    for i, c in enumerate(chunks):
        start = c[0]["start"] if i else max(0.1, c[0]["start"])
        start = max(start, out[-1]["end"] if out else 0.0)
        end = c[-1]["end"] + HOLD
        if i + 1 < len(chunks):
            end = min(end, chunks[i + 1][0]["start"])
        end = max(end, start + 0.1)
        text = FINAL_PUNCT.sub("", " ".join(x["text"] for x in c)).upper()
        out.append({"text": text, "start": round(start, 3), "end": round(end, 3)})
    # a group pushed later by the 0.1 s floor must not run into the next one
    for a, b in zip(out, out[1:]):
        a["end"] = min(a["end"], b["start"])
    return out


def _lines(text: str) -> list[str]:
    """one line up to 14 characters, else two lines split at the space nearest the middle"""
    if len(text) <= 14 or " " not in text:
        return [text]
    mid, spaces = len(text) / 2, [i for i, c in enumerate(text) if c == " "]
    k = min(spaces, key=lambda i: abs(i - mid))
    return [text[:k], text[k + 1:]]


TEMPLATE = """<template>
  <style>
    #root {{ position: absolute; inset: 0; }}
    #root .cap {{ position: absolute; left: 0; right: 0; bottom: 640px; text-align: center; overflow: visible; }}
    #root .cap span {{
      display: inline-block; font-family: "Archivo Black", sans-serif; font-weight: 400; line-height: 1.08;
      color: #ffffff; -webkit-text-stroke: 0.3em #000000; paint-order: stroke fill; letter-spacing: 0.01em;
    }}
  </style>
  <div id="root" data-composition-id="captions" data-width="1080" data-height="1920" data-layout-allow-overflow>
{groups}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    const fit = (t) => window.__hyperframes.fitTextFontSize(t, {{ fontFamily: "Archivo Black", fontWeight: 400, maxWidth: 900 }}).fontSize;
    document.querySelectorAll("#root .cap").forEach((g) => {{
      g.querySelector("span").style.fontSize = Math.max(42, Math.min(78, fit(g.dataset.longest))) + "px";
    }});
{sets}
    window.__timelines["captions"] = tl;
  </script>
</template>
"""


def render_html(groups: list[Group], out: Path) -> None:
    """Escreve a sub-composição de legendas (um clip por grupo)."""
    rows = []
    for i, g in enumerate(groups):
        lines = _lines(g["text"])
        body = "<br>".join(html.escape(x) for x in lines)
        rows.append(f'    <div id="cap-{i}" class="clip cap" data-start="{g["start"]}" data-duration="{round(g["end"] - g["start"], 3)}" '
                    f'data-longest="{html.escape(max(lines, key=len))}"><span>{body}</span></div>')
    # one show + one hard kill per group (an instant set on the inner span, never a tween on the .clip)
    sets = "\n".join(f'    tl.set("#cap-{i} span", {{ opacity: 1, visibility: "visible" }}, {g["start"]});\n'
                     f'    tl.set("#cap-{i} span", {{ opacity: 0, visibility: "hidden" }}, {g["end"]});' for i, g in enumerate(groups))
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(TEMPLATE.format(groups="\n".join(rows), sets=sets), encoding="utf-8")


def host_html(duration: float) -> str:
    """O host da sub-composição para o index.html (uma faixa de legendas no app)."""
    return (f'<div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" '
            f'data-start="0" data-duration="{duration}" data-track-index="2" data-track-kind="captions" '
            f'data-width="1080" data-height="1920"></div>')


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__.strip().splitlines()[3], file=sys.stderr)
        return 2
    words = json.loads(Path(argv[0]).read_text(encoding="utf-8"))
    groups = group(words)
    render_html(groups, Path(argv[1]) / "compositions/captions.html")
    print(f"{len(groups)} legendas")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
