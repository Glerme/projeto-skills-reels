"""Monta o projeto HyperFrames de um vídeo.

Uso: python -m pipeline.assemble videos/<slug>

Entrada em videos/<slug>/: video.json (o elenco pode citar personagens do acervo pelo id), words.json e
assets/voice.wav. Saída na mesma pasta: index.html (template com o spec embutido, as legendas e o selo FICÇÃO quando
`fiction`), compositions/captions.html, assets/mix.wav (+ stems), lib/engine.js, hyperframes.json e o link
assets/kenney -> kit/kenney. Rode `npm run build` e `npm run validate:build` antes.
"""
import json
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


def assemble(video_dir: Path) -> Path:
    d = Path(video_dir)
    spec = resolve_cast(json.loads((d / "video.json").read_text(encoding="utf-8")))
    _validate(spec)
    engine = ROOT / "lib/engine.js"
    if not engine.exists():
        raise SystemExit("falta lib/engine.js: rode `npm run build`")
    words = json.loads((d / "words.json").read_text(encoding="utf-8"))
    dur = spec["duration"]
    # sound and captions
    mix(d / "assets/voice.wav", words, spec.get("sfx", []), spec["music"]["mood"], dur, d / "assets/mix.wav")
    captions.render_html(captions.group(words), d / "compositions/captions.html")
    # page
    spec_json = json.dumps(spec, ensure_ascii=False).replace("</", "<\\/")
    html = ((ROOT / "template/index.html").read_text(encoding="utf-8")
            .replace("{{DURATION}}", str(dur))
            .replace("{{CAPTIONS_HOST}}", captions.host_html(dur))
            .replace("{{FICTION_BADGE}}", BADGE.format(dur=dur) if spec.get("fiction") else "")
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
    if len(argv) != 1:
        print(__doc__.strip().splitlines()[2], file=sys.stderr)
        return 2
    print(assemble(Path(argv[0])))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
