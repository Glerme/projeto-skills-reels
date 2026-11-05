import * as THREE from "three";
import { Batch, prop, house, propBounds, type Kit } from "../style/build";
import { groundDistance, MIN_CLEARANCE, overlaps, pointRect, rect, walkwayRect, type GroundRect, type Walkway } from "../space";
import type { V3 } from "../camera";

/** One plan supplies both ground occupancy and drawing. Reject optional furniture before it reaches either. */
export class Layout {
  blocked: GroundRect[] = [];
  private draws: ((b: Batch) => void)[] = [];
  constructor(private kit: Kit, private spots: Record<string, V3>, private walkways: Record<string, Walkway> = {}) {}
  add(r: GroundRect, draw: (b: Batch) => void) {
    if (this.blocked.some((other) => groundDistance(r, other) < MIN_CLEARANCE - 1e-6)) return;
    if ([...Object.entries(this.spots).map(([n, p]) => pointRect(`spot ${n}`, p)),
      ...Object.entries(this.walkways).map(([n, w]) => walkwayRect(n, w))].some((other) => overlaps(r, other))) return;
    this.blocked.push(r); this.draws.push(draw);
  }
  prop(name: string, x: number, y: number, z: number, h: number, yaw = 0) {
    // Vegetation is drawn procedurally by prop(); measure that same geometry, including the canopy.
    const box = propBounds(this.kit, name, x, y, z, h, yaw);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const r = rect(`${name} ${this.blocked.length + 1}`, c.x, c.z, size.x, size.z);
    this.add(r, (b) => prop(b, this.kit, name, x, y, z, h, yaw));
  }
  house(x: number, z: number, yaw: number, w: number, d: number, h: number, si: number) {
    // Eaves extend 0.35 m beyond each wall in house().
    this.add(rect(`prédio ${this.blocked.length + 1}`, x, z, w + 0.7, d + 0.7, yaw * 180 / Math.PI),
      (b) => house(b, x, z, yaw, w, d, h, si));
  }
  geometry(name: string, geo: THREE.BufferGeometry, mat: THREE.Material, matrix: THREE.Matrix4) {
    const box = new THREE.Box3().setFromBufferAttribute(geo.getAttribute("position") as THREE.BufferAttribute).applyMatrix4(matrix);
    const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    this.add(rect(`${name} ${this.blocked.length + 1}`, c.x, c.z, size.x, size.z), (b) => b.add(geo, mat, matrix));
  }
  draw(b: Batch) { for (const draw of this.draws) draw(b); }
}
