// Nature: an open meadow (grassHD) with a lake behind the spots, Kenney trees around the lake and along the sides,
// bushes kept away from the lenses, rolling hills fading into the fog. The lake is a static painted
// surface (deep-to-shallow blue, sparse crest marks): sets have no per-frame hook for the original river shader.
import * as THREE from "three";
import { Batch, V, lam, prop, quad, type Kit } from "../style/build";
import { ctex, grassHD, rng } from "../style/paint";
import type { SetDef } from "./types";

const LAKE_Z = -22, LAKE_RX = 26, LAKE_RZ = 9;

/** lake paint: deep centre to a lighter shallow rim (radial), sparse white crest arcs */
const lakeTex = () => ctex("lakeHD", 1024, 1024, (g, r) => {
  const gr = g.createRadialGradient(512, 512, 60, 512, 512, 512);
  gr.addColorStop(0, "#1a6aa8"); gr.addColorStop(0.8, "#1f8fb4"); gr.addColorStop(1, "#3fb3bf");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  g.strokeStyle = "rgba(225,248,250,0.7)"; g.lineCap = "round";
  for (let k = 0; k < 70; k++) {
    const x = 80 + r() * 864, y = 80 + r() * 864, w = 14 + r() * 30;
    g.lineWidth = 3 + r() * 2; g.beginPath(); g.arc(x, y + w, w, Math.PI * 1.25, Math.PI * 1.75); g.stroke();
  }
});

const build = (root: THREE.Group, kit: Kit) => {
  const b = new Batch(), r = rng(41);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length) % a.length];
  // meadow grass muted (x #c8d2a4): the full grassHD under a high sun went lemon-lime on this large open floor
  const grass = lam("meadowHD", () => ({ map: grassHD(), color: "#c8d2a4" }));
  b.add(quad(V(-900, 0, 900), V(900, 0, 900), V(900, 0, -900), V(-900, 0, -900), 450, 450), grass);
  // lake: an ellipse just above the grass, with a sandy rim
  const rim = new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2);
  b.add(rim, lam("lakeRim", () => ({ color: "#d9c48f" })), new THREE.Matrix4().compose(V(0, 0.004, LAKE_Z), new THREE.Quaternion(), V(LAKE_RX + 1.2, 1, LAKE_RZ + 0.9)));
  b.add(rim, lam("lake", () => ({ map: lakeTex() })), new THREE.Matrix4().compose(V(0, 0.008, LAKE_Z), new THREE.Quaternion(), V(LAKE_RX, 1, LAKE_RZ)));
  // trees: a ring behind the lake, groves on both sides of the meadow
  const trees = ["tree_oak", "tree_default", "tree_detailed", "tree_fat", "tree-high-round", "tree", "tree_cone"];
  for (let i = 0; i < 26; i++) {
    const a = Math.PI * (0.05 + 0.9 * (i / 25)), x = -Math.cos(a) * (LAKE_RX + 6 + r() * 8), z = LAKE_Z - Math.sin(a) * (LAKE_RZ + 5 + r() * 8);
    prop(b, kit, pick(trees), x, 0, z, 7 + r() * 4, r() * 6);
  }
  for (let i = 0; i < 40; i++) {
    const sx = r() < 0.5 ? -1 : 1, x = sx * (9 + r() * 30), z = 12 - r() * 34;
    prop(b, kit, pick(trees), x, 0, z, 6 + r() * 4, r() * 6);
  }
  // bushes at the meadow edges (no Kenney flowers: at this size they read as purple boxes) (prop() drops anything on a camera's centre line)
  for (let i = 0; i < 14; i++) prop(b, kit, pick(["plant_bushLarge", "plant_bushDetailed", "plant_bush"]), (r() < 0.5 ? -1 : 1) * (4.5 + r() * 5), 0, -2 - r() * 10, 0.9 + r() * 0.5, r() * 6);
  // hills on the horizon, in the fog
  const hill = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const hm = [lam("hillA", () => ({ color: "#78b257" })), lam("hillB", () => ({ color: "#6aa24e" })), lam("hillC", () => ({ color: "#8bbf63" }))];
  ([[-220, -260, 170, 46, 110], [60, -300, 220, 60, 130], [260, -210, 160, 44, 120], [-380, -80, 180, 40, 140], [380, -40, 170, 42, 120]] as const)
    .forEach(([x, z, sx, sy, sz], i) => b.add(hill, hm[i % 3], new THREE.Matrix4().compose(V(x, -2, z), new THREE.Quaternion(), V(sx, sy, sz))));
  b.build(root);
};

export const natureza: SetDef = {
  id: "natureza",
  sky: true,
  spots: { centro: [0, 0, 0], esquerda: [-1.6, 0, 0.3], direita: [1.6, 0, -0.2], fundo: [0, 0, -5] },
  views: {
    aberto: { pos: [0, 1.6, 7], look: [0, 1.2, -4], fov: 60, roll: 0 },
    medio: { pos: [0, 1.5, 3.6], look: [0, 1.15, 0], fov: 45, roll: 0 },
    close: { pos: [0.1, 1.55, 1.9], look: [0, 1.5, 0], fov: 38, roll: 0 },
    baixo: { pos: [0.4, 0.6, 4], look: [0, 1.8, -3], fov: 55, roll: 0 },
  },
  build,
};
