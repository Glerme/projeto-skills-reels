import { Layout } from "./layout";
import { rect, STREET_NEAR, type Walkway } from "../space";
import * as THREE from "three";
import { Batch, V, boxGeo, lam, type Kit } from "../style/build";
import { twoTone } from "../style/shade";
import { rua, drawCrosswalk, STREET_PAVEMENTS } from "./rua";
import type { SetDef } from "./types";

const TX = 0, TZ = -65, TOWER_RADIUS = 4.5;
const PARIS_PLAZA_FRONT = -5.3;
const walkways = {
  ...rua.walkways,
  lateral_esquerda: { from: [-6.5, 0.12, -3.5] as [number, number, number], to: [-65, 0.12, -3.5] as [number, number, number], width: 1 },
  lateral_direita: { from: [4.4, 0.12, -3.5] as [number, number, number], to: [65, 0.12, -3.5] as [number, number, number], width: 1 },
  praca_frente: { from: [-8, 0.12, -6] as [number, number, number], to: [8, 0.12, -6] as [number, number, number], width: 1.4 },
  // Closed forecourt route: no on-screen wrap, always behind and to the right of the presenter.
  praca_perto: { from: [2.3, 0.12, -13], via: [[2.5, 0.12, -13], [2.5, 0.12, -14], [2.3, 0.12, -14]], to: [2.3, 0.12, -13], width: 1.4 } as Walkway,
};
export const PARIS_PAVEMENTS = [...STREET_PAVEMENTS,
  { x0: -1800, x1: 1800, z0: -1800, z1: PARIS_PLAZA_FRONT },
  { x0: -65, x1: -4, z0: -4, z1: -3 },
  { x0: 4, x1: 65, z0: -4, z1: -3 }];
const drawBuilding = (b: Batch, s: number, z: number, edge = 10) => {
  const facade = twoTone(new THREE.MeshLambertMaterial({ color: "#bc8b58" }), 0);
  const trim = lam("parisTrim", () => ({ color: "#cfaa76" }));
  const roof = lam("parisRoof", () => ({ color: "#77746b" }));
  const windows = new THREE.MeshBasicMaterial({ color: "#70543a" });
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material) =>
    b.add(boxGeo(V(x - w / 2, y, z - d / 2), V(x + w / 2, y + h, z + d / 2)), mat);
      const x = s * edge, h = z % 20 === -12 ? 7.2 : 8.4;
      box(x, 0, z, 8, h, 9.7, facade);
      box(x, h, z, 8.3, 0.3, 10, trim);
      box(x, h + 0.3, z, 7.8, 0.8, 9.5, roof);
      for (const y of [1.2, 4, 6.5]) {
        if (y + 1.2 > h) continue;
        for (const dz of [-3, 0, 3]) {
          box(s * (edge - 4.02), y, z + dz, 0.04, 1.2, 0.85, windows);
          box(s * (edge - 4.12), y - 0.12, z + dz, 0.24, 0.12, 1.1, trim);
        }
      }

};
const plan = (kit: Kit) => {
  const layout = new Layout(kit, rua.spots, walkways);
  layout.add(rect("torre", TX, TZ, 2 * (TOWER_RADIUS + 0.38), 2 * (TOWER_RADIUS + 0.38)), () => {});
  for (const side of [-1, 1]) for (let z = -12; z >= -52; z -= 11) {
    if (side > 0 && z === -12) continue;
    // The full building includes cornices and window sills.
    layout.add(rect(`prédio ${side}/${z}`, side * 9.9, z, 8.5, 10), (b) => drawBuilding(b, side, z));
    layout.prop("lantern", side * 4.7, 0.12, z - 4, 3.1);
  }
  // Continuous side facades enclose the plaza, leaving the tower footprint clear.
  for (const side of [-1, 1]) for (let z = -63; z >= -382; z -= 11) {
    layout.add(rect(`fachada ${side}/${z}`, side * 14, z, 8.5, 10), (b) => drawBuilding(b, side, z, 14));
    layout.prop("tree_default", side * 7.6, 0.12, z, 3);
    layout.prop("lantern", side * 8, 0.12, z - 5, 3.1);
  }
  // Low outer blocks close the exposed yards and the aerial horizon, up to the fog.
  for (const side of [-1, 1]) for (let z = 54; z >= -382; z -= 11) {
    layout.add(rect(`quarteirão ${side}/${z}`, side * 26, z, 8.5, 10), (b) => drawBuilding(b, side, z, 26));
  }
  for (const [name, x, z, h] of [
    ["car-sedan", -3.1, 10, 1.15], ["car-hatchback-sports", -3.1, 23, 0.95],
    ["car-van", -3.1, 36, 1.2], ["car-taxi", 3.1, 24, 1.35], ["car-suv", 3.1, 39, 1.1],
  ] as const) if (z > PARIS_PLAZA_FRONT) layout.prop(name, x, 0, z, h, x < 0 ? 0 : Math.PI);
  return layout;
};

