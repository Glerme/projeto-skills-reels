// Living room: warm cream walls, plank floor, two windows on the back wall; a terracotta sofa against the back wall
// with a coffee table and a rug in front, a bookshelf on the left wall, a cabinet with a plant and a floor lamp on the
// right. Everything stays against the walls, so the spots in the middle and the cameras' sight lines are clear.
import * as THREE from "three";
import { Batch, prop, type Kit } from "../style/build";
import { ROOM_SPOTS, ROOM_VIEWS, block, buildRoom, legs4 } from "./room";
import type { SetDef } from "./types";

const WOOD = "#8f5d3b", DARK = "#6a4128";
const BOOKS = ["#b5543c", "#2f6a43", "#3f6fb5", "#d8a95f", "#8c3b4a", "#2f5f6a", "#c9775a"];

const build = (root: THREE.Group, kit: Kit) => {
  buildRoom(root, { w: 8, d: 10, h: 3.2, wall: "#e9cfa4", floor: "planks", windows: 2 });
  const b = new Batch();
  // sofa (back wall)
  block(b, "#c0684a", 0, 0, -4.4, 2.4, 0.45, 0.9);
  block(b, "#c0684a", 0, 0, -4.78, 2.4, 0.95, 0.24);
  for (const s of [-1, 1]) block(b, "#a95a40", s * 1.25, 0, -4.4, 0.22, 0.66, 0.9);
  for (const s of [-1, 1]) block(b, "#d98463", s * 0.55, 0.45, -4.3, 1.0, 0.13, 0.62);
  // rug + coffee table
  block(b, "#3f7d8a", 0, 0, -3.1, 3.0, 0.012, 1.9);
  block(b, WOOD, 0, 0.4, -3.2, 1.2, 0.06, 0.62);
  legs4(b, DARK, 0, -3.2, 1.2, 0.62, 0.4);
  // bookshelf (left wall): frame, shelves, books
  block(b, DARK, -3.78, 0, -1.6, 0.42, 2.1, 1.7);
  for (let k = 0; k < 4; k++) {
    let z = -2.35;
    for (let i = 0; z < -0.9; i++) {
      const w = 0.07 + ((i * 7 + k * 3) % 5) * 0.02, hb = 0.3 + ((i * 5 + k) % 3) * 0.05;
      block(b, BOOKS[(i + k * 2) % BOOKS.length], -3.7, 0.12 + k * 0.5, z + w / 2, 0.24, hb, w);
      z += w + 0.012;
    }
  }
  // cabinet + plant, floor lamp (right side), a picture on the back wall
  block(b, WOOD, 3.72, 0, -1.2, 0.5, 0.8, 1.3);
  block(b, "#c47a5c", 3.72, 0.8, -1.2, 0.34, 0.28, 0.34);
  prop(b, kit, "plant_bushDetailed", 3.72, 1.08, -1.2, 0.55);
  block(b, DARK, 3.3, 0, -4.4, 0.32, 0.04, 0.32);
  block(b, DARK, 3.3, 0.04, -4.4, 0.04, 1.5, 0.04);
  block(b, "#f0d3a8", 3.3, 1.5, -4.4, 0.45, 0.32, 0.45);
  block(b, DARK, -2.2, 1.35, -4.97, 0.9, 0.65, 0.04);
  block(b, "#d8a95f", -2.2, 1.41, -4.94, 0.76, 0.53, 0.02);
  b.build(root);
};

export const casa: SetDef = { id: "casa", sky: false, sunAz: 130, spots: ROOM_SPOTS, views: ROOM_VIEWS, build };
