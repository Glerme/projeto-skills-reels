// Street: a straight cobbled street (x -4..4) running along z, stone sidewalks to |x| = 6, two rows of gabled houses
// (fronts on |x| = 6, the town houses of the bridge short), a side street opening to +x at the corner (esquina, z -18..-10),
// planter trees, lanterns, a stall and a cart, gardens and hills behind for the aerial view. Ground y = 0, no river,
// no bridge, no flag. Houses and props that would block any camera of the video are left out by the sight lines
// the Stage sets before build (house() / prop() test them).
import * as THREE from "three";
import { Batch, V, boxGeo, house, lam, prop, quad, type Kit } from "../style/build";
import { cobbleHD, grassHD, rng, stoneHD } from "../style/paint";
import type { SetDef } from "./types";

const W = 4, SW = 6;                  // street half-width, sidewalk outer edge (house fronts)
const Z_NEAR = 34, Z_FAR = -100;      // main rows
const C0 = -18, C1 = -10;             // side street (corner) z range, opening to +x
const SIDE_END = 52;                  // side street length along x
const HEIGHTS = [7, 8.4, 9.8];

/** ground quad facing up, x0..x1 by z0..z1 (z0 > z1 is fine), texture repeat every `tile` metres */
const floor = (x0: number, x1: number, za: number, zb: number, tile: number, y = 0) => {
  const z0 = Math.max(za, zb), z1 = Math.min(za, zb);
  return quad(V(x0, y, z0), V(x1, y, z0), V(x1, y, z1), V(x0, y, z1), (x1 - x0) / tile, (z0 - z1) / tile);
};

