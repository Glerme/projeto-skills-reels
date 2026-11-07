"""Checagem automática do vídeo renderizado (videos/<slug>/final.mp4), frame a frame.

Uso: python -m pipeline.qa videos/<slug>   (sai com código 1 se achar problema; relatório em qa/report.md)

Aponta: frames pretos, brancos fora dos flashes planejados, trechos congelados >= 12 frames, pulos (saltos de imagem
fora dos cortes, crossfades, flashes e trocas de legenda), falta de áudio e loudness fora de -14 ± 1,5 LUFS. Também grava
folhas de contato de 2 s (60 frames) para revisão. Base: short_qa.py do short da ponte.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from pipeline import captions

W, H = 180, 320
TARGET, TOL = -14.0, 1.5


def planned_frames(spec: dict, groups: list | None = None) -> set[int]:
    """frames where a big change is expected: cuts, crossfade windows, kicks, the 4 flash frames, caption swaps"""
    fps, out = spec.get("fps", 30), set()
    for g in groups or []:
        for t in (g["start"], g["end"]):
            f = round(t * fps)
            out.update((f - 1, f, f + 1))
    for s in spec.get("shots", []):
        a = round(s["start"] * fps)
        out.update((a - 1, a, a + 1))
        for k in s.get("kicks") or []:  # impact shakes flip every frame for 7 frames
            f = round(k * fps)
            out.update(range(f - 1, f + 9))
        xf = s.get("xfade") or 0
        if xf > 0:
            out.update(range(round((s["start"] - xf / 2) * fps) - 1, round((s["start"] + xf / 2) * fps) + 2))
    for shot in spec.get("shots", []):
        for h in shot.get("hud", []):
            times = [h["start"], h["end"]]
            times.extend(item["t"] for item in h.get("items", []))
            for t in times:
                f = round(t * fps)
                out.update((f - 1, f, f + 1))
    for t in spec.get("flash", []):
        f = round(t * fps)
        out.update(range(f - 1, f + 6))
    return out


def analyze(F: np.ndarray, planned: set[int]) -> tuple[list[str], dict]:
    """problems found in frames F (n, H, W, 3 uint8), plus per-frame stats"""
    n = len(F)
    luma = (F.astype(np.float32) / 255) @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    mean = luma.reshape(n, -1).mean(1)
    diff = np.abs(np.diff(F.astype(np.int16), axis=0)).mean(axis=(1, 2, 3)) if n > 1 else np.zeros(0)
    med = np.array([np.median(diff[max(0, i - 8):i + 9]) for i in range(len(diff))])
    probs = []
    black = [i for i in range(n) if mean[i] < 0.04]
    white = [i for i in range(n) if mean[i] > 0.93 and i not in planned]
    pops = [i + 1 for i in range(len(diff)) if diff[i] > 3 * med[i] + 1.0 and (i + 1) not in planned]
    frozen, start = [], None
    for i in range(len(diff) + 1):
        still = i < len(diff) and diff[i] < 0.02
        if still and start is None:
            start = i
        elif not still and start is not None:
            if i - start >= 12:
                frozen.append((start, i))
            start = None
    if black:
        probs.append(f"frames pretos: {black[:20]}")
    if white:
        probs.append(f"frames brancos fora dos flashes: {white[:20]}")
    if frozen:
        probs.append(f"trechos congelados (>= 12 frames parados): {frozen[:10]} — todo plano parado precisa de push-in")
    if pops:
        probs.append(f"pulos de imagem fora dos cortes: frames {pops[:20]}")
    return probs, {"mean": mean, "diff": diff}


RANGES = {"explicador": (90, 130), "historia": (50, 70), "curiosidade": (30, 45), "lista": (45, 60), "e-se": (15, 25), "e-se-serie": (45, 60)}  # formatos.md


def metrics(spec: dict, words: list[dict]) -> list[str]:
    """retention numbers for the score in skill/references/nota.md (informative, never a QA failure)"""
    shots, dur = spec.get("shots", []), spec.get("duration") or 0
    out = [f"duração {dur:.1f} s (faixa de {spec.get('format')}: {RANGES.get(spec.get('format'), '?')})"]
    if shots and dur:
        longest = max(shots, key=lambda s: s["end"] - s["start"])
        out.append(f"cortes por 10 s: {(len(shots) - 1) / dur * 10:.1f}; maior plano: cena {longest['id']}, "
                   f"{longest['end'] - longest['start']:.1f} s")
    if words:
        a, b = words[0]["start"], words[-1]["end"]
        out.append(f"ritmo: {len(words) / max(b - a, 0.1) * 60:.0f} palavras/min")
        out.append("gancho (primeiros 3 s): " + " ".join(w["text"] for w in words if w["start"] < a + 3))
        out.append("fecho (últimos 6 s): " + " ".join(w["text"] for w in words if w["start"] >= b - 6))
    return out


def _loudness(vid: Path) -> float | None:
    e = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(vid), "-map", "0:a:0", "-af", "ebur128=peak=true",
                        "-f", "null", "-"], capture_output=True, text=True).stderr
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", e[e.rfind("Summary:"):])
    return float(m[0]) if m else None


def _sheets(F: np.ndarray, out: Path) -> None:
    cw, ch = 108, 192
    for k in range(0, len(F), 60):
        S = Image.new("RGB", (cw * 10, ch * 6), "black")
        d = ImageDraw.Draw(S)
        for j in range(min(60, len(F) - k)):
            x, y = (j % 10) * cw, (j // 10) * ch
            S.paste(Image.fromarray(F[k + j]).resize((cw, ch)), (x, y))
            d.rectangle([x, y, x + 34, y + 12], fill="black")
            d.text((x + 2, y + 1), str(k + j), fill="yellow")
        S.save(out / f"sheet_{k:04d}.jpg", quality=85)


def run(video_dir: Path) -> list[str]:
    d = Path(video_dir)
    vid, spec = d / "final.mp4", json.loads((d / "video.json").read_text(encoding="utf-8"))
    out = d / "qa"
    out.mkdir(exist_ok=True)
    probe = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate",
                                       "-of", "json", str(vid)], capture_output=True, text=True).stdout)
    streams = probe.get("streams", [])
    v = next(s for s in streams if s["codec_type"] == "video")
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(vid), "-vf", f"scale={W}:{H}:flags=area", "-f", "rawvideo",
                          "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    F = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
    words = d / "words.json"
    wl = json.loads(words.read_text(encoding="utf-8")) if words.exists() else []
    groups = captions.group(wl) if wl else []
    probs, _ = analyze(F, planned_frames(spec, groups))
    lufs = None
    if not any(s["codec_type"] == "audio" for s in streams):
        probs.append("o vídeo não tem áudio")
    else:
        lufs = _loudness(vid)
        if lufs is None or abs(lufs - TARGET) > TOL:
            probs.append(f"loudness {lufs} LUFS fora de {TARGET} ± {TOL}")
    _sheets(F, out)
    head = f"{v['width']}x{v['height']} {v['r_frame_rate']} fps, {len(F)} frames, loudness {lufs} LUFS"
    (out / "report.md").write_text("# QA\n\n" + head + "\n\n" + ("\n".join(f"- {p}" for p in probs) or "- nenhum problema")
                                   + "\n\n## Métricas (para skill/references/nota.md)\n\n"
                                   + "\n".join(f"- {m}" for m in metrics(spec, wl)) + "\n", encoding="utf-8")
    return probs


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print(__doc__.strip().splitlines()[2], file=sys.stderr)
        return 2
    probs = run(Path(argv[0]))
    print("\n".join(probs) if probs else "QA: nenhum problema")
    return 1 if probs else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
