import { rect } from "../space";
// Neutral stage for lists and trivia: one warm floor running into a teal cyclorama (floor -> cove -> wall leaning back
// 30 deg, one smooth surface, so the ink pass draws no line at the join), colour blended across the cove. The lean keeps
// the wall facing the day sun (camera-relative, az 75 / el 48), so it falls off smoothly instead of a lit/shade edge.
// The wall is tall and wide enough that no default view sees past it; the sky stops are teal too in case one does.
import * as THREE from "three";
import { lam } from "../style/build";
import type { SetDef } from "./types";

const FLOOR = "#ddb27a", WALL = "#4f908d";
const Z0 = -5.5, R = 3, LEAN = Math.PI / 3, TOP = 25, W = 30, FRONT = 40; // cove from z = Z0, LEAN = cove arc (wall 30 deg off vertical)

/** profile in (z, y) with its normal and a 0..1 floor -> wall colour weight, extruded along x */
const cyclorama = () => {
  const prof: { z: number; y: number; nz: number; ny: number; k: number }[] = [];
  for (const z of [FRONT, 0, -3.5]) prof.push({ z, y: 0, nz: 0, ny: 1, k: 0 });
  const N = 20;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * LEAN;
    prof.push({ z: Z0 - R * Math.sin(a), y: R - R * Math.cos(a), nz: Math.sin(a), ny: Math.cos(a), k: Math.min(1, 0.35 + i / 14) });
  }
  const e = prof[prof.length - 1], L = (TOP - e.y) / Math.sin(LEAN);
  prof.push({ ...e, z: e.z - L * Math.cos(LEAN), y: TOP });
  const fl = new THREE.Color(FLOOR), wa = new THREE.Color(WALL), c = new THREE.Color();
  const pos: number[] = [], nor: number[] = [], col: number[] = [], idx: number[] = [];
  prof.forEach((p, i) => {
    c.copy(fl).lerp(wa, p.k); // weight 0 on the floor up to z -3.5, 0.35 at the cove start, 1 a little up the cove
    for (const x of [-W, W]) { pos.push(x, p.y, p.z); nor.push(0, p.ny, p.nz); col.push(c.r, c.g, c.b); }
    if (i) { const a = 2 * (i - 1), b = a + 1, d = a + 2, f = a + 3; idx.push(a, b, d, b, f, d); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
};

export const palco: SetDef = {
  id: "palco", walkways: {}, blocked: () => {
    const end = Z0 - R * Math.sin(LEAN) - (TOP - R * (1 - Math.cos(LEAN))) / Math.tan(LEAN);
    return [rect("ciclorama", 0, (Z0 + end) / 2, W * 2, Z0 - end)];
  },
  sky: true,
  spots: { centro: [0, 0, 0], esquerda: [-1.6, 0, 0], direita: [1.6, 0, 0], fundo: [0, 0, -3] },
  views: {
    aberto: { pos: [0, 0.8, 11], look: [0, 0.8, 0], fov: 50, roll: 0 },
    medio: { pos: [0, 0.62, 7.2], look: [0, 0.62, 0], fov: 45, roll: 0 },
    close: { pos: [0, 0.8, 3.4], look: [0, 0.8, 0], fov: 50, roll: 0 },
    baixo: { pos: [0, 0.45, 8], look: [0, 0.62, 0], fov: 50, roll: 0 },
  },
  look: { sky: { c: ["#7cc0bb", "#6bb3ae", "#5aa6a1", "#4c9a96", "#3f8e8a"], e: [0, 3, 8, 16, 40] } },
  build(root) {
    const m = new THREE.Mesh(cyclorama(), lam("palco", () => ({ vertexColors: true })));
    m.receiveShadow = true;
    root.add(m);
  },
};
