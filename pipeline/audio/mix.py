"""Mix de um short: voz (sem EQ nem compressão) + trilha do clima abaixada sob a fala + efeitos nos tempos do video.json.

Uso: python -m pipeline.audio.mix <projeto>   (lê assets/voice.wav, words.json, video.json; grava assets/mix.wav)

Níveis: trilha 9 dB abaixo da voz (integrado), -3 dB a mais enquanto alguém fala; efeitos com pico momentâneo 6 dB
abaixo do pico da voz (+ gainDb de cada efeito); master em -14 LUFS integrado, limitador com pico real <= -1,2 dBTP.
Grava também os stems (stem_voice/music/sfx.wav) ao lado do mix.
"""
import json
import sys
from math import gcd
from pathlib import Path

import numpy as np
from scipy import ndimage, signal

from pipeline.types import Mood, SfxCue, Word

from .dsp import SR, dbg, integrated, momentary_max, ns, place, read_wav, rng, st, true_peak, write_wav
from .music import bed
from .sfx_lib import SFX

TARGET_LUFS = -14.0
CEIL_DBTP = -1.2
MUSIC_BELOW = 9.0   # dB under the voice (integrated)
DUCK_DB = -3.0      # extra music dip while someone speaks
SFX_BELOW = 6.0     # dB under the voice's momentary peak


def duck_curve(words: list[Word], n: int) -> np.ndarray:
    """dB por amostra para a trilha: DUCK_DB durante a fala (pausas < 0,35 s contam como fala), 0 fora, rampas de 0,3 s"""
    mask = np.zeros(n)
    spans = sorted((w["start"] - 0.05, w["end"] + 0.1) for w in words)
    merged: list[list[float]] = []
    for a, b in spans:
        if merged and a - merged[-1][1] < 0.35:
            merged[-1][1] = max(merged[-1][1], b)
        else:
            merged.append([a, b])
    for a, b in merged:
        mask[max(0, ns(a)): min(n, ns(b))] = 1.0
    return ndimage.uniform_filter1d(mask * DUCK_DB, ns(0.3), mode="nearest")


def _fit(x: np.ndarray, n: int) -> np.ndarray:
    x = st(x)
    return x[:, :n] if x.shape[1] >= n else np.pad(x, ((0, 0), (0, n - x.shape[1])))


def _limit(x: np.ndarray, ceil_db: float = CEIL_DBTP, look: float = 0.003, rel: float = 0.08) -> np.ndarray:
    """4x oversampled peaks, look-ahead min filter, one-pole release, centred smoothing (the bridge short's limiter)"""
    c, n = dbg(ceil_db), x.shape[1]
    up = np.abs(signal.resample_poly(x, 4, 1, axis=-1)).max(0)
    pk = np.pad(up, (0, max(0, 4 * n - len(up))))[: 4 * n].reshape(n, 4).max(1)
    gr = np.minimum(1.0, c / np.maximum(pk, 1e-12))
    la = max(1, ns(look))
    g = ndimage.minimum_filter1d(gr, 2 * la + 1, mode="nearest")
    kr, out, cur = 1 - np.exp(-1 / (rel * SR)), np.empty(n), 1.0
    idx = np.flatnonzero(g < 1.0)
    if len(idx):
        out[:] = 1.0
        a = idx[0]
        for k in range(a, n):
            cur = min(g[k], cur + (1 - cur) * kr)
            out[k] = cur
        g = out
    g = np.minimum(ndimage.uniform_filter1d(g, 2 * la + 1, mode="nearest"), 1.0)
    return x * g[None, :]


def mix(voice: Path, words: list[Word], sfx: list[SfxCue], mood: Mood, dur: float, out: Path, seed: int = 0,
        stop: float | None = None) -> dict:
    n = round(dur * SR)
    v, sr = read_wav(str(voice))
    if sr != SR:
        g = gcd(SR, sr)
        v = signal.resample_poly(v, SR // g, sr // g, axis=-1)
    v = _fit(v, n)
    lv = integrated(v)
    lv = lv if np.isfinite(lv) else -20.0
    m = _fit(bed(mood, dur, seed), n)
    lm = integrated(m)
    if np.isfinite(lm):
        m = m * dbg(lv - MUSIC_BELOW - lm)
    m = m * dbg(duck_curve(words, n))[None, :]
    if stop is not None:  # music cuts at the twist: 60 ms fade, silence after
        a, b = ns(max(stop - 0.06, 0)), min(ns(stop), n)
        m[:, a:b] *= np.linspace(1, 0, b - a)[None, :]
        m[:, b:] = 0
    s = np.zeros((2, n))
    vpk = momentary_max(v) if np.isfinite(momentary_max(v)) else lv
    for i, cue in enumerate(sfx):
        name = cue["name"]
        if name not in SFX:
            raise KeyError(f"efeito desconhecido: {name} (existem: {', '.join(sorted(SFX))})")
        x = SFX[name](rng(seed * 1000 + i))
        xm = momentary_max(x)
        gain = dbg(vpk - SFX_BELOW + cue.get("gainDb", 0.0) - xm) if np.isfinite(xm) else 1.0
        place(s, x, cue["t"], gain)
    y = v + m + s
    master = 1.0
    for _ in range(3):  # gain to target, limit, re-measure (the limiter takes a little loudness off)
        ly = integrated(y * master)
        if np.isfinite(ly):
            master *= dbg(TARGET_LUFS - ly)
        lim = _limit(y * master)
    lim = _fit(lim, n)
    out.parent.mkdir(parents=True, exist_ok=True)
    write_wav(str(out), lim)
    for k, stem in (("voice", v), ("music", m), ("sfx", s)):
        write_wav(str(out.with_name(f"stem_{k}.wav")), stem * master)
    return {"lufs": float(integrated(lim)), "true_peak": float(true_peak(lim))}


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print(__doc__.strip().splitlines()[2], file=sys.stderr)
        return 2
    d = Path(argv[0])
    spec = json.loads((d / "video.json").read_text(encoding="utf-8"))
    words = json.loads((d / "words.json").read_text(encoding="utf-8"))
    rep = mix(d / "assets/voice.wav", words, spec.get("sfx", []), spec["music"]["mood"], spec["duration"], d / "assets/mix.wav",
              stop=spec["music"].get("stop"))
    print(f"mix: {rep['lufs']:.1f} LUFS, pico {rep['true_peak']:.1f} dBTP")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