const build = (root: THREE.Group, kit: Kit) => {
  const b = new Batch();
  const stone = lam("parisPavement", () => ({ color: "#aaa99f" }));
  const road = lam("parisRoad", () => ({ color: "#89857a" }));
  // The shared blue shadow lift washed out neutral iron; bronze keeps its albedo in shade.
  const iron = twoTone(new THREE.MeshLambertMaterial({ color: "#89704e" }), 0);
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material) =>
    b.add(boxGeo(V(x - w / 2, y, z - d / 2), V(x + w / 2, y + h, z + d / 2)), mat);
  // Extend beyond the fog horizon so the aerial view never exposes the ground edge.
  box(0, -0.15, -40, 3600, 0.12, 3600, stone);
  box(0, -0.03, (STREET_NEAR + PARIS_PLAZA_FRONT) / 2, 8, 0.03, STREET_NEAR - PARIS_PLAZA_FRONT, road);
  for (const a of PARIS_PAVEMENTS) box((a.x0 + a.x1) / 2, 0, (a.z0 + a.z1) / 2,
    a.x1 - a.x0, 0.12, a.z1 - a.z0, stone);
  drawCrosswalk(b);

  // Models run along local z: parallel to the curbs, roof at adult chest height.
  // Keep the right-hand corner approach (-6..-18) and the tower forecourt clear.
  // prop applies the same Lambert/two-tone palette treatment as the Kenney lanterns.
  const cars = new Batch();
  plan(kit).draw(cars);
  const parked = new THREE.Group();
  cars.build(parked);
  // Mute the car atlas locally; keep both source textures and the shared style profile intact.
  const carMaps = new Set<THREE.Texture>();
  for (const [name, model] of Object.entries(kit)) if (name.startsWith("car-")) model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const map = (material as THREE.MeshStandardMaterial).map;
      if (map) carMaps.add(map);
    }
  });
  for (const child of parked.children) {
    const mesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
    if (!mesh.material.map || !carMaps.has(mesh.material.map)) continue;
    const mat = twoTone(mesh.material.clone());
    const compile = mat.onBeforeCompile;
    mat.onBeforeCompile = (shader, renderer) => {
      compile.call(mat, shader, renderer);
      shader.uniforms.uSat = { value: 0.55 };
    };
    mesh.material = mat;
  }
  root.add(parked);

  // Four splayed legs, observation decks and cross-braces: open centre, no solid pyramid.
  // Far behind every actor spot; the offset leaves the central face against open sky.
  const tx = TX, tz = TZ;
  const beam = (a: THREE.Vector3, c: THREE.Vector3, width: number) => {
    const d = c.clone().sub(a);
    b.add(new THREE.BoxGeometry(width, d.length(), width), iron,
      new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5),
        new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()), V(1, 1, 1)));
  };
  // A 9 m footprint for 27 m of height; the slope eases inward as the legs rise.
  const levels = [[0, TOWER_RADIUS], [1.5, 3.65], [3, 3.05], [5, 2.5], [7, 2.2],
    [10, 1.7], [14, 1.2], [19, 0.65], [24, 0.35]] as const;
  for (let i = 0; i < levels.length - 1; i++) {
    const [y0, r0] = levels[i], [y1, r1] = levels[i + 1];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      beam(V(tx + sx * r0, y0, tz + sz * r0), V(tx + sx * r1, y1, tz + sz * r1), 0.38);
      // Keep the lower opening clear; lattice belongs above the first deck.
      if (y0 >= 7) {
        beam(V(tx + sx * r0, y0, tz + sz * r0), V(tx - sx * r1, y1, tz + sz * r1), 0.16);
        beam(V(tx + sx * r0, y0, tz + sz * r0), V(tx + sx * r1, y1, tz - sz * r1), 0.16);
      }
    }
  }
  // Four broad arches join the legs below the first platform, also readable from above.
  for (const side of [-1, 1]) for (const axis of ["x", "z"] as const) {
    const point = (t: number) => {
      const across = 3.65 * Math.cos(t), y = 1.5 + 4.8 * Math.sin(t);
      const r = THREE.MathUtils.lerp(3.65, 2.2, (y - 1.5) / 5.5);
      return axis === "x" ? V(tx + across, y, tz + side * r) : V(tx + side * r, y, tz + across);
    };
    for (let j = 0; j < 16; j++) beam(point(j * Math.PI / 16), point((j + 1) * Math.PI / 16), 0.32);
  }
  box(tx, 7, tz, 5.4, 0.45, 5.4, iron);
  box(tx, 14, tz, 3.2, 0.4, 3.2, iron);
  beam(V(tx, 24, tz), V(tx, 27, tz), 0.22);
  b.build(root);
};

export const paris: SetDef = {
  id: "paris", sky: true, spots: rua.spots, walkways, blocked: (kit) => plan(kit).blocked,
  views: {
    ...rua.views,
    // One horizontal street axis; feet stay above the reserved caption band.
    aberto: { pos: [0, 0.8, 11], look: [0, 0.8, 0], fov: 50, roll: 0 },
    medio: { pos: [0, 0.62, 7.2], look: [0, 0.62, 0], fov: 45, roll: 0 },
    close: { pos: [0, 0.8, 3.4], look: [0, 0.8, 0], fov: 50, roll: 0 },
    // Low angle retains the tower and clears the caption band.
    baixo: { pos: [0, 0.45, 8], look: [0, 0.62, 0], fov: 50, roll: 0 },
    aereo: { pos: [2, 18, 16], look: [0, 6, -10], fov: 68, roll: 0 },
  },
  build,
};
