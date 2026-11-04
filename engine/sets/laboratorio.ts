// Lab: mint walls, tiled floor, two windows; white bench cabinets with dark slate tops along the back and side walls,
// glassware with softly glowing liquids (the only bloom sources: emissive over 1), a chalkboard of scribbled formulas
// (no legible text) and a shelf of jars. The middle of the room stays clear for the spots and the cameras.
import * as THREE from "three";
import { Batch, V, lam, quad, type Kit } from "../style/build";
import { ctex } from "../style/paint";
import { ROOM_SPOTS, ROOM_VIEWS, block, buildRoom, pendant, picture } from "./room";
import type { SetDef } from "./types";

const CAB = "#e9e4d8", TOP = "#3b4650", GLASS = "#cfe6e8";
const LIQUID = ["#57c785", "#e8724a", "#4aa3e8", "#e8c14a"];

/** chalkboard: dark green slate with chalk scribbles (curves and dashes, no letters) */
const boardTex = () => ctex("labBoard", 512, 256, (g, r) => {
  g.fillStyle = "#2f4a3c"; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = "rgba(240,240,230,0.75)"; g.lineCap = "round";
  for (let k = 0; k < 9; k++) {
    const y = 30 + k * 24 + r() * 6;
    g.lineWidth = 2 + r() * 1.5;
    g.beginPath(); let x = 24 + r() * 30; g.moveTo(x, y);
    while (x < 470) { const dx = 10 + r() * 26; g.quadraticCurveTo(x + dx / 2, y - 8 + r() * 16, x + dx, y + (r() - 0.5) * 6); x += dx + (r() < 0.25 ? 18 : 0); if (r() < 0.25) g.moveTo(x, y); }
    g.stroke();
  }
  g.strokeStyle = "#7a5a3a"; g.lineWidth = 14; g.strokeRect(0, 0, 512, 256);
});

/** a flask: glass body (sphere + neck) with a glowing liquid inside */
const flask = (b: Batch, x: number, y: number, z: number, s: number, liquid: string) => {
  const glass = lam("labGlass", () => ({ color: GLASS }));
  const liq = lam("labLiquid" + liquid, () => ({ color: liquid, emissive: liquid, emissiveIntensity: 1.4 }));
  b.add(new THREE.SphereGeometry(s * 0.62, 16, 10), liq, new THREE.Matrix4().makeTranslation(x, y + s * 0.62, z));
  b.add(new THREE.CylinderGeometry(s * 0.18, s * 0.2, s * 0.7, 10), glass, new THREE.Matrix4().makeTranslation(x, y + s * 1.5, z));
};

const build = (root: THREE.Group, _kit: Kit) => {
  buildRoom(root, { w: 8, d: 10, h: 3.2, wall: "#9fc0ad", floor: "tiles", windows: 2 });
  const b = new Batch();
  // benches: back wall (two runs either side of the board) and both side walls
  for (const [x, z, sx, sz] of [[-2.6, -4.55, 2.6, 0.8], [2.6, -4.55, 2.6, 0.8], [-3.6, -1.4, 0.8, 2.6], [3.6, -1.4, 0.8, 2.6]] as const) {
    block(b, CAB, x, 0, z, sx, 0.86, sz);
    block(b, TOP, x, 0.86, z, sx + 0.06, 0.05, sz + 0.06);
  }
  flask(b, -3.2, 0.91, -4.5, 0.26, LIQUID[0]);
  flask(b, -2.4, 0.91, -4.4, 0.2, LIQUID[1]);
  flask(b, 2.2, 0.91, -4.5, 0.24, LIQUID[2]);
  flask(b, 3.5, 0.91, -1.0, 0.22, LIQUID[3]);
  for (let i = 0; i < 4; i++) block(b, GLASS, -3.6, 0.91, -2.3 + i * 0.35, 0.1, 0.3, 0.1); // test tubes
  block(b, "#5b6470", 3.6, 0.91, -2.1, 0.35, 0.5, 0.35); // instrument box
  // chalkboard between the back benches, shelf of jars above the left bench
  const board = new THREE.Mesh(quad(V(-1.05, 1.0, -4.96), V(1.05, 1.0, -4.96), V(1.05, 2.05, -4.96), V(-1.05, 2.05, -4.96)), lam("labBoard", () => ({ map: boardTex() })));
  root.add(board);
  block(b, "#8f5d3b", -2.6, 1.85, -4.85, 2.2, 0.05, 0.3);
  for (let i = 0; i < 6; i++) block(b, LIQUID[i % 4], -3.5 + i * 0.36, 1.9, -4.85, 0.16, 0.24, 0.16);
  // decor: a chart poster on each side wall, wall cabinets above the right bench, pendant lamps
  picture(root, b, -3.97, 1.4, 0.6, 0.6, 0.8, 0, "+x");
  picture(root, b, 3.97, 1.45, 0.2, 0.6, 0.8, 3, "-x");
  block(b, CAB, 3.8, 1.75, -1.4, 0.4, 0.7, 2.4);
  pendant(b, -1.6, -3.0, 3.2, "#5b6470");
  pendant(b, 1.6, -3.0, 3.2, "#5b6470");
  b.build(root);
};

export const laboratorio: SetDef = { id: "laboratorio", sky: false, sunAz: 130, spots: ROOM_SPOTS, views: ROOM_VIEWS, build };
