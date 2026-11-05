// Pure action -> FrontOpts mapping (no three, no document). Time t is in seconds from the start of the action.
import type { FrontOpts } from "../style/toon";
import type { ActionId } from "../spec";

const TAU = Math.PI * 2;
const BASE_LIFT = 60; // toon.ts default
const STEPS_PER_S = 1.5; // 1.2 m/s over a 0.8 m stride
const frame = (t: number, fps = 30) => Math.floor(t * fps + 1e-6);

const sm = (x: number) => { const u = Math.min(1, Math.max(0, x)); return u * u * (3 - 2 * u); };
const S = (f: number, t: number, ph = 0) => Math.sin(TAU * f * t + ph);
/** small idle motion so no pose ever freezes: arms and head drift a few degrees */
const idle = (t: number, seed: number) => ({
  rig: { armL: [7 + 4 * S(0.45, t, seed), 10 + 4 * S(0.3, t, seed)] as [number, number], armR: [7 + 4 * S(0.4, t, seed + 1), 10 + 4 * S(0.35, t, seed + 2)] as [number, number] },
  headTilt: 2 * S(0.3, t, seed),
});
const mouth = (t: number, seed: number, every = 5) => Math.floor((frame(t) + (seed % 5)) / every) % 2 === 0;

/** pose for an action at t seconds into the shot; cue = seconds into the shot of the key moment (release, hit) */
export function poseAt(action: ActionId, t: number, seed: number, cue = Infinity): FrontOpts {
  switch (action) {
    case "walk": { // phase 1 = two steps; arms swing against the legs; lean 1..7 deg. The Stage moves the actor.
      const phase = (t * STEPS_PER_S) / 2, sw = Math.sin(TAU * phase);
      return { mode: "stroll", phase, tilt: 4 + 3 * Math.sin(TAU * 0.5 * t + seed), headTilt: 2 * Math.sin(TAU * 2 * phase), seed,
        rig: { armL: [14 + 16 * sw, 18 + 8 * sw], armR: [14 - 16 * sw, 18 - 8 * sw] } };
    }
    case "talk": // mouth toggles every 5 frames; one hand gestures, the head nods
      return { mode: "stand", talk: mouth(t, seed), seed, headTilt: 3 * S(0.7, t, seed),
        rig: { armL: [8 + 4 * S(0.4, t, seed), 12], armR: [30 + 22 * S(0.9, t, seed), 55 + 25 * S(1.3, t, seed + 1)] } };
    case "gesture": // both hands open and close while explaining
      return { mode: "stand", talk: mouth(t, seed), seed, tilt: 3 * S(0.5, t, seed), headTilt: 4 * S(0.8, t, seed),
        rig: { armL: [45 + 30 * S(1.1, t, seed), 60 + 20 * S(1.4, t)], armR: [55 + 35 * S(1.3, t, seed + 1), 70 + 25 * S(0.9, t)] } };
    case "laugh": // head thrown back, body shaking, hands on the belly
      return { mode: "stand", expr: "laugh", talk: mouth(t, seed, 3), seed, headTilt: -10 + 4 * S(7, t), tilt: 2.5 * S(7, t, 1),
        lift: BASE_LIFT * (1 + 0.04 * S(7, t)), rig: { armL: [22 + 4 * S(7, t), 115], armR: [22 + 4 * S(7, t, 2), 115] } };
    case "taunt": // spear raised and shaken, mouth shouting
      return { mode: "stand", talk: mouth(t, seed, 4), seed, tilt: -4 + 2 * S(1.5, t), headTilt: 5 * S(2, t), hand: { R: "spear" },
        rig: { armR: [150 + 10 * S(3, t), -25 + 10 * S(3, t, 1)], armL: [35 + 8 * S(1.5, t), 40] } };
    case "struggle": // armour too big: wobbling, arms held out, knees giving way
      return { mode: "stand", expr: "nervous", seed, tilt: 7 * S(1.2, t), headTilt: -4 * S(1.2, t, 1),
        rig: { crouch: 0.12 + 0.08 * Math.abs(S(1.2, t)), armL: [55 + 15 * S(1.2, t), 30 + 10 * S(2.4, t)], armR: [55 - 15 * S(1.2, t), 30 - 10 * S(2.4, t)],
          legL: [10 + 7 * S(1.2, t), 12], legR: [10 - 7 * S(1.2, t), 12] } };
    case "unhelm": { // both hands lift the helmet up off the head over 1 s, then lower it to the side
      const k = sm(t / 1.0), d = sm((t - 1.3) / 0.6);
      return { mode: "stand", expr: k < 1 ? "nervous" : "relief", seed, headTilt: -4 * k, hand: { R: "helmet" },
        rig: { armL: [120 + 50 * k - 90 * d, 110 - 70 * k + 30 * d], armR: [120 + 50 * k - 80 * d, 110 - 70 * k + 20 * d] } };
    }
    case "pick": { // crouch to the stream bed, pick a stone, stand up with it; 1.4 s per stone
      const c = (t % 1.4) / 1.4, down = c < 0.4 ? sm(c / 0.4) : c < 0.6 ? 1 : 1 - sm((c - 0.6) / 0.4), got = c >= 0.45 || t >= 1.4;
      return { mode: "stand", seed, headTilt: 16 * down, tilt: 22 * down, hand: got ? { R: "stone" } : {},
        rig: { crouch: 0.9 * down, armR: [12 + 20 * down, 8 + 10 * (1 - down)], armL: [25 + 15 * down, 40 + 30 * down] } };
    }
    case "whirl": { // sling spun over the head until the cue, then the release and follow-through
      // the sling spins in the screen-left hand, high and outside; the screen-right arm aims at a target to the right
      if (t < cue) return { mode: "stand", expr: "stern", seed, tilt: 3 + 1.5 * S(2.5, t), hand: { L: "sling" }, sling: TAU * 2.6 * t, slingReleased: false,
        rig: { armL: [150 + 6 * S(2.6, t), 18], armR: [82 + 4 * S(1, t), 0], legL: [14, 4], legR: [14, 4] } };
      const k = sm((t - cue) / 0.25);
      return { mode: "stand", expr: "stern", seed, tilt: 3 - 10 * k, hand: { L: "sling" }, sling: 0, slingReleased: true,
        rig: { armL: [150 - 95 * k, 18 - 10 * k], armR: [82 - 40 * k, 10 * k], legL: [14, 4 + 10 * k], legR: [14, 4] } };
    }
    case "topple": { // stands with the spear; at the cue the head snaps back, arms fly up, the body rolls to the ground
      if (t < cue) return { ...idle(t, seed), mode: "stand", seed, hand: { R: "spear" }, rig: { armR: [20 + 3 * S(0.5, t), -10], armL: [30, 40] } };
      const d = t - cue, fall = sm((d - 0.2) / 0.75) ** 1.6, landed = d >= 0.95;
      return { mode: "stand", expr: d < 0.2 ? "shock" : "dazed", seed, headTilt: -18 * sm(d / 0.15), roll: 90 * fall,
        impact: landed ? d - 0.95 : undefined, rig: { armL: [120 + 30 * fall, 30], armR: [130 + 20 * fall, 40] } };
    }
    case "point": return { mode: "stand", arms: "point", seed, headTilt: 2 * S(0.4, t, seed) };
    case "cheer": return { mode: "stand", expr: "grin", seed, lift: BASE_LIFT * (1 + 0.06 * Math.abs(S(1.5, t))),
      rig: { armL: [160 + 12 * S(1.5, t), 10], armR: [160 - 12 * S(1.5, t), 10] } };
    case "wave": return { ...idle(t, seed), mode: "stand", wave: 0.5 + 0.5 * Math.sin(TAU * 2 * t), seed, rig: { armL: idle(t, seed).rig.armL } };
    case "shock": return { ...idle(t, seed), mode: "stand", expr: "shock", lift: BASE_LIFT * (1 + 0.25 * Math.exp(-6 * t)), seed };
    case "fall": return { mode: "fall", seed };
    case "sit": return { mode: "sit", seed, headTilt: 3 * S(0.3, t, seed) };
    case "stand": return { ...idle(t, seed), mode: "stand", lift: BASE_LIFT * (1 + 0.01 * Math.sin((TAU * t) / 3)), seed };
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
