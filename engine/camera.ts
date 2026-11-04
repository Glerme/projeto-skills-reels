import type { ShotSpec } from "./spec";

export type V3 = [number, number, number];
export type Cam = { pos: V3; look: V3; fov: number; roll: number };

const smootherstep = (x: number) => x * x * x * (x * (6 * x - 15) + 10);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const mix3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const KICK_M = 0.06, KICK_DEG = 0.6;

export function camAt(shot: ShotSpec, t: number, views: Record<string, Cam>, fps = 30): Cam {
  const view = (n: string) => { const v = views[n]; if (!v) throw new Error(`view desconhecida: ${n}`); return v; };
  const { recipe, from, to, punch = [] } = shot.cam;
  const A = view(from), B = recipe === "glide" ? view(to!) : A;
  const f = Math.max(0, Math.round((t - shot.start) * fps));
  const dur = recipe === "glide" ? Math.min(40, Math.max(18, Math.round((shot.end - shot.start) * fps))) : 0;
  const punchF = punch.map((p) => Math.round((p - shot.start) * fps));
  const rate = (k: number) => (punchF.some((p) => k >= p && k < p + 6) ? 0.006 : recipe === "push" ? 0.006 : 0.0025);

  let c: Cam;
  if (f < dur) {
    const k = smootherstep(f / dur);
    c = { pos: mix3(A.pos, B.pos, k), look: mix3(A.look, B.look, k), fov: lerp(A.fov, B.fov, k), roll: lerp(A.roll, B.roll, k) };
  } else {
    let s = 1; // compounded fraction of the pos->look distance still left; creep counter restarts at the glide end
    for (let k = dur + 1; k <= f; k++) s *= 1 - rate(k);
    c = { ...B, pos: [0, 1, 2].map((i) => B.look[i] + (B.pos[i] - B.look[i]) * s) as V3 };
  }

  let a = 0;
  for (const p of shot.kicks ?? []) {
    const k = f - Math.round((p - shot.start) * fps);
    if (k >= 0 && k < 7) a += (1 - k / 7) * (k % 2 ? -1 : 1);
  }
  if (!a) return c;
  const d = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const r = [d[2], 0, -d[0]]; // d x up(0,1,0)
  const n = Math.hypot(r[0], r[2]) || 1;
  const off = r.map((v) => (v / n) * KICK_M * a);
  return { ...c, pos: c.pos.map((v, i) => v + off[i]) as V3, look: c.look.map((v, i) => v + off[i]) as V3, roll: c.roll + KICK_DEG * a };
}
