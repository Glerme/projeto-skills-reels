import type { ShotSpec } from "./spec";
import { actorPosition, type Walkway } from "./space";

export type V3 = [number, number, number];
export type Cam = { pos: V3; look: V3; fov: number; roll: number };

const smootherstep = (x: number) => x * x * x * (x * (6 * x - 15) + 10);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const mix3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const KICK_M = 0.06, KICK_DEG = 0.6;

const EASE = {
  smooth: smootherstep,
  out: (x: number) => 1 - (1 - x) ** 3,
  in: (x: number) => x ** 3,
  linear: (x: number) => x,
  back: (x: number) => { const u = x - 1; return u * u * (2.7 * u + 1.7) + 1; },
};
export type Ease = keyof typeof EASE;
export const EASES = Object.keys(EASE) as Ease[];
/** One camera key, orbiting a target: `on` (spot or actor; actors are tracked while they move), `dist` metres from it,
 *  lens at height `h` over the target's feet, looking at `aim` over them, `yaw` degrees around it (0 = the set's
 *  aberto axis, + = camera swings to its right). `on` may also be a world point [x, y, z] (a far landmark). `ease` shapes the move that arrives at this key. */
export type CamKey = { t: number; on?: string | V3; dist: number; h?: number; yaw?: number; aim?: number; fov?: number; roll?: number; ease?: Ease };
const KEY_DEFAULTS = { aim: 1.35, fov: 34, yaw: 0, roll: 0 };
/** Catmull-Rom through four values at u in [0, 1] (between b and c) */
const cr = (a: number, b: number, c: number, d: number, u: number) =>
  0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);

/** Camera from keys: parameters (log distance, height, yaw, aim, fov, roll) follow a spline through the keys, timed by
 *  each segment's ease; the target point blends between the two keys' targets, evaluated at t (so it tracks walkers). */
function keyCam(shot: ShotSpec, t: number, views: Record<string, Cam>, target: (on: CamKey["on"], t: number) => V3, fps: number): Cam {
  const K = shot.cam.keys!;
  const base = views.aberto ?? Object.values(views)[0];
  const yaw0 = Math.atan2(base.pos[0] - base.look[0], base.pos[2] - base.look[2]) * 180 / Math.PI;
  const par = (k: CamKey) => {
    const aim = k.aim ?? KEY_DEFAULTS.aim;
    return [Math.log(k.dist), k.h ?? aim, k.yaw ?? KEY_DEFAULTS.yaw, aim, k.fov ?? KEY_DEFAULTS.fov, k.roll ?? KEY_DEFAULTS.roll];
  };
  const f = Math.round((t - shot.start) * fps) / fps + shot.start; // frame-exact, like the recipes
  let i = 0;
  while (i < K.length - 1 && f >= K[i + 1].t) i++;
  const a = K[i], b = K[Math.min(K.length - 1, i + 1)];
  const u = b === a ? 0 : EASE[b.ease ?? "smooth"](Math.max(0, Math.min(1, (f - a.t) / (b.t - a.t))));
  const P = [K[Math.max(0, i - 1)], a, b, K[Math.min(K.length - 1, i + 2)]].map(par);
  // clamped to the segment's ends: a very different next key must not swing the lens past this one (no overshoot)
  const [ld, h, yaw, aim, fov, roll] = P[1].map((_, j) =>
    Math.min(Math.max(P[1][j], P[2][j]), Math.max(Math.min(P[1][j], P[2][j]), cr(P[0][j], P[1][j], P[2][j], P[3][j], u))));
  const A = target(a.on, f), B = target(b.on, f), c = mix3(A, B, u);
  const y = (shot.set === "plano" ? 0 : yaw0 + yaw) * Math.PI / 180, dist = Math.exp(ld);
  // every hold creeps in a little (reference: fov *= 1 - .00012 per frame)
  const creep = 1 - 0.00012 * Math.min(450, Math.round((t - shot.start) * fps));
  return { pos: [c[0] + Math.sin(y) * dist, c[1] + (shot.set === "plano" ? aim : h), c[2] + Math.cos(y) * dist], look: [c[0], c[1] + aim, c[2]], fov: fov * creep, roll };
}

