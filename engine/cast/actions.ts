// Pure action -> FrontOpts mapping (no three, no document). Time t is in seconds from the start of the action.
import type { FrontOpts } from "../style/toon";
import type { ActionId } from "../spec";

const TAU = Math.PI * 2;
const BASE_LIFT = 60; // toon.ts default
const STEPS_PER_S = 1.5; // 1.2 m/s over a 0.8 m stride
const frame = (t: number, fps = 30) => Math.floor(t * fps + 1e-6);

export function poseAt(action: ActionId, t: number, seed: number): FrontOpts {
  switch (action) {
    case "walk": // phase 1 = two steps; lean 1..7 deg (tilt). The Stage moves the actor.
      return { mode: "stroll", phase: (t * STEPS_PER_S) / 2, tilt: 4 + 3 * Math.sin(TAU * 0.5 * t + seed), seed };
    case "talk": // mouth toggles every 5 frames, offset by seed
      return { mode: "stand", talk: Math.floor((frame(t) + (seed % 5)) / 5) % 2 === 0, seed };
    case "point": return { mode: "stand", arms: "point", seed };
    case "cheer": return { mode: "stand", arms: "cheer", expr: "grin", seed };
    case "wave": return { mode: "stand", wave: 0.5 + 0.5 * Math.sin(TAU * 2 * t), seed };
    case "shock": return { mode: "stand", expr: "shock", lift: BASE_LIFT * (1 + 0.25 * Math.exp(-6 * t)), seed };
    case "fall": return { mode: "fall", seed };
    case "sit": return { mode: "sit", seed };
    case "stand": return { mode: "stand", lift: BASE_LIFT * (1 + 0.01 * Math.sin((TAU * t) / 3)), seed };
  }
}

const hash = (a: number, b: number) => {
  let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b + 1, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
};
const starts = new Map<number, number[]>(); // seed -> blink start frames (memoised schedule)
/** Blink schedule: starts 15..69 frames (0.5..2.3 s at 30 fps) apart, each lasting 4 frames. */
export function blinkAt(seed: number, t: number, fps = 30): boolean {
  const f = frame(t, fps), gap = (i: number) => Math.round((15 + hash(seed, i) * 54) * (fps / 30));
  const s = starts.get(seed) ?? [Math.round(hash(seed, -1) * 30 * (fps / 30)) + gap(0)];
  starts.set(seed, s);
  while (s[s.length - 1] <= f) s.push(s[s.length - 1] + gap(s.length));
  // binary-free scan from the end is fine: queries are near-monotonic; use last start <= f
  let i = s.length - 1; while (i > 0 && s[i] > f) i--;
  return s[i] <= f && f < s[i] + 4;
}
