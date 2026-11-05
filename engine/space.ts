import * as THREE from "three";
import type { V3 } from "./camera";
import type { ActorSpec, ShotSpec, PropSpec } from "./spec";
import { propBounds, type Kit } from "./style/build";

/** Metres on the ground; turn is in degrees, as in PropSpec. Touching edges are allowed. */
export type GroundRect = { name: string; x: number; z: number; width: number; depth: number; turn: number };
export type Walkway = { from: V3; to: V3; width: number; via?: V3[] };
export const rect = (name: string, x: number, z: number, width: number, depth: number, turn = 0): GroundRect =>
  ({ name, x, z, width, depth, turn });
const axes = (r: GroundRect) => { const t = r.turn * Math.PI / 180; return [[Math.cos(t), -Math.sin(t)], [Math.sin(t), Math.cos(t)]]; };
export function overlaps(a: GroundRect, b: GroundRect) {
  const aa = axes(a), ba = axes(b);
  return [...aa, ...ba].every(([x, z]) => {
    const radius = (r: GroundRect, ax: number[][]) => Math.abs(x * ax[0][0] + z * ax[0][1]) * r.width / 2 + Math.abs(x * ax[1][0] + z * ax[1][1]) * r.depth / 2;
    return Math.abs((a.x - b.x) * x + (a.z - b.z) * z) < radius(a, aa) + radius(b, ba) - 1e-6;
  });
}
/** Shortest edge-to-edge distance on the ground, including rotated rectangles. */
export function groundDistance(a: GroundRect, b: GroundRect) {
  if (overlaps(a, b)) return 0;
  const corners = (r: GroundRect) => {
    const [u, v] = axes(r);
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) =>
      [r.x + x * u[0] * r.width / 2 + z * v[0] * r.depth / 2,
       r.z + x * u[1] * r.width / 2 + z * v[1] * r.depth / 2]);
  };
  const ac = corners(a), bc = corners(b);
  const pointEdges = (points: number[][], edges: number[][]) => Math.min(...points.flatMap((p) => edges.map((q, i) => {
    const end = edges[(i + 1) % 4], dx = end[0] - q[0], dz = end[1] - q[1];
    const t = Math.max(0, Math.min(1, ((p[0] - q[0]) * dx + (p[1] - q[1]) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(p[0] - q[0] - t * dx, p[1] - q[1] - t * dz);
  })));
  return Math.min(pointEdges(ac, bc), pointEdges(bc, ac));
}
export const MIN_CLEARANCE = 0.6;
export const pointRect = (name: string, p: V3, size = 0.6) => rect(name, p[0], p[2], size, size);
export const walkwayRect = (name: string, w: Walkway) => {
  if (w.via?.length) {
    const points = [w.from, ...w.via, w.to], xs = points.map(p => p[0]), zs = points.map(p => p[2]);
    return rect(`calçada ${name}`, (Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2,
      Math.max(...xs) - Math.min(...xs) + w.width, Math.max(...zs) - Math.min(...zs) + w.width);
  }
  return rect(`calçada ${name}`, (w.from[0] + w.to[0]) / 2, (w.from[2] + w.to[2]) / 2,
    w.width, Math.hypot(w.to[0] - w.from[0], w.to[2] - w.from[2]),
    Math.atan2(w.to[0] - w.from[0], w.to[2] - w.from[2]) * 180 / Math.PI);
};
export const walkwaySegments = (w: Walkway): Walkway[] => {
  const points = [w.from, ...(w.via ?? []), w.to];
  return points.slice(1).map((to, i) => ({ from: points[i], to, width: w.width }));
};
export function onWalkway(p: V3, w: Walkway): boolean {
  if (w.via?.length) return walkwaySegments(w).some(segment => onWalkway(p, segment));
  const r = walkwayRect("", w), t = r.turn * Math.PI / 180, dx = p[0] - r.x, dz = p[2] - r.z;
  return Math.abs(dx * Math.cos(t) - dz * Math.sin(t)) <= r.width / 2 + 1e-6 &&
    Math.abs(dx * Math.sin(t) + dz * Math.cos(t)) <= r.depth / 2 + 1e-6;
}
export const STREET_NEAR = 65, STREET_FAR = -1800;
export const streetWalkways = (): Record<string, Walkway> => ({
  praca: { from: [-65, 0.12, -18], to: [65, 0.12, -18], width: 1.4 },
  ...Object.fromEntries([-1, 1].flatMap((s) => {
  const from: V3 = [s * 5.25, 0.12, STREET_NEAR], to: V3 = [s * 5.25, 0.12, STREET_FAR];
  const side = s < 0 ? "esquerda" : "direita";
  return [[`${side}_ida`, { from, to, width: 0.5 }], [`${side}_volta`, { from: to, to: from, width: 0.5 }]];
})),
});
export function modelRect(name: string, model: THREE.Object3D, x: number, z: number, scale: number, turn: number) {
  const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const t = turn * Math.PI / 180;
  return rect(name, x + scale * (c.x * Math.cos(t) + c.z * Math.sin(t)), z + scale * (-c.x * Math.sin(t) + c.z * Math.cos(t)), size.x * scale, size.z * scale, turn);
}
export function propRect(p: PropSpec, spots: Record<string, V3>, kit: Kit, name: string) {
  const at = spots[p.at];
  const x = at[0] + (p.dx ?? 0), z = at[2] + (p.dz ?? 0), scale = p.scale ?? 1, turn = p.turn ?? 0;
  const native = modelRect(name, kit[p.model], x, z, scale, turn);
  const height = new THREE.Box3().setFromObject(kit[p.model]).getSize(new THREE.Vector3()).y * scale;
  // prop() replaces vegetation models with cartoon geometry: reserve that canopy as well as the GLB.
  const drawn = propBounds({}, p.model, x, at[1], z, height, turn * Math.PI / 180);
  if (drawn.isEmpty()) return native;
  const t = turn * Math.PI / 180;
  const width = Math.abs(Math.cos(t)) * native.width + Math.abs(Math.sin(t)) * native.depth;
  const depth = Math.abs(Math.sin(t)) * native.width + Math.abs(Math.cos(t)) * native.depth;
  const x0 = Math.min(drawn.min.x, native.x - width / 2), x1 = Math.max(drawn.max.x, native.x + width / 2);
  const z0 = Math.min(drawn.min.z, native.z - depth / 2), z1 = Math.max(drawn.max.z, native.z + depth / 2);
  return rect(name, (x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0);
}
/** Loop only at the off-screen ends; fixed step speed, independent of scene length and seek order. */
export function pathPosition(w: Walkway, absoluteTime: number) {
  if (w.via?.length) {
    const parts = walkwaySegments(w), lengths = parts.map(s => new THREE.Vector3(...s.from).distanceTo(new THREE.Vector3(...s.to)));
    const length = lengths.reduce((a, b) => a + b, 0);
    let distance = ((absoluteTime * 1.2) % length + length) % length;
    for (let i = 0; i < parts.length; i++) {
      if (distance < lengths[i] || i === parts.length - 1) {
        const dir = new THREE.Vector3(...parts[i].to).sub(new THREE.Vector3(...parts[i].from));
        return { p: new THREE.Vector3(...parts[i].from).addScaledVector(dir, distance / lengths[i]), dir };
      }
      distance -= lengths[i];
    }
  }
  const from = new THREE.Vector3(...w.from), dir = new THREE.Vector3(...w.to).sub(from), length = dir.length();
  const start = Math.max(0, Math.min(length, -from.dot(dir) / length));
  const distance = ((start + absoluteTime * 1.2) % length + length) % length;
  return { p: from.addScaledVector(dir, distance / length), dir };
}

/** Shared feet placement: validation and drawing must include the same movement and spot spread. */
export function actorPosition(shot: ShotSpec, spots: Record<string, V3>, walkways: Record<string, Walkway>, a: ActorSpec, t: number) {
  if (a.path) return pathPosition(walkways[a.path], t);
  const mates = shot.actors.filter((b) => !b.path && b.at === a.at);
  const off = (mates.indexOf(a) - (mates.length - 1) / 2) * 0.9;
  const A = new THREE.Vector3(...spots[a.at!]), B = a.to ? new THREE.Vector3(...spots[a.to]) : A.clone();
  const u = Math.max(0, Math.min(1, (t - shot.start) / (shot.end - shot.start)));
  const p = A.clone().lerp(B, u * u * (3 - 2 * u)); p.x += off;
  return { p, dir: B.sub(A) };
}

/** Continuous clearance: split at wraps, then bound distance changes by maximum relative speed. */
export function crowdNearTime(shot: ShotSpec, spots: Record<string, V3>, walkways: Record<string, Walkway>, extra: ActorSpec, speaker: ActorSpec): number | undefined {
  const w = walkways[extra.path!];
  const cuts = [shot.start];
  if (!w.via?.length) {
    const dir = new THREE.Vector3(...w.to).sub(new THREE.Vector3(...w.from)), length = dir.length();
    const offset = Math.max(0, Math.min(length, -new THREE.Vector3(...w.from).dot(dir) / length));
    for (let k = Math.floor((offset + shot.start * 1.2) / length) + 1; (k * length - offset) / 1.2 < shot.end; k++) cuts.push((k * length - offset) / 1.2);
  }
  cuts.push(shot.end);
  const speed = 1.2 + (speaker.to ? 1.5 * new THREE.Vector3(...spots[speaker.at!]).distanceTo(new THREE.Vector3(...spots[speaker.to])) / (shot.end - shot.start) : 0);
  const distance = (t: number) => {
    const a = actorPosition(shot, spots, walkways, extra, t).p, b = actorPosition(shot, spots, walkways, speaker, t).p;
    return Math.hypot(a.x - b.x, a.z - b.z);
  };
  const search = (lo: number, hi: number): number | undefined => {
    const mid = (lo + hi) / 2, d = distance(mid);
    if (d < 3 - 1e-9) return mid;
    if (d - speed * (hi - lo) / 2 >= 3 || hi - lo < 1e-9) return;
    return search(lo, mid) ?? search(mid, hi);
  };
  for (let i = 1; i < cuts.length; i++) {
    const t = search(cuts[i - 1], cuts[i]);
    if (t !== undefined) return t;
  }
}
