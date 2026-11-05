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
  } finally {
    SETS.rua.build = originalBuild;
    globalThis.document = previous;
  }
});
