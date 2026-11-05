import * as THREE from "three";
import type { ShotSpec, PropSpec } from "./spec";
import type { SetDef } from "./sets/types";
import { Batch, prop, type Kit } from "./style/build";

/** One persistent dressing group per set; placement is checked before the stage is built. */
export function setDressing(props: PropSpec[], def: SetDef, kit: Kit) {
  const group = new THREE.Group(), batch = new Batch();
  for (const p of props) {
    const [x, y, z] = def.spots[p.at], model = kit[p.model];
    const height = model ? new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).y : 1;
    prop(batch, kit, p.model, x + (p.dx ?? 0), y, z + (p.dz ?? 0),
      height * (p.scale ?? 1), THREE.MathUtils.degToRad(p.turn ?? 0));
  }
  batch.build(group);
  return group;
}

/** Camera-space sky layout: stable slots, seeded by scene id, clear of the sun's disc. */
export function shotSky(shot: ShotSpec, cam: THREE.PerspectiveCamera, sun: THREE.Vector3) {
  const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
  const side = sun.dot(right) < 0 ? -1 : 1;
  const halfH = 900 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), halfW = halfH * cam.aspect;
  const point = (x: number, y: number) => new THREE.Vector3(x * halfW, y * halfH, -900).applyMatrix4(cam.matrixWorld);
  const sunX = side * 0.52, sunY = 0.66;
  const sunPosition = shot.sky?.sun ? point(sunX, sunY) : cam.position.clone().addScaledVector(sun, 900);
  const sunLocal = sunPosition.clone().applyMatrix4(cam.matrixWorldInverse);
  const showSun = shot.sky?.sun ?? (shot.light === "golden");
  const radius = 900 * Math.tan(THREE.MathUtils.degToRad(1.7));
  const clouds = Array.from({ length: shot.sky?.clouds ?? 0 }, (_, i) => {
    const slot = (i + Math.abs(Math.trunc(shot.id))) % 8;
    const x = [-0.64, -0.21, 0.21, 0.64][slot % 4];
    let y = slot < 4 ? 0.42 : 0.85;
    if (showSun && sunLocal.z < 0) {
      // Compare at the cloud plane, including the disc radius and the whole cloud rectangle.
      const sx = sunLocal.x * 900 / -sunLocal.z, sy = sunLocal.y * 900 / -sunLocal.z;
      const overlaps = (cy: number) => Math.hypot(
        Math.max(0, Math.abs(x * halfW - sx) - halfW * 0.16),
        Math.max(0, Math.abs(cy * halfH - sy) - halfH * 0.05)) <= radius * 900 / -sunLocal.z;
      if (overlaps(y)) y = [0.85, 0.42, 0.15].find((cy) => !overlaps(cy))!;
    }
    return { position: point(x, y), width: halfW * 0.32, height: halfH * 0.10 };
  });
  return { sun: sunPosition, clouds };
}
