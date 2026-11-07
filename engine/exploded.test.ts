import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { createScreen, updateScreen, screenValue, screenPixel, SCREEN_LAYERS, LAYER_STEP } from "./screens";
import { validateSpec, type ShotSpec } from "./spec";
import { validateHud } from "./hud";

test("explosion reverses continuously, preserves housing and restores seeks", () => {
  const d = createScreen(), shot = { start: 0, end: 4 } as ShotSpec;
  const s = { at: "centro", mode: "branco" as const, explode: [[0, 0], [2, 1], [4, 0]] as [number, number][] };
  const housing = d.group.children[0].position.clone();
  for (const t of [0, 1, 2, 3, 4, 1]) {
    updateScreen(d, s, shot, t, [0, 0.32, 0]);
    assert.deepEqual(d.group.children[0].position, housing);
    assert.equal(d.layers.length, 5);
    const e = screenValue(s.explode, t);
    assert.ok(Math.abs(d.layers[0].position.z - (0.07 - 4 * e * LAYER_STEP[2])) < 1e-9);
    assert.ok(d.layers.every(l => l.position.x === 0 && l.rotation.y === 0));
    assert.ok(d.layers.every((l, i) => i === 0 || l.position.z > d.layers[i - 1].position.z));
  }
  assert.equal(screenValue(s.explode, 1), screenValue(s.explode, 3));
  assert.ok(Math.abs(screenValue(s.explode, 2 - 1e-6) - screenValue(s.explode, 2 + 1e-6)) < 1e-9);
  assert.deepEqual(screenPixel(s, 0, 4, 0.2, 0.8), [255,255,255]);
  updateScreen(d, { ...s, mode: "oled", oled: [[0,0],[4,1]], highlight: "polarizador-frente" }, shot, 4, [0,0,0]);
  assert.equal(d.layers[0].visible, false);
});

test("fixture validates; malformed timelines, highlights and layer anchors fail", () => {
  const fixture = () => JSON.parse(readFileSync("engine/fixtures/explodido.json", "utf8"));
  assert.equal(validateSpec(fixture()).ok, true);
  for (const bad of [[], [[0, -1]], [[0, 2]], [[-1,0]], [[0,0],[0,1]], [[0,0],null]]) {
    const s = fixture(); s.shots[0].screens[0].explode = bad;
    assert.equal(validateSpec(s).ok, false);
  }
  const s = fixture(); s.shots[0].screens[0].highlight = "bad";
  assert.equal(validateSpec(s).ok, false);
  for (const layer of SCREEN_LAYERS) {
    const h = [{ kind: "seta", start: 0, end: 1, from: [100,100], anchor: { point: [0,0,0], screen: 0, layer } }];
    assert.deepEqual(validateHud(h, 0, 1, 0, 1), []);
    assert.notDeepEqual(validateHud(h, 0, 1, 0, 0), []);
  }
});

test("plates leave the frame opening before rising, so none crosses the top bar", () => {
  const d = createScreen(), shot = { start: 0, end: 4 } as ShotSpec;
  updateScreen(d, { at: "centro", mode: "lcd", explode: [[0, 0.25]] }, shot, 1, [0, 0, 0]);
  assert.ok(d.layers.every(l => l.position.y === 1.65));
  assert.ok(d.layers.slice(0, 4).every(l => l.position.z < -0.09 - 0.009)); // behind the 0.18 m frame
  updateScreen(d, { at: "centro", mode: "lcd", explode: [[0, 1]] }, shot, 1, [0, 0, 0]);
  assert.ok(d.layers.every((l, i) => i === 0 || l.position.y < d.layers[i - 1].position.y));
});

test("only opaque parts write depth, so an invisible emitter never hides the stripes", () => {
  const d = createScreen();
  updateScreen(d, { at: "centro", mode: "lcd", explode: [[0, 1]], highlight: "polarizador-frente" }, { start: 0, end: 4 } as ShotSpec, 2, [0, 0, 0]);
  const emitter = d.layers[4].children[2] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  assert.equal(emitter.material.opacity, 0);
  assert.equal(emitter.material.depthWrite, false);
  d.layers[4].traverse(o => { if (o instanceof THREE.Mesh) assert.equal(o.material.depthWrite, o.material.opacity >= 1); });
});

