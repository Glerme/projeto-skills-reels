// Dry rocky valley (stylised, for ancient / biblical stories): ochre dirt ground with pebbles, a narrow stream across
// the middle ground with smooth stones on its banks, boulders and sparse dry bushes at the sides, dry hills left and
// right with the tents of two camps on them, hills fading into the haze behind. Not an archaeological reconstruction.
// Views: the usual four plus `duelo`, a wide shot with one actor near-left (duelo_a) and one far-right (duelo_b).
import * as THREE from "three";
import { Batch, V, lam, prop, quad, type Kit } from "../style/build";
import { ctex, jit, rng } from "../style/paint";
import type { SetDef } from "./types";

const STREAM_Z = -2.6, STREAM_W = 1.1;

/** dry ochre dirt: soft value patches, pebbles, a few hairline cracks; 4 m per repeat */
const dirtTex = () => ctex("dirtHD", 1024, 1024, (g, r) => {
  g.fillStyle = "#c9a26a"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 70; i++) { // broad patches
    g.fillStyle = jit(r, i % 2 ? "#d4b07a" : "#bd955f", 0.06, 3, 0.1);
    g.globalAlpha = 0.35; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 40 + r() * 90, 25 + r() * 60, r() * 3, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 260; i++) { // pebbles
    const x = r() * 1024, y = r() * 1024, s = 2 + r() * 5;
    g.fillStyle = jit(r, "#a88b62", 0.12, 4, 0.15); g.beginPath(); g.ellipse(x, y, s, s * 0.75, r() * 3, 0, 7); g.fill();
  }
  g.strokeStyle = "rgba(110,80,50,0.35)"; g.lineWidth = 2;
  for (let i = 0; i < 18; i++) { let x = r() * 1024, y = r() * 1024; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
});

