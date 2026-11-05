import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { setDressing, shotSky } from "./shot-extras";
import { SETS } from "./sets/index";
import { SKY_SETS, SET_IDS } from "./sets/anchors";
import { camAt } from "./camera";
import type { ShotSpec } from "./spec";

const shot = { id: 1, start: 0, end: 3, set: "rua", light: "day", actors: [], cam: { from: "close", recipe: "hold" } } as ShotSpec;

test("validator sky metadata matches each set", () => {
  for (const id of SET_IDS) assert.equal(SKY_SETS.includes(id), SETS[id].sky, id);
});

test("props use native model height times scale, degrees, offsets and spot height", () => {
  const model = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 1), new THREE.MeshStandardMaterial());
  const def = { ...SETS.rua, spots: { centro: [10, 2, 3] as [number, number, number] } };
  const group = setDressing([{ model: "car-sedan", at: "centro", turn: 90, scale: 0.5, dx: 1, dz: -2 }], def, { "car-sedan": model });
  const box = new THREE.Box3().setFromObject(group);
  assert.ok(box.min.distanceTo(new THREE.Vector3(10.75, 2, 0.5)) < 1e-6);
  assert.ok(box.max.distanceTo(new THREE.Vector3(11.25, 4, 1.5)) < 1e-6);
  const mesh = group.children[0] as THREE.Mesh;
  assert.ok((mesh.material as THREE.Material).type === "MeshLambertMaterial");
  assert.equal(mesh.castShadow, true); assert.equal(mesh.receiveShadow, true);
  assert.equal(setDressing([], def, {}).children.length, 0);
  assert.equal(setDressing([{ model: "missing", at: "centro" }], def, {}).children.length, 0);
  assert.equal(setDressing([{ model: "car-sedan", at: "centro" }], def, { "car-sedan": model }).children.length, 1);
});

test("sky layout stays in frame, on light side, deterministic and clear of sun", () => {
  for (const set of SKY_SETS) for (const from of Object.keys(SETS[set].views)) for (const sign of [-1, 1]) {
    const s: ShotSpec = { ...shot, set, cam: { from, recipe: "hold" }, sky: { sun: true, clouds: 8 } };
    for (const t of [0, 2.9, 0]) {
      const c = camAt(s, t, SETS[set].views);
      const cam = new THREE.PerspectiveCamera(c.fov, 9 / 16, 0.2, 1500);
      cam.position.set(...c.pos); cam.lookAt(...c.look); cam.updateMatrixWorld();
      const sun = new THREE.Vector3(sign, 1, 0).applyQuaternion(cam.quaternion);
      const layout = shotSky(s, cam, sun), projected = layout.sun.clone().project(cam);
      assert.ok(projected.y > 1 / 3 && projected.y < 1);
      assert.equal(Math.sign(projected.x), sign);
      assert.deepEqual(shotSky(s, cam, sun), layout);
      assert.equal(layout.clouds.length, 8);
      const halfH = 900 * Math.tan(THREE.MathUtils.degToRad(c.fov / 2));
      const radius = 900 * Math.tan(THREE.MathUtils.degToRad(1.7));
      for (const cloud of layout.clouds) {
        const p = cloud.position.clone().project(cam);
        assert.ok(Math.abs(p.x) + cloud.width / (2 * halfH * cam.aspect) < 1);
        assert.ok(p.y - cloud.height / (2 * halfH) > 0 && p.y + cloud.height / (2 * halfH) < 1);
        const dx = Math.max(0, Math.abs(cloud.position.clone().sub(layout.sun).dot(new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0))) - cloud.width / 2);
        const dy = Math.max(0, Math.abs(p.y - projected.y) * halfH - cloud.height / 2);
        assert.ok(Math.hypot(dx, dy) > radius, `${set}/${from}: cloud overlaps sun`);
      }
    }
  }
  const cam = new THREE.PerspectiveCamera(); cam.updateMatrixWorld();
  assert.equal(shotSky(shot, cam, new THREE.Vector3()).clouds.length, 0);
});

test("extra clouds also avoid the legacy golden sun without moving it", () => {
  const cam = new THREE.PerspectiveCamera(38, 9 / 16, 0.2, 1500);
  cam.updateMatrixWorld();
  const halfH = 900 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), halfW = halfH * cam.aspect;
  for (const y of [0.42, 0.85]) {
    const direction = new THREE.Vector3(halfW * 0.64, halfH * y, -900).normalize();
    const s: ShotSpec = { ...shot, light: "golden", sky: { clouds: 8 } };
    const layout = shotSky(s, cam, direction);
    assert.ok(layout.sun.distanceTo(direction.clone().multiplyScalar(900)) < 1e-6);
    const sun = layout.sun.clone(), planeSun = sun.clone().multiplyScalar(900 / -sun.z);
    const radius = 900 * Math.tan(THREE.MathUtils.degToRad(1.7)) * 900 / -sun.z;
    for (const cloud of layout.clouds) {
      const dx = Math.max(0, Math.abs(cloud.position.x - planeSun.x) - cloud.width / 2);
      const dy = Math.max(0, Math.abs(cloud.position.y - planeSun.y) - cloud.height / 2);
      assert.ok(Math.hypot(dx, dy) > radius);
    }
  }
});