test("highlight and OLED fades are continuous and restore on seek", () => {
  const d = createScreen(), shot = { start: 0, end: 4 } as ShotSpec;
  const s = { at: "centro", mode: "oled" as const, explode: [[0,1]] as [number,number][], oled: [[0,0],[4,1]] as [number,number][], highlight: "cristal" as const };
  const opacity = () => ((d.layers[0].children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity;
  updateScreen(d, s, shot, 1, [0,0,0]); const first = opacity();
  updateScreen(d, s, shot, 1 + 1e-6, [0,0,0]); assert.ok(Math.abs(opacity() - first) < 1e-5);
  updateScreen(d, s, shot, 4, [0,0,0]); assert.equal(opacity(), 0);
  assert.ok(d.layers.slice(0,4).every(l => !l.visible));
  assert.equal(d.layers[4].visible, true);
  updateScreen(d, s, shot, 1, [0,0,0]); assert.equal(opacity(), first);
});

test("exploded fixture: continuous moving camera, whole stack in the wide key, highlighted plate whole in its close", () => {
  const fixture = JSON.parse(readFileSync("engine/fixtures/explodido.json", "utf8"));
  const d = createScreen();
  const frame = (shot: ShotSpec & { cam: { keys: any[] } }, key: any, highlight?: string) => {
    updateScreen(d, { at: "centro", mode: "branco", explode: [[0, 1]] }, shot, key.t, [0, 0.32, 0]);
    const yaw = THREE.MathUtils.degToRad(key.yaw);
    const camera = new THREE.PerspectiveCamera(key.fov, 9 / 16, 0.1, 100);
    camera.position.set(key.on[0] + Math.sin(yaw) * key.dist, key.on[1] + key.h, key.on[2] + Math.cos(yaw) * key.dist);
    camera.lookAt(new THREE.Vector3(key.on[0], key.on[1] + key.aim, key.on[2])); camera.updateMatrixWorld(); d.group.updateMatrixWorld(true);
    return d.layers.filter(l => !highlight || l.name === highlight)
      .flatMap(l => [-1.6, 1.6].flatMap(x => [-0.9, 0.9].map(y => l.localToWorld(new THREE.Vector3(x, y, 0)).project(camera))));
  };
  let wide = 0;
  for (let n = 0; n < fixture.shots.length; n++) {
    const shot = fixture.shots[n], keys = shot.cam.keys;
    if (n) assert.deepEqual({ ...keys[0], t: 0 }, { ...fixture.shots[n - 1].cam.keys.at(-1), t: 0 });
    for (let k = 1; k < keys.length; k++)
      assert.ok(Math.abs(keys[k].dist - keys[k - 1].dist) + Math.abs(keys[k].yaw - keys[k - 1].yaw) > 0.3, `shot ${shot.id} holds still`);
    const highlight = shot.screens[0].highlight;
    if (highlight) for (const key of keys.slice(1)) assert.ok(frame(shot, key, highlight).every(p => Math.abs(p.x) < 1 && Math.abs(p.y) < 1), `${highlight} cut at ${key.t}`);
    const end = keys.at(-1), points = frame(shot, end);
    if (!highlight && points.every(p => Math.abs(p.x) < 1 && Math.abs(p.y) < 1)) {
      wide++;
      assert.ok(Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x)) < 2 * 0.9);
    }
  }
  assert.ok(wide >= 1, "no key shows the whole exploded stack");
});

test("highlight leaves other plates at forty percent and patterns read in distinct directions", () => {
  const d = createScreen();
  updateScreen(d, { at: "centro", mode: "branco", explode: [[0,1]], highlight: "cristal" }, {start: 0, end: 4} as ShotSpec, 2, [0,0,0]);
  d.layers.forEach((layer,i) => {
    const plate = layer.children[0] as THREE.Mesh;
    assert.equal((plate.material as THREE.MeshBasicMaterial).opacity, i === 2 ? 1 : 0.4);
    const border = layer.getObjectByName("borda")!.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    assert.equal(border.material.opacity, i === 2 ? 1 : 0);
    assert.ok(layer.children.some(o => o instanceof THREE.LineSegments));
  });
  const vertical = (d.layers[1].children[1].children[0] as THREE.Mesh).geometry as THREE.BoxGeometry;
  const horizontal = (d.layers[4].children[1].children[0] as THREE.Mesh).geometry as THREE.BoxGeometry;
  assert.ok(vertical.parameters.height > vertical.parameters.width * 10);
  assert.ok(horizontal.parameters.width > horizontal.parameters.height * 10);
});
