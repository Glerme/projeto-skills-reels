import type { ShotSpec } from "./spec";

export type V3 = [number, number, number];
export type Cam = { pos: V3; look: V3; fov: number; roll: number };

const smootherstep = (x: number) => x * x * x * (x * (6 * x - 15) + 10);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const mix3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const KICK_M = 0.06, KICK_DEG = 0.6;

export function camAt(shot: ShotSpec, t: number, views: Record<string, Cam>, fps = 30, spots?: Record<string, V3>): Cam {
  const view = (n: string) => { const v = views[n]; if (!v) throw new Error(`view desconhecida: ${n}`); return v; };
  const { recipe, from, to, punch = [] } = shot.cam;
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
  c = { ...c, pos: mix3(c.pos, c.look, extra) };

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
export function cameraCut(previous: ShotSpec, next: ShotSpec, views: Record<string, Cam>, spots?: Record<string, V3>): string[] {
  const a = camAt({ ...previous, kicks: [] }, previous.end, views, 30, spots);
  const b = camAt({ ...next, kicks: [] }, next.start, views, 30, spots);
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
  const lateralLimit = previous.set === "paris" ? 0.2 : Math.min(da, db) * 0.5;
  if (angle > angleLimit + 1e-6 || sideways > lateralLimit + 1e-6 || (u[0] * v[0] < 0 && Math.min(Math.abs(u[0]), Math.abs(v[0])) > 0.5))
    errors.push(`câmera muda de lado/eixo (deslocamento transversal > ${previous.set === "paris" ? "0,2 m" : "50% da menor distância"}) ou direção mais de ${angleLimit}°`);
  if ((i >= 0 && j >= 0 && Math.abs(i - j) > 1) || Math.max(da / db, db / da) > 2.5 + 1e-6)
    errors.push("câmera pula distância: use no máximo um degrau (aberto↔medio↔close) e razão de distância ≤ 2,5");
  return errors;
}
