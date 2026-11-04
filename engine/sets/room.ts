// Interior shell shared by casa, escritorio and laboratorio: a closed box room (floor, four walls, ceiling) centred on
// the origin, x -w/2..w/2, z -d/2..d/2, floor at y = 0. The shell lives on the NOINK layer and casts no shadow:
// - no ink on the wall/floor/ceiling joins (the ink rules), while furniture on the world layer keeps full outlines,
//   its silhouettes drawn against the shell like against the sky, including where it stands on the floor;
// - the engine's camera-relative sun reaches inside through the shell, so the room reads as lit from its windows.
// Windows on the back wall are unlit painted sky (a lit sign or window goes grey-blue under a side sun).
import * as THREE from "three";
import { Batch, V, boxGeo, lam, quad } from "../style/build";
import { NOINK } from "../style/ink";
import { ctex, jit, planksHD } from "../style/paint";

export type RoomOpts = { w: number; d: number; h: number; wall: string; floor: "planks" | "tiles"; windows: number };

/** pale ceramic tiles, 2 m per texture repeat (8 x 8 tiles of 25 cm), sand grout, +-6 % per-tile jitter */
const tilesTex = () => ctex("tilesHD", 1024, 1024, (g, r) => {
  const N = 8, S = 1024 / N, J = 6;
  g.fillStyle = "#b9ab95"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    g.fillStyle = jit(r, "#cbbda5", 0.06, 3, 0.1);
    g.fillRect(i * S + J / 2, j * S + J / 2, S - J, S - J);
  }
});
/** window: painted sky with a soft horizon, white mullion cross, dark wood frame */
const windowTex = () => ctex("roomWindow", 256, 320, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 320);
  gr.addColorStop(0, "#6aa3e0"); gr.addColorStop(0.72, "#b8d0ec"); gr.addColorStop(0.73, "#8cc06a"); gr.addColorStop(1, "#78b257");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 320);
  g.fillStyle = "#f4efe4"; g.fillRect(122, 0, 12, 320); g.fillRect(0, 150, 256, 12);
  g.strokeStyle = "#5a3b2a"; g.lineWidth = 22; g.strokeRect(0, 0, 256, 320);
});

/** the room shell (NOINK, no shadow casting) plus windows on the back wall; furniture is built by the caller */
export const buildRoom = (root: THREE.Object3D, o: RoomOpts) => {
  const b = new Batch(), x0 = -o.w / 2, x1 = o.w / 2, z0 = -o.d / 2, z1 = o.d / 2, h = o.h;
  const floor = o.floor === "planks"
    ? lam("roomPlanks", () => ({ map: planksHD() }))
    : lam("roomTiles", () => ({ map: tilesTex() }));
  const wall = lam("roomWall" + o.wall, () => ({ color: o.wall }));
  const ft = o.floor === "planks" ? 4 : 2; // metres per texture repeat
  b.add(quad(V(x0, 0, z1), V(x1, 0, z1), V(x1, 0, z0), V(x0, 0, z0), o.w / ft, o.d / ft), floor);
  b.add(quad(V(x0, 0, z0), V(x1, 0, z0), V(x1, h, z0), V(x0, h, z0)), wall); // back (faces +z)
  b.add(quad(V(x1, 0, z1), V(x0, 0, z1), V(x0, h, z1), V(x1, h, z1)), wall); // front (faces -z)
  b.add(quad(V(x0, 0, z1), V(x0, 0, z0), V(x0, h, z0), V(x0, h, z1)), wall); // left (faces +x)
  b.add(quad(V(x1, 0, z0), V(x1, 0, z1), V(x1, h, z1), V(x1, h, z0)), wall); // right (faces -x)
  const skirt = lam("roomSkirt", () => ({ color: "#f1e9da" }));
  b.add(boxGeo(V(x0, 0, z0), V(x1, 0.1, z0 + 0.02)), skirt);
  const shell = new THREE.Group();
  b.build(shell, false);
  // ceiling: unlit pale wall colour (it faces down, so the two-tone shade would always turn it lavender-grey)
  const ceil = new THREE.Mesh(quad(V(x0, h, z0), V(x1, h, z0), V(x1, h, z1), V(x0, h, z1)),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(o.wall).lerp(new THREE.Color("#fff6e8"), 0.25) }));
  shell.add(ceil);
  const win = new THREE.MeshBasicMaterial({ map: windowTex() });
  for (let i = 0; i < o.windows; i++) {
    const cx = x0 + (o.w * (i + 0.5)) / o.windows, ww = Math.min(1.3, (o.w / o.windows) * 0.6), wh = Math.min(1.6, h - 1.4);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), win);
    m.position.set(cx, 0.95 + wh / 2, z0 + 0.01);
    shell.add(m);
  }
  shell.traverse((x) => { x.layers.set(NOINK); const m = x as THREE.Mesh; if (m.isMesh) m.castShadow = false; });
  root.add(shell);
};

/** furniture helper: an axis box from (x, y, z) of size (sx, sy, sz) at its base centre, one lam colour */
export const block = (b: Batch, col: string, x: number, y: number, z: number, sx: number, sy: number, sz: number) =>
  b.add(boxGeo(V(x - sx / 2, y, z - sz / 2), V(x + sx / 2, y + sy, z + sz / 2), 0, y > 0.01), lam("furn" + col, () => ({ color: col })));

/** four legs under a top: table, desk, bench */
export const legs4 = (b: Batch, col: string, x: number, z: number, sx: number, sz: number, h: number, t = 0.06) => {
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) block(b, col, x + dx * (sx / 2 - t), 0, z + dz * (sz / 2 - t), t, h, t);
};

/** views and spots shared by the 8 x 10 m rooms (cameras on the open middle, spots clear of the furniture) */
export const ROOM_VIEWS = {
  aberto: { pos: [0, 1.6, 4.85], look: [0, 1.1, -1.5], fov: 64, roll: 0 },
  medio: { pos: [0, 1.5, 3.2], look: [0, 1.15, 0.3], fov: 45, roll: 0 },
  close: { pos: [0.1, 1.55, 2.0], look: [0, 1.5, 0.5], fov: 38, roll: 0 },
  baixo: { pos: [0.3, 0.6, 3.4], look: [0, 1.7, -1.5], fov: 55, roll: 0 },
} satisfies Record<string, { pos: [number, number, number]; look: [number, number, number]; fov: number; roll: number }>;
export const ROOM_SPOTS = { centro: [0, 0, 0.5], esquerda: [-1.05, 0, 0.6], direita: [1.05, 0, 0.4], fundo: [0, 0, -2] } satisfies Record<string, [number, number, number]>;