export function camAt(shot: ShotSpec, t: number, views: Record<string, Cam>, fps = 30, spots?: Record<string, V3>, walkways: Record<string, Walkway> = {}): Cam {
  if (shot.cam.recipe === "keys") {
    const target = (on: CamKey["on"], at: number): V3 => {
      if (Array.isArray(on)) return on;
      const who = on ?? shot.focus;
      const actor = (shot.actors ?? []).find(a => a.who === who);
      if (actor && spots && (actor.path ? walkways[actor.path] : spots[actor.at!])) {
        const p = actorPosition(shot, spots, walkways, actor, at).p;
        return [p.x, p.y, p.z];
      }
      return spots?.[who ?? "centro"] ?? spots?.centro ?? [0, 0, 0];
    };
    return kick(shot, t, fps, keyCam(shot, t, views, target, fps));
  }
  const view = (n: string) => { const v = views[n]; if (!v) throw new Error(`view desconhecida: ${n}`); return v; };
  const { recipe, from, to, punch = [] } = shot.cam as { recipe: string; from: string; to?: string; punch?: number[] };
  // A portrait cannot fit all lateral spots at medium size: translate the axis to its presenter.
  const actors = Array.isArray(shot.actors) ? shot.actors : [];
  const presenter = actors.find(a => a && a.who === shot.focus && a.at && !a.path)
    ?? actors.find(a => a?.action === "talk" && a.at && !a.path);
  const at = presenter?.at && spots?.[presenter.at], center = spots?.centro;
  const framed = (name: string) => {
    const c = view(name);
    if (!at || !center || !["aberto", "medio", "close", "baixo"].includes(name)) return c;
    const shift = (v: V3): V3 => [v[0] + at[0] - center[0], v[1] + at[1] - center[1], v[2] + at[2] - center[2]];
    return { ...c, pos: shift(c.pos), look: shift(c.look) };
  };
  const A = framed(from), B = recipe === "glide" ? framed(to!) : A;
  const f = Math.max(0, Math.round((t - shot.start) * fps));
  const dur = Math.max(1, Math.round((shot.end - shot.start) * fps));
  let c: Cam;
  if (recipe === "glide") {
    const k = smootherstep(Math.min(1, f / dur));
    c = { pos: mix3(A.pos, B.pos, k), look: mix3(A.look, B.look, k), fov: lerp(A.fov, B.fov, k), roll: lerp(A.roll, B.roll, k) };
  } else {
    // Bounded creep keeps a long take from ending inside the subject.
    const seconds = f / fps;
    const advance = (recipe === "push" ? 0.12 : 0.08) * (1 - Math.exp(-seconds / 8));
    c = { ...A, pos: mix3(A.pos, A.look, advance) };
  }
  const extra = Math.min(0.03, punch.reduce((sum, t) =>
    sum + 0.03 * smootherstep(Math.max(0, Math.min(1, (shot.start + f / fps - t) / 0.8))), 0));
  return kick(shot, t, fps, { ...c, pos: mix3(c.pos, c.look, extra) });
}

/** impact kick: 7 frames of alternating sideways shake and roll after each time in shot.kicks */
function kick(shot: ShotSpec, t: number, fps: number, c: Cam): Cam {
  const f = Math.max(0, Math.round((t - shot.start) * fps));
  let a = 0;
  for (const p of shot.kicks ?? []) {
    const k = f - Math.round((p - shot.start) * fps);
    if (k >= 0 && k < 7) a += (1 - k / 7) * (k % 2 ? -1 : 1);
  }
  if (!a) return c;
  const d = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const r = [-d[2], 0, d[0]]; // d x up(0,1,0)
  const n = Math.hypot(r[0], r[2]) || 1;
  const off = r.map((v) => (v / n) * KICK_M * a);
  return { ...c, pos: c.pos.map((v, i) => v + off[i]) as V3, look: c.look.map((v, i) => v + off[i]) as V3, roll: c.roll + KICK_DEG * a };
}

/** Same-axis continuity, measured at the actual cut (including bounded push/punch). */
export function cameraCut(previous: ShotSpec, next: ShotSpec, views: Record<string, Cam>, spots?: Record<string, V3>, walkways: Record<string, Walkway> = {}): string[] {
  const a = camAt({ ...previous, kicks: [] }, previous.end, views, 30, spots, walkways);
  const b = camAt({ ...next, kicks: [] }, next.start, views, 30, spots, walkways);
  const direction = (c: Cam) => c.look.map((v, i) => v - c.pos[i]);
  const u = direction(a), v = direction(b);
  const da = Math.hypot(...u), db = Math.hypot(...v);
  const angle = Math.acos(Math.max(-1, Math.min(1, u.reduce((sum, n, i) => sum + n * v[i], 0) / (da * db)))) * 180 / Math.PI;
  const delta = b.pos.map((n, i) => n - a.pos[i]);
  const along = delta.reduce((sum, n, i) => sum + n * u[i] / da, 0);
  const sideways = Math.sqrt(Math.max(0, delta.reduce((sum, n) => sum + n * n, 0) - along * along));
  const from = previous.cam.recipe === "glide" ? previous.cam.to! : previous.cam.from;
  const tiers = ["aberto", "medio", "close"];
  const i = tiers.indexOf(from), j = tiers.indexOf(next.cam.from);
  const errors: string[] = [];
  const angleLimit = previous.set === "paris" ? 2 : 15;
  const halfA = da * Math.tan(a.fov * Math.PI / 360), halfB = db * Math.tan(b.fov * Math.PI / 360);
  const flat = previous.set === "plano";
  const lateralLimit = flat ? Math.min(halfA, halfB) * 9 / 16 : previous.set === "paris" ? 0.2 : Math.min(da, db) * 0.5;
  const zoomRatio = flat ? Math.max(halfA / halfB, halfB / halfA) : Math.max(da / db, db / da);
  if (angle > angleLimit + 1e-6 || sideways > lateralLimit + 1e-6 || (u[0] * v[0] < 0 && Math.min(Math.abs(u[0]), Math.abs(v[0])) > 0.5))
    errors.push(`câmera muda de lado/eixo (deslocamento transversal > ${flat ? "50% da menor largura do quadro" : previous.set === "paris" ? "0,2 m" : "50% da menor distância"}) ou direção mais de ${angleLimit}°`);
  if ((i >= 0 && j >= 0 && Math.abs(i - j) > 1) || zoomRatio > 2.5 + 1e-6)
    errors.push("câmera pula distância: use no máximo um degrau (aberto↔medio↔close) e razão de distância ≤ 2,5");
  return errors;
}
