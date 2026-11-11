"""Monta o projeto HyperFrames de um vídeo.

Uso: python -m pipeline.assemble videos/<slug>   (ou --check videos/<slug>: só valida o video.json)

Entrada em videos/<slug>/: video.json (o elenco pode citar personagens do acervo pelo id), words.json e
assets/voice.wav. Saída na mesma pasta: index.html (template com o spec embutido, as legendas e o selo FICÇÃO quando
`fiction`), compositions/captions.html, assets/mix.wav (+ stems), lib/engine.js, hyperframes.json e o link
assets/kenney -> kit/kenney. Rode `npm run build` e `npm run validate:build` antes.
"""
import html as _html
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from pipeline import captions
from pipeline.audio.mix import mix

ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT / "kit/characters"
BADGE = ('<div id="fiction-badge" class="clip" data-start="0" data-duration="{dur}" data-track-index="3" '
         'style="position:absolute;top:120px;right:80px;font-family:\'Archivo Black\',sans-serif;font-size:34px;'
         'color:#ffffff;-webkit-text-stroke:0.3em #000000;paint-order:stroke fill;letter-spacing:0.04em;">FICÇÃO</div>')
# on-screen text of the "você inventa" format: day tag at the top, yellow term, white number card
OVERLAY_STYLE = {
    "dia": "top:250px;font-size:46px;color:#ffffff;background:#1f2a44;padding:14px 38px;border-radius:44px;",
    "termo": "top:350px;font-size:92px;color:#ffd23a;-webkit-text-stroke:0.22em #000000;paint-order:stroke fill;",
    "placa": "top:360px;font-size:56px;color:#1f2a44;background:#ffffff;padding:18px 40px;border-radius:26px;"
             "box-shadow:0 8px 0 rgba(0,0,0,0.25);",
}
OVERLAY_BASE = ("position:absolute;left:50%;transform:translateX(-50%);white-space:nowrap;text-align:center;"
                "font-family:'Archivo Black',sans-serif;letter-spacing:0.02em;line-height:1.1;")


def overlays_html(spec: dict) -> tuple[str, str]:
    """overlays [{start, end, text, kind}] and bw [[start, end]] -> (clip elements, gsap pop-in tweens)"""
    dur, els, js = spec["duration"], [], []
    for i, o in enumerate(spec.get("overlays") or []):
        if not (isinstance(o, dict) and o.get("kind") in OVERLAY_STYLE and isinstance(o.get("text"), str)
                and 0 < len(o["text"]) <= 40 and 0 <= o.get("start", -1) < o.get("end", -1) <= dur):
            raise SystemExit(f"overlay {i + 1}: use {{start, end, text (até 40 letras), kind: dia|termo|placa}} dentro da duração")
        style = OVERLAY_STYLE[o["kind"]]
        if o["kind"] in ("termo", "placa"):
            # shortcut: Archivo Black estimated at 0.7 em per letter; measure glyphs if the font changes.
            termo = o["kind"] == "termo"
            size = min(92 if termo else 56, (780 - (0 if termo else 80)) / (len(o["text"]) * 0.72 + (0.22 if termo else 0)))
            style = re.sub(r"font-size:\d+px", f"font-size:{int(size * 100) / 100:.2f}px", style)
        els.append(f'<div id="ov{i}" class="clip" data-start="{o["start"]}" data-duration="{round(o["end"] - o["start"], 3)}" '
                   f'data-track-index="{4 + i % 3}" style="{OVERLAY_BASE}{style}">{_html.escape(o["text"])}</div>')
        js.append(f'tl.fromTo("#ov{i}", {{scale: 0.3, opacity: 0}}, {{scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2.5)"}}, {o["start"]});')
    for i, w in enumerate(spec.get("bw") or []):
        if not (isinstance(w, list) and len(w) == 2 and 0 <= w[0] < w[1] <= dur):
            raise SystemExit(f"bw {i + 1}: use [início, fim] dentro da duração")
        # under the captions and texts: a grayscale filter over the 3D canvases only
        els.insert(0, f'<div class="clip" data-start="{w[0]}" data-duration="{round(w[1] - w[0], 3)}" data-track-index="{7 + i % 2}" '
                      'style="position:absolute;inset:0;backdrop-filter:grayscale(1) contrast(1.05);pointer-events:none;"></div>')
    return "\n      ".join(els), "\n      ".join(js)


