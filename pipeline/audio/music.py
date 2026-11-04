"""Trilhas originais por clima, sintetizadas (nada de terceiros, livre para monetizar).

bed(clima, duração, seed) -> estéreo (2, N) a 48 kHz, fade de 1 s no fim. Uma progressão de 4 acordes repetida, com
instrumentos e andamento por clima:
  curioso 100 bpm  pizzicato + glock (dó maior)
  animado 120 bpm  tuba em oom-pah + caixa + glock (dó maior)
  tenso    80 bpm  tímpano + pad grave + ostinato de pizzicato (lá menor)
  calmo    72 bpm  pad + vibrafone esparso (fá maior)
"""
import numpy as np

from . import instruments as I
from .dsp import SR, fades, ns, place, rng, st

MOODS = ("curioso", "animado", "tenso", "calmo")
# per mood: tempo, chord roots (midi) and qualities, melody scale (midi)
_PLAN = {
    "curioso": (100, [(60, "M"), (57, "m"), (65, "M"), (67, "M")], [72, 74, 76, 79, 81, 84]),
    "animado": (120, [(60, "M"), (65, "M"), (67, "M"), (60, "M")], [72, 74, 76, 77, 79, 81, 84]),
    "tenso": (80, [(57, "m"), (53, "M"), (50, "m"), (52, "M")], [69, 71, 72, 74, 76]),
    "calmo": (72, [(65, "M"), (62, "m"), (58, "M"), (60, "M")], [77, 79, 81, 84, 86]),
}


def _triad(root, q):
    return [root, root + (4 if q == "M" else 3), root + 7]


def bed(mood: str, dur: float, seed: int = 0) -> np.ndarray:
    tempo, chords, scale = _PLAN[mood]
    r = rng(seed)
    beat = 60.0 / tempo
    buf = np.zeros((2, ns(dur)))
    nbeats = int(dur / beat) + 1
    for b in range(nbeats):
        t = b * beat
        if t >= dur:
            break
        root, q = chords[(b // 4) % len(chords)]
        tri = _triad(root, q)
        bar_pos = b % 4
        if mood == "curioso":
            if bar_pos in (0, 2):
                place(buf, I.pluck(I.m2f(root - 12 + (7 if bar_pos == 2 else 0)), 0.75, r, dur=0.6), t, 0.9)
            place(buf, I.pluck(I.m2f(tri[1 + b % 2]), 0.45, r, dur=0.4, bright=0.7), t + beat / 2, 0.5)
            if r.random() < 0.55:
                place(buf, I.glock(I.m2f(int(r.choice(scale))), 0.45, r, dur=1.0), t + (beat / 2 if r.random() < 0.4 else 0), 0.35)
        elif mood == "animado":
            if bar_pos in (0, 2):
                place(buf, I.brass(I.m2f(root - 24 + (7 if bar_pos == 2 else 0)), beat * 0.8, 0.8, r), t, 0.7)
            else:
                place(buf, I.snare(0.55, r, dur=0.25), t, 0.5)
                for n in tri:
                    place(buf, I.pluck(I.m2f(n), 0.35, r, dur=0.25, bright=0.8), t, 0.25)
            if r.random() < 0.6:
                place(buf, I.glock(I.m2f(int(r.choice(scale))), 0.5, r, dur=0.8), t + beat / 2 * (r.random() < 0.5), 0.35)
        elif mood == "tenso":
            place(buf, I.timpani(I.m2f(root - 24), 0.55 if bar_pos else 0.8, r, dur=1.4), t, 0.6)
            if bar_pos == 0:
                place(buf, I.pad([I.m2f(n - 12) for n in tri], beat * 4, 0.4, r, att=0.8, rel=1.0, warm=700.0), t, 0.5)
            for k in range(2):
                place(buf, I.pluck(I.m2f(tri[(b + k) % 3]), 0.35, r, dur=0.3, bright=0.4), t + k * beat / 2, 0.35)
        else:  # calmo
            if bar_pos == 0:
                place(buf, I.pad([I.m2f(n) for n in tri], beat * 4.2, 0.45, r, att=1.0, rel=1.4), t, 0.55)
            if r.random() < 0.35:
                place(buf, I.vibes(I.m2f(int(r.choice(scale))), 0.45, r, dur=1.8), t, 0.35)
    x = st(buf)
    m = np.abs(x).max()
    if m > 0:
        x = x * (0.5 / m)
    fo = min(1.0, dur / 3)
    x[:, -ns(fo):] *= np.linspace(1, 0, ns(fo)) ** 2
    x[:, -64:] = 0.0
    return fades(x, 0.05, 0.0)