const build = (root: THREE.Group, kit: Kit) => {
  const b = new Batch(), r = rng(23);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length) % a.length];
  const cobble = lam("cobbleHD", () => ({ map: cobbleHD() }));
  const pave = lam("paveHD", () => ({ map: stoneHD("copeHD", ["#e6dccd", "#ddd3c3", "#ece4d6", "#d6cbba"], "#aea293") }));
  const grass = lam("grassHD", () => ({ map: grassHD() }));
  const curb = lam("curb", () => ({ color: "#c9bba6" }));

  // ---- ground: grass everywhere (just below), cobbles on the streets, pale stone on the sidewalks, curbs ----
  b.add(floor(-900, 900, 900, -900, 4, -0.02), grass);
  b.add(floor(-W, W, Z_NEAR + 40, Z_FAR - 20, 4), cobble);
  b.add(floor(SW, SIDE_END + 20, C1, C0, 4, 0.002), cobble); // side street
  for (const s of [-1, 1]) b.add(floor(s < 0 ? -SW : W, s < 0 ? -W : SW, Z_NEAR + 40, Z_FAR - 20, 2, 0.004), pave);
  b.add(floor(SW, SIDE_END + 20, C1 + 2, C1, 2, 0.004), pave);
  b.add(floor(SW, SIDE_END + 20, C0, C0 - 2, 2, 0.004), pave);
  // yards under the house rows: a house the sight lines leave out shows a paved yard, not a hole of lawn
  for (const s of [-1, 1]) b.add(floor(s < 0 ? -SW - 9 : SW, s < 0 ? -SW : SW + 9, Z_NEAR, Z_FAR, 2, 0.003), pave);
  for (const s of [-1, 1]) {
    const x = s * W;
    if (s < 0) b.add(boxGeo(V(x - 0.12, 0, Z_FAR - 20), V(x + 0.12, 0.12, Z_NEAR + 40)), curb);
    else {
      b.add(boxGeo(V(x - 0.12, 0, C1), V(x + 0.12, 0.12, Z_NEAR + 40)), curb);
      b.add(boxGeo(V(x - 0.12, 0, Z_FAR - 20), V(x + 0.12, 0.12, C0)), curb);
    }
  }

  // ---- main rows: fronts on |x| = 6, facing the street ----
  for (const sx of [-1, 1]) {
    let z = Z_NEAR;
    while (z > Z_FAR) {
      const w = pick([7, 9]), h = pick(HEIGHTS), cz = z - w / 2, si = Math.floor(r() * 8);
      const inCorner = sx > 0 && cz + w / 2 > C0 - 0.5 && cz - w / 2 < C1 + 2.5;
      if (!inCorner) house(b, sx * (SW + 4), cz, sx < 0 ? Math.PI / 2 : -Math.PI / 2, w, 8, h, si);
      z -= w + (r() < 0.2 ? 2.5 : 0.25);
    }
  }
  // side street rows (fronts on z = C1 + 2 facing -z, and z = C0 - 2 facing +z)
  for (const [zf, yaw, dz] of [[C1 + 2, Math.PI, 4], [C0 - 2, 0, -4]] as const) {
    let x = SW + 9;
    while (x < SIDE_END) {
      const w = pick([7, 9]), h = pick(HEIGHTS);
      house(b, x + w / 2, zf + dz, yaw, w, 8, h, Math.floor(r() * 8));
      x += w + 0.25;
    }
  }
  // the far end: a cross row closing the street
  for (let x = -13; x < 13; x += 9.25) house(b, x + 4.5, Z_FAR - 12, 0, 9, 8, pick(HEIGHTS), Math.floor(r() * 8));

  // ---- street furniture (sidewalks, |x| 4.6..5.3), kept out of the corner and away from the lenses ----
  const trees = ["tree_oak", "tree_default", "tree_detailed", "tree_fat"];
  for (let z = -8; z > Z_FAR + 6; z -= 13) {
    prop(b, kit, pick(trees), -5.1, 0, z, 5.2 + r() * 1.2, r() * 6);
    if (z > C1 + 3 || z < C0 - 3) prop(b, kit, pick(trees), 5.1, 0, z - 6, 5.2 + r() * 1.2, r() * 6);
  }
  for (let z = -12; z > Z_FAR + 6; z -= 13) for (const s of [-1, 1]) if (s < 0 || z > C1 + 2 || z < C0 - 2) prop(b, kit, "lantern", s * 4.6, 0, z, 2.8);
  prop(b, kit, "stall-red", -5.0, 0, -27, 3.2, Math.PI / 2);
  prop(b, kit, "stall-bench", -4.8, 0, -31, 1.0, Math.PI / 2);
  prop(b, kit, "cart", 3.0, 0, -40, 2.2, 0.3);
  prop(b, kit, "stall-green", SW + 6, 0, C1 + 1.2, 3.2, Math.PI);

  // ---- behind the rows: gardens with trees above the roofs, hills on the horizon (aerial view) ----
  for (let i = 0; i < 90; i++) {
    const sx = r() < 0.5 ? -1 : 1, x = sx * (16 + r() * 40), z = Z_FAR + r() * (Z_NEAR - Z_FAR + 30);
    if (sx > 0 && z > C0 - 12 && z < C1 + 12) continue; // the side-street block
    prop(b, kit, pick(["tree_oak", "tree_default", "tree-high-round", "tree"]), x, 0, z, 8 + r() * 4, r() * 6);
  }
  const hill = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const hm = [lam("hillA", () => ({ color: "#78b257" })), lam("hillB", () => ({ color: "#6aa24e" })), lam("hillC", () => ({ color: "#8bbf63" }))];
  ([[-300, -260, 190, 52, 120], [120, -380, 240, 64, 140], [380, -150, 170, 48, 130], [-420, 60, 190, 44, 150], [300, 240, 210, 54, 130],
    [-160, 380, 250, 58, 140]] as const).forEach(([x, z, sx, sy, sz], i) =>
    b.add(hill, hm[i % 3], new THREE.Matrix4().compose(V(x, -2, z), new THREE.Quaternion(), V(sx, sy, sz))));
  b.build(root);
};

export const rua: SetDef = {
  id: "rua",
  sky: true,
  spots: { centro: [0, 0, 0], esquerda: [-1.6, 0, 0.3], direita: [1.6, 0, -0.3], fundo: [0, 0, -6], esquina: [4.8, 0, -14] },
  views: {
    aberto: { pos: [0, 1.7, 9], look: [0, 1.4, -8], fov: 50, roll: 0 },
    medio: { pos: [0.4, 1.6, 4.2], look: [0, 1.15, 0], fov: 45, roll: 0 },
    close: { pos: [0.2, 1.55, 2.0], look: [0, 1.25, 0], fov: 38, roll: 0 },
    baixo: { pos: [0.5, 0.6, 4.0], look: [0, 2.6, -3], fov: 55, roll: 0 },
    aereo: { pos: [2, 16, 16], look: [0, 0, -14], fov: 50, roll: 0 },
  },
  build,
};
