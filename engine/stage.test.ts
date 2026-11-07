import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { SETS } from "./sets/index";
import type { VideoSpec, ShotSpec } from "./spec";

test("Stage restores set dressing and sky after out-of-order seeks without a renderer", async () => {
  // Only texture creation needs canvas; no pixels or rendering are tested here.
  const previous = globalThis.document;
  const gradient = { addColorStop() {} };
  const context = new Proxy({
    createRadialGradient: () => gradient,
    createLinearGradient: () => gradient,
    createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  }, { get: (target, key) => Reflect.get(target, key) ?? (() => {}) });
  globalThis.document = { createElement: () => ({ getContext: () => context }) } as unknown as Document;
  const originalBuild = SETS.rua.build;
  SETS.rua.build = () => {};
  try {
    const { Stage } = await import("./stage");
    const { Batch, prop, propBounds, setSight } = await import("./style/build");
    setSight([]);
    for (const name of ["tree_default", "tree_fat", "tree_cone", "plant_bushLarge"]) {
      const batch = new Batch(), group = new THREE.Group();
      prop(batch, {}, name, 9, 0, -8, 2, 0.7); batch.build(group);
      const drawn = new THREE.Box3().setFromObject(group), measured = propBounds({}, name, 9, 0, -8, 2, 0.7);
      assert.ok(measured.clone().expandByScalar(1e-5).containsBox(drawn), name);
    }

    const a: ShotSpec = { id: 1, start: 0, end: 2, set: "rua", light: "day", cam: { recipe: "hold", from: "medio" }, actors: [],
      sky: { sun: true, clouds: 8 } };
    const b: ShotSpec = { ...a, id: 2, start: 2, end: 4, sky: undefined };
    const golden: ShotSpec = { ...b, id: 3, start: 4, end: 6, light: "golden" };
    const spec = { fps: 30, cast: {}, shots: [a, b, golden], dressing: { rua: [{ model: "car-sedan", at: "centro" }] } } as unknown as VideoSpec;
    const stage = new Stage({ "car-sedan": new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()) }, spec);
    assert.equal(stage["dressing"].size, 1);
    const walker = { who: "extra", action: "walk", path: "esquerda_ida" } as const;
    const p0 = stage["feet"]({ ...a, actors: [walker] }, SETS.rua, walker, 1).p;
    const p1 = stage["feet"]({ ...b, actors: [walker] }, SETS.rua, walker, 2).p;
    assert.ok(Math.abs(p0.distanceTo(p1) - 1.2) < 1e-9);
    assert.deepEqual(stage["feet"](a, SETS.rua, walker, 1).p, p0);
    const late = { ...b, start: 17.51, end: 19.55, actors: [walker] };
    assert.deepEqual(stage["feet"](late, SETS.rua, walker, 17.51).p,
      stage["feet"]({ ...a, end: 17.51 }, SETS.rua, walker, 17.51).p);
    assert.ok(Math.abs(stage["feet"](late, SETS.rua, walker, 19.51).p.distanceTo(
      stage["feet"](late, SETS.rua, walker, 17.51).p) - 2.4) < 1e-9);
    const cam = new THREE.PerspectiveCamera(50, 9 / 16);
    const state = () => stage.root.children.map((o) => ({ type: o.type, visible: o.visible, pos: o.position.toArray(), scale: o.scale.toArray(), rotation: o.quaternion.toArray() }));
    stage.update(a, 1, cam); const first = state();
    assert.equal(stage.root.children.filter((o) => o instanceof THREE.Sprite && o.visible).length, 1);
    assert.equal(stage.root.children.filter((o) => o.type === "Group" && o.visible && o.children.length > 0).length, 1);
    stage.update(b, 3, cam);
    assert.equal(stage.root.children.filter((o) => o instanceof THREE.Sprite && o.visible).length, 0);
    assert.equal(stage.root.children.filter((o) => o.type === "Group" && o.visible && o.children.length > 0).length, 1);
    assert.equal(stage.root.children.filter((o) => o instanceof THREE.Mesh && o.visible).length, 10); // sky + nine legacy clouds
    stage.update(golden, 5, cam);
    assert.equal(stage.root.children.filter((o) => o instanceof THREE.Sprite && o.visible).length, 2);
    stage.update(a, 1, cam); assert.deepEqual(state(), first);
    stage.update({ ...golden, sky: { sun: false, clouds: 0 } }, 5, cam);
    assert.equal(stage.root.children.filter((o) => o instanceof THREE.Sprite && o.visible).length, 0);
    const screenA: ShotSpec = { ...a, screens: [{ at: "centro", mode: "mistura" }] };
    const screenB: ShotSpec = { ...b, screens: [{ at: "direita", mode: "oled" }] };
    const displays = new Stage({}, { ...spec, shots: [screenA, screenB], dressing: {} });
    displays.update(screenA, 0.2, cam);
    const firstDisplay = displays["screens"].get(screenA)![0], secondDisplay = displays["screens"].get(screenB)![0];
    const pixels = new Uint8Array(firstDisplay.texture.image.data as Uint8Array);
    assert.equal(firstDisplay.group.visible, true); assert.equal(secondDisplay.group.visible, false);
    displays.update(screenB, 3, cam);
    assert.equal(firstDisplay.group.visible, false); assert.equal(secondDisplay.group.visible, true);
    displays.update(screenA, 1.9, cam);
    assert.notDeepEqual(firstDisplay.texture.image.data, pixels);
    displays.update(screenA, 0.2, cam);
    assert.deepEqual(firstDisplay.texture.image.data, pixels);

    const flat: ShotSpec = { ...screenA, set: "plano", background: { top: "#123456", bottom: "#abcdef" },
      cam: { recipe: "keys", from: "aberto", keys: [{ t: 0, dist: 12, yaw: 45, h: 4 }, { t: 2, on: [1, 0, 0], dist: 10 }] } };
    const illustration = new Stage({}, { ...spec, shots: [flat, a], dressing: {} });
    illustration.update(flat, 0, cam);
    assert.equal(cam.projectionMatrix.elements[15], 1);
    assert.equal(cam.position.x, 0); assert.equal(cam.position.y, 1.35);
    const project = (z: number) => new THREE.Vector3(1, 1, z).project(cam);
    assert.equal(project(0).x, project(-10).x, "no perspective scaling with depth");
    assert.equal(illustration["background"].visible, true);
    assert.equal(illustration["sky"].visible, false);
    assert.equal(illustration["clouds"].some(c => c.visible), false);
    const u = (illustration["background"].material as THREE.ShaderMaterial).uniforms;
    assert.equal(u.top.value.getHexString(), "123456");
    assert.equal(u.bottom.value.getHexString(), "abcdef");
    const projection = cam.projectionMatrix.clone();
    illustration.update(flat, 2, cam);
    assert.notDeepEqual(cam.projectionMatrix, projection); assert.equal(cam.position.x, 1);
    illustration.update(a, 1, cam);
    assert.equal(cam.projectionMatrix.elements[15], 0);
    assert.equal(illustration["background"].visible, false);
    illustration.update({ ...flat, background: { top: "#334455" } }, 0, cam);
    assert.equal(u.bottom.value.getHexString(), "334455");
    illustration.update(flat, 0, cam);
    assert.deepEqual(cam.projectionMatrix, projection);
    assert.equal(u.bottom.value.getHexString(), "abcdef");
  } finally {
    SETS.rua.build = originalBuild;
    globalThis.document = previous;
  }
});