const build = (root: THREE.Group, kit: Kit) => {
  const b = new Batch(), r = rng(53);
  const dirt = lam("dirtHD", () => ({ map: dirtTex() }));
  b.add(quad(V(-900, 0, 900), V(900, 0, 900), V(900, 0, -900), V(-900, 0, -900), 450, 450), dirt);
  // stream: a shallow blue band across the valley with lighter edges, smooth stones on both banks
  const water = lam("valeWater", () => ({ color: "#5a96ac" })), edge = lam("valeWaterEdge", () => ({ color: "#94bcc0" }));
  b.add(quad(V(-60, 0.006, STREAM_Z + STREAM_W / 2 + 0.25), V(60, 0.006, STREAM_Z + STREAM_W / 2 + 0.25), V(60, 0.006, STREAM_Z - STREAM_W / 2 - 0.25), V(-60, 0.006, STREAM_Z - STREAM_W / 2 - 0.25)), edge);
  b.add(quad(V(-60, 0.01, STREAM_Z + STREAM_W / 2), V(60, 0.01, STREAM_Z + STREAM_W / 2), V(60, 0.01, STREAM_Z - STREAM_W / 2), V(-60, 0.01, STREAM_Z - STREAM_W / 2)), water);
  const pebble = new THREE.SphereGeometry(1, 10, 6), stoneM = [lam("valeStoneA", () => ({ color: "#b8ad9c" })), lam("valeStoneB", () => ({ color: "#a39886" }))];
  for (let i = 0; i < 70; i++) {
    const x = (r() - 0.5) * 24, side = r() < 0.5 ? -1 : 1, z = STREAM_Z + side * (STREAM_W / 2 + 0.15 + r() * 0.5), s = 0.06 + r() * 0.1;
    if (Math.abs(x) < 0.5 && z > STREAM_Z) continue; // keep the pick spot clear
    b.add(pebble, stoneM[i % 2], new THREE.Matrix4().compose(V(x, s * 0.4, z), new THREE.Quaternion(), V(s * 1.4, s * 0.7, s)));
  }
  // boulders at the sides and behind (faceted rocks)
  const rock = new THREE.IcosahedronGeometry(1, 0), rockM = [lam("valeRockA", () => ({ color: "#a89c86" })), lam("valeRockB", () => ({ color: "#9a8d78" })), lam("valeRockC", () => ({ color: "#b5a68c" }))];
  for (let i = 0; i < 46; i++) {
    const sx = r() < 0.5 ? -1 : 1, x = sx * (4.5 + r() * 26), z = 6 - r() * 40, s = 0.4 + r() * 1.4;
    b.add(rock, rockM[i % 3], new THREE.Matrix4().compose(V(x, s * 0.45, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)), V(s * 1.3, s * 0.8, s)));
  }
  // dry hills on both sides of the valley and far behind
  const hill = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const hm = [lam("valeHillA", () => ({ color: "#c2a06a" })), lam("valeHillB", () => ({ color: "#b08f5c" })), lam("valeHillC", () => ({ color: "#cbb07a" }))];
  ([[-55, -40, 45, 16, 60], [55, -45, 50, 18, 60], [-35, -110, 70, 22, 40], [40, -120, 80, 26, 45], [0, -260, 220, 50, 80], [-200, -150, 120, 34, 90], [210, -140, 130, 36, 90]] as const)
    .forEach(([x, z, sx, sy, sz], i) => b.add(hill, hm[i % 3], new THREE.Matrix4().compose(V(x, -1.5, z), new THREE.Quaternion(), V(sx, sy, sz))));
  // the two camps: tents on the hill slopes (left: Israel, right: Philistines)
  const tent = new THREE.ConeGeometry(1, 1.4, 4, 1), tentM = [lam("valeTentA", () => ({ color: "#e6d6b4" })), lam("valeTentB", () => ({ color: "#b98a5a" })), lam("valeTentC", () => ({ color: "#d9c39a" }))];
  for (const sx of [-1, 1]) for (let i = 0; i < 9; i++) {
    const x = sx * (16 + r() * 18), z = -26 - r() * 26, y = 6 + r() * 5, s = 1.4 + r() * 0.8;
    b.add(tent, tentM[i % 3], new THREE.Matrix4().compose(V(x, y + s * 0.7, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.PI / 4 + r()), V(s * 1.4, s, s * 1.4)));
  }
  // sparse dry bushes at the sides (prop() keeps them off the cameras' centre lines)
  for (let i = 0; i < 16; i++) prop(b, kit, i % 2 ? "plant_bush" : "plant_bushDetailed", (r() < 0.5 ? -1 : 1) * (3.5 + r() * 8), 0, 3 - r() * 14, 0.6 + r() * 0.5, r() * 6);
  b.build(root);
};

export const vale: SetDef = {
  id: "vale",
  sky: true,
  spots: { centro: [0, 0, 0], esquerda: [-1.1, 0, 0.3], direita: [1.1, 0, -0.2], fundo: [0, 0, -5], riacho: [0.2, 0, STREAM_Z + STREAM_W / 2 + 0.35],
    duelo_a: [-1.0, 0, 2.2], duelo_b: [1.3, 0, -3.6] },
  views: {
    aberto: { pos: [0, 1.6, 7], look: [0, 1.2, -4], fov: 60, roll: 0 },
    medio: { pos: [0, 1.5, 3.6], look: [0, 1.15, 0], fov: 45, roll: 0 },
    close: { pos: [0.1, 1.55, 1.9], look: [0, 1.25, 0], fov: 38, roll: 0 },
    baixo: { pos: [0.4, 0.6, 4], look: [0, 1.8, -3], fov: 55, roll: 0 },
    duelo: { pos: [-1.6, 1.35, 6.8], look: [0.5, 1.7, -1.4], fov: 56, roll: 0 },
    riacho: { pos: [0.6, 1.1, 1.6], look: [0.2, 0.5, -2.0], fov: 50, roll: 0 },
    queda: { pos: [0.05, 1.3, 3.6], look: [-0.15, 0.9, -3.6], fov: 57, roll: 0 }, // a giant at duelo_b falling to the left fits whole
  },
  build,
};
