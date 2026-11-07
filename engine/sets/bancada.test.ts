import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { bancada } from "./bancada";
import { rua } from "./rua";

test("bancada preserves street anchor names and supports its subject on the plinth", () => {
  assert.deepEqual(Object.keys(bancada.spots), Object.keys(rua.spots));
  assert.deepEqual(Object.keys(bancada.views), Object.keys(rua.views));
  const root = new THREE.Group();
  bancada.build(root, {});
  const plinth = root.children.flatMap(o => o instanceof THREE.Mesh ? [o] : [])
    .find(o => (o.material as THREE.Material).type === "MeshLambertMaterial" &&
      (o.material as THREE.MeshLambertMaterial).color.getHexString() === "465064");
  assert.ok(plinth);
  const box = new THREE.Box3().setFromObject(plinth);
  assert.ok(Math.abs(box.max.y - bancada.spots.centro[1]) < 1e-6);
  assert.ok(root.children.some(o => o instanceof THREE.SpotLight));
});

test("bancada supplies a visible backdrop, emissive rim and fill independent of night lighting", () => {
  const root = new THREE.Group();
  const desk = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1), new THREE.MeshStandardMaterial());
  bancada.build(root, { "furniture-desk": desk });
  const materials: THREE.Material[] = [];
  root.traverse(o => { if (o instanceof THREE.Mesh) materials.push(...(Array.isArray(o.material) ? o.material : [o.material])); });
  assert.ok(materials.some(m => m instanceof THREE.MeshLambertMaterial && m.color.getHexString() === "51577e" && m.emissiveIntensity === 0.6));
  assert.ok(materials.some(m => m instanceof THREE.ShaderMaterial && m.side === THREE.BackSide && !m.transparent));
  assert.ok(materials.some(m => m instanceof THREE.MeshLambertMaterial && m.emissiveIntensity > 2));
  assert.ok(materials.some(m => m instanceof THREE.ShaderMaterial && m.transparent && !m.depthWrite));
  assert.ok(root.children.some(o => o instanceof THREE.PointLight && o.position.x < -5));
});

test("bancada keeps the room far from the exploded plates and its halo behind the subject from any yaw", () => {
  const desk = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1), new THREE.MeshStandardMaterial());
  const blocked = bancada.blocked!({ "furniture-desk": desk });
  assert.ok(blocked.length > 0);
  assert.ok(blocked.every(r => Math.hypot(r.x, r.z) > 10));
  const root = new THREE.Group();
  bancada.build(root, {});
  const halo = root.children.find(o => o instanceof THREE.Mesh && o.material instanceof THREE.ShaderMaterial && o.material.transparent) as THREE.Mesh;
  for (const x of [-8, 8]) {
    const camera = new THREE.PerspectiveCamera(45, 9 / 16); camera.position.set(x, 3, 8); camera.lookAt(0, 1.6, -1.5);
    halo.onBeforeRender(null as never, null as never, camera, null as never, null as never, null as never);
    const toHalo = halo.position.clone().sub(camera.position).setY(0).normalize();
    const toSubject = new THREE.Vector3(0, 1.6, -1.5).sub(camera.position).setY(0).normalize();
    assert.ok(toHalo.dot(toSubject) > 0.999);
  }
});