def resolve_cast(spec: dict) -> dict:
    """troca cada personagem citado por id (string) pelo CharDef do acervo"""
    out = dict(spec)
    cast = {}
    for key, v in (spec.get("cast") or {}).items():
        if isinstance(v, str):
            p = KIT / f"{v}.json"
            if not p.exists():
                raise SystemExit(f"personagem não está no kit: {v}")
            v = json.loads(p.read_text(encoding="utf-8"))
        cast[key] = v
    out["cast"] = cast
    return out


def _validate(spec: dict) -> None:
    validator = ROOT / "dist/validate.mjs"
    if not validator.exists():
        raise SystemExit("falta dist/validate.mjs: rode `npm run validate:build`")
    with tempfile.NamedTemporaryFile("w", suffix=".json", encoding="utf-8", delete=False) as f:
        json.dump(spec, f, ensure_ascii=False)
    try:
        r = subprocess.run(["node", str(validator), f.name], capture_output=True, text=True)
    finally:
        Path(f.name).unlink()
    if r.returncode != 0:
        print(r.stdout.strip() or r.stderr.strip(), file=sys.stderr)
        raise SystemExit(1)


def check(video_dir: Path) -> dict:
    """só valida: resolve o elenco do acervo e roda o validador (não grava nada); devolve o spec resolvido"""
    spec = json.loads((Path(video_dir) / "video.json").read_text(encoding="utf-8"))
    spec = resolve_cast(spec)
    _validate(spec)
    return spec


def assemble(video_dir: Path) -> Path:
    d = Path(video_dir)
    spec = check(d)
    words = json.loads((d / "words.json").read_text(encoding="utf-8"))
    dur = spec["duration"]
    # sound and captions
    mix(d / "assets/voice.wav", words, spec.get("sfx", []), spec["music"]["mood"], dur, d / "assets/mix.wav", stop=spec["music"].get("stop"))
    captions.render_html(captions.group(words), d / "compositions/captions.html", spec.get("captionStyle", "E"))
    engine = ROOT / "lib/engine.js"
    if not engine.exists():
        raise SystemExit("falta lib/engine.js: rode `npm run build`")
    # page
    ov_html, ov_js = overlays_html(spec)
    spec_json = json.dumps(spec, ensure_ascii=False).replace("</", "<\\/")
    html = ((ROOT / "template/index.html").read_text(encoding="utf-8")
            .replace("{{DURATION}}", str(dur))
            .replace("{{CAPTIONS_HOST}}", captions.host_html(dur))
            .replace("{{FICTION_BADGE}}", BADGE.format(dur=dur) if spec.get("fiction") else "")
            .replace("{{OVERLAYS}}", ov_html)
            .replace("{{OVERLAY_TWEENS}}", ov_js)
            .replace("{{SPEC}}", spec_json))  # last: the spec text itself may contain braces
    (d / "lib").mkdir(exist_ok=True)
    shutil.copy2(engine, d / "lib/engine.js")
    shutil.copy2(ROOT / "template/hyperframes.json", d / "hyperframes.json")
    link = d / "assets/kenney"
    if link.is_symlink() or not link.exists():
        link.unlink(missing_ok=True)
        link.symlink_to(ROOT / "kit/kenney")
    index = d / "index.html"
    index.write_text(html, encoding="utf-8")
    return index


def main(argv: list[str]) -> int:
    if argv[:1] == ["--check"] and len(argv) == 2:
        check(Path(argv[1]))
        print("ok")
        return 0
    if len(argv) != 1:
        print(__doc__.strip().splitlines()[2], file=sys.stderr)
        return 2
    print(assemble(Path(argv[0])))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
