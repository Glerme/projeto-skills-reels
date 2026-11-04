// Office: pale sage walls, tiled floor, three windows; two desks with monitors and chairs along the back wall, a
// whiteboard between them, side desks against the left and right walls, a filing cabinet and a potted plant in the
// corners. The middle of the room (the spots) and the camera axis stay free.
import * as THREE from "three";
import { Batch, prop, type Kit } from "../style/build";
import { ROOM_SPOTS, ROOM_VIEWS, block, buildRoom, legs4, pendant, picture } from "./room";
import type { SetDef } from "./types";

const DESK = "#c9a27a", METAL = "#5b6470", SCREEN = "#27323f", CHAIR = "#2f5f6a";

/** desk with a monitor, the chair on the front side (local +z), at (x, z), turned by yaw 0 | ±pi/2 */
const workstation = (b: Batch, x: number, z: number, along: "x" | "z", front: 1 | -1) => {
  const [sx, sz] = along === "x" ? [1.4, 0.7] : [0.7, 1.4];
  block(b, DESK, x, 0.7, z, sx, 0.05, sz);
  legs4(b, METAL, x, z, sx, sz, 0.7, 0.05);
  const back = along === "x" ? [x, z - front * 0.15] : [x - front * 0.15, z];
  const [mw, md] = along === "x" ? [0.6, 0.04] : [0.04, 0.6];
  block(b, METAL, back[0], 0.75, back[1], 0.06, 0.12, 0.06);
  block(b, SCREEN, back[0], 0.87, back[1], mw, 0.36, md);
  const seat = along === "x" ? [x, z + front * 0.65] : [x + front * 0.65, z];
  block(b, METAL, seat[0], 0, seat[1], 0.06, 0.45, 0.06);
  block(b, CHAIR, seat[0], 0.45, seat[1], 0.46, 0.07, 0.46);
  const rest = along === "x" ? [seat[0], seat[1] + front * 0.22] : [seat[0] + front * 0.22, seat[1]];
  block(b, CHAIR, rest[0], 0.52, rest[1], along === "x" ? 0.46 : 0.06, 0.5, along === "x" ? 0.06 : 0.46);
};

const build = (root: THREE.Group, kit: Kit) => {
  buildRoom(root, { w: 8, d: 10, h: 3.2, wall: "#97ad86", floor: "tiles", windows: 3 });
  const b = new Batch();
  workstation(b, -2.3, -4.2, "x", 1);
  workstation(b, 2.3, -4.2, "x", 1);
  workstation(b, -3.55, 0.8, "z", 1);
  workstation(b, 3.55, -0.6, "z", -1);
  // whiteboard between the back desks, below the windows' sill line
  block(b, "#9aa0a8", 0, 0.9, -4.97, 1.7, 1.0, 0.04);
  block(b, "#f3f2ec", 0, 0.95, -4.94, 1.58, 0.9, 0.02);
  // filing cabinet, plant
  block(b, METAL, -3.65, 0, -2.4, 0.55, 1.2, 0.6);
  block(b, "#c47a5c", 3.55, 0, -2.6, 0.45, 0.45, 0.45);
  prop(b, kit, "plant_bushLarge", 3.55, 0.45, -2.6, 0.9);
  // decor: posters, a cork board with notes, two pendant lamps over the desks
  picture(root, b, -3.97, 1.3, -1.0, 0.7, 0.9, 3, "+x");
  picture(root, b, 3.97, 1.4, 1.2, 0.8, 0.6, 0, "-x");
  block(b, "#b98a5e", 0, 2.05, -4.97, 1.0, 0.5, 0.03);
  for (let i = 0; i < 5; i++) block(b, ["#f4efe4", "#e8c14a", "#9fd3c7"][i % 3], -0.38 + i * 0.19, 2.15 + (i % 2) * 0.12, -4.95, 0.13, 0.13, 0.01);
  pendant(b, -2.3, -3.6, 3.2);
  pendant(b, 2.3, -3.6, 3.2);
  b.build(root);
};

export const escritorio: SetDef = { id: "escritorio", sky: false, sunAz: 130, spots: ROOM_SPOTS, views: ROOM_VIEWS, build };
