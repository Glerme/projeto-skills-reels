"""Biblioteca de efeitos sonoros genéricos, todos sintetizados (originais, livres para monetizar).

SFX[nome](rng) -> estéreo (2, N) a 48 kHz, pico ~0,5. Os nomes são os que o video.json usa em `sfx`.
Construídos com os geradores do short da ponte (sfx_gen, instruments, dsp).
"""
from typing import Callable

import numpy as np

from . import instruments as I
from . import sfx_gen as G
from .dsp import SR, TAU, fades, lp, ns, place, st, tt


def _norm(x, peak=0.5):
    x = st(x)
    m = np.abs(x).max()
    return x * (peak / m) if m > 0 else x


def pop(r):
    """bolha / aparecer: seno curto com queda rápida de altura"""
    t = tt(0.09)
    f = 900 * np.exp(-t * 18) + 380
    return _norm(fades(np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t * 40), 0.001, 0.01))


def boing(r):
    """mola: seno com vibrato largo descendo, cauda de 0,5 s"""
    t = tt(0.55)
    f = 320 * np.exp(-t * 2.2) * (1 + 0.18 * np.sin(TAU * 13 * t))
    return _norm(fades(np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t * 5), 0.002, 0.05))


def thud(r):
    """baque surdo: grave de 70 Hz + ruído filtrado"""
    t = tt(0.35)
    body = np.sin(TAU * (70 * t + 30 * (1 - np.exp(-t * 30)) / 30)) * np.exp(-t * 14)
    noise = lp(r.standard_normal(len(t)) * np.exp(-t * 40), 400)
    return _norm(fades(body + 0.6 * noise, 0.001, 0.05))


def steps(r):
    """quatro passos a 2 passos/s"""
    buf = np.zeros((2, ns(2.0)))
    for k in range(4):
        place(buf, G.stroll_step(r), 0.05 + k * 0.5, 0.8 + 0.2 * r.random())
    return _norm(buf)


def sparkle(r):
    """brilho: arpejo agudo de glockenspiel"""
    buf = np.zeros((2, ns(1.4)))
    for k, m in enumerate([84, 88, 91, 96]):
        place(buf, I.glock(I.m2f(m), 0.6, r, dur=0.9), k * 0.07)
    return _norm(buf)


def sting(r):
    """sting do twist: dois golpes de metal (sol e dó maior), o segundo segurado"""
    buf = np.zeros((2, ns(1.3)))
    for t0, root, dur in ((0.0, 55, 0.09), (0.16, 60, 0.7)):
        for m in (root, root + 4, root + 7, root + 12):
            place(buf, I.brass(I.m2f(m), dur, 0.9, r, kind="stab"), t0)
    return _norm(buf)


def crash(r):
    """quebra: estalo de madeira + chocalho de pedaços"""
    buf = np.zeros((2, ns(1.2)))
    place(buf, G.wood_crack(r), 0.0)
    place(buf, G.rattle(0.9, r, density=40.0), 0.05, 0.6)
    return _norm(buf)


SFX: dict[str, Callable[[np.random.Generator], np.ndarray]] = {
    "pop": pop,
    "whoosh": lambda r: _norm(G.whoosh(0.6, r)),
    "boing": boing,
    "thud": thud,
    "ding": lambda r: _norm(I.glock(I.m2f(88), 0.8, r, dur=1.4)),
    "splash": lambda r: _norm(G.splash_big(r)),
    "creak": lambda r: _norm(G.creak(0.8, r)),
    "crash": crash,
    "steps": steps,
    "sparkle": sparkle,
    "tick": lambda r: _norm(G.clink(r, dur=0.08)),
    "sting": sting,
}
