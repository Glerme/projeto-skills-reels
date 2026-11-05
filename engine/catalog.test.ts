import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { catalogSheets, catalogSpec, catalogProp, fitCatalogProp, drawCatalogAnchors } from "./catalog";
import { loadCharacters } from "./cast/load-chars";
import { ACTION_IDS, validateSpec } from "./spec";
import { EXPR_IDS, isExpr } from "./style/toon";
import { SETS } from "./sets/index";
import { KENNEY } from "./kit";

const cast = loadCharacters("kit/characters");
const sheets = catalogSheets(cast);
const kit = Object.fromEntries(KENNEY.map(name => [name, new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1))]));
const sheet = (name: string) => sheets.find(s => s.name === name)!;

test("catalog covers every character, expression, action, view and registered model", () => {
  assert.deepEqual(sheet("personagens").items.map(i => i.name), Object.keys(cast));
  assert.deepEqual(sheet("expressoes").items.map(i => i.name), EXPR_IDS);
  assert.ok(EXPR_IDS.every(isExpr));
  assert.deepEqual(sheet("acoes").items.map(i => i.name), [...ACTION_IDS]);
  assert.deepEqual(sheet("props").items.map(i => i.model), KENNEY);
  for (const def of Object.values(SETS)) {
    const items = sheet(`cenarios-${def.id}`).items;
    assert.deepEqual(items.map(i => i.spec.shots[0].cam.from), Object.keys(def.views));
    assert.ok(items.every(i => i.anchors && i.spec.shots[0].set === def.id));
  }
  for (const s of sheets) {
    for (const item of s.items) {
      assert.deepEqual(validateSpec(item.spec, kit).ok, true, `${s.name}/${item.name}`);
      const actor = item.spec.shots[0].actors[0];
      if (s.name === "personagens") {
        assert.equal(actor.who, item.name); assert.equal(actor.facing, 0);
        assert.equal(item.spec.shots[0].cam.from, "medio");
      }
      if (s.name === "expressoes") assert.equal(actor.expr?.[0][1], item.name);
      if (s.name === "acoes") { assert.equal(actor.action, item.name); if (actor.cue !== undefined) assert.equal(actor.cue, 1); }
    }
    const spec = catalogSpec(s.items, kit);
    assert.equal(spec.shots.length, s.items.length);
    spec.shots.forEach((shot, i) => {
      assert.equal(shot.start, i * 2);
      for (const actor of shot.actors) {
        if (actor.cue !== undefined) assert.equal(actor.cue, shot.start + 1);
        if (actor.expr) assert.equal(actor.expr[0][0], shot.start);
      }
    });
  }
});

test("catalog validates panels and refuses missing models", () => {
  assert.throws(() => catalogSpec(sheet("props").items, {}), /modelo ausente/);
  const item = structuredClone(sheet("personagens").items[0]);
  item.spec.shots[0].actors[0].who = "missing";
  assert.throws(() => catalogSpec([item], kit), /não existe em cast/);
});

test("catalog prop uses native height and the shared dressing path", () => {
  const group = catalogProp("car-sedan", kit);
  const bounds = new THREE.Box3().setFromObject(group);
  assert.equal(bounds.getSize(new THREE.Vector3()).y, 2);
  assert.equal(bounds.min.y, 0);
  assert.ok(Math.abs(bounds.getCenter(new THREE.Vector3()).x - SETS.palco.spots.direita[0]) < 1e-6);
});

test("catalog anchor overlay labels projected spots and walkways", () => {
  const labels: string[] = [];
  const ctx = new Proxy({ canvas: { width: 1080, height: 1920 },
    fillText: (s: string) => labels.push(s) }, { get: (o, k) => Reflect.get(o, k) ?? (() => {}) }) as unknown as CanvasRenderingContext2D;
  const cam = new THREE.PerspectiveCamera(65, 9 / 16, 0.2, 1500);
  cam.position.set(0, 30, 80); cam.lookAt(0, 0, -30); cam.updateMatrixWorld();
  drawCatalogAnchors(ctx, sheet("cenarios-rua").items[0].spec.shots[0], cam);
  assert.ok(labels.includes("centro"));
  assert.ok(labels.some(n => Object.hasOwn(SETS.rua.walkways, n)));
});

test("catalog frames wide and tall natural props beside a person", () => {
  for (const size of [[15, 2, 3], [2, 20, 2]]) {
    const model = new THREE.Mesh(new THREE.BoxGeometry(...size));
    const group = catalogProp("car-sedan", { "car-sedan": model });
    const box = new THREE.Box3().setFromObject(group);
    assert.ok(box.min.x >= 0.4 - 1e-6, `min=${box.min.x}, shift=${group.position.x}`);
    const cam = new THREE.PerspectiveCamera(65, 9 / 16, 0.2, 1500);
    fitCatalogProp(group, cam);
    const points = [new THREE.Vector3(-2.2, 0, 0), new THREE.Vector3(-1, 2.4, 0)];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y])
      for (const z of [box.min.z, box.max.z]) points.push(new THREE.Vector3(x, y, z));
    for (const point of points) {
      point.project(cam);
      assert.ok(Math.abs(point.x) < 1 && Math.abs(point.y) < 1 && point.z < 1);
    }
  }
});

test("catalog clips walkways crossing the camera plane instead of hiding them", () => {
  const def = SETS.palco, original = def.walkways;
  const labels: string[] = [];
  const ctx = new Proxy({ canvas: { width: 1080, height: 1920 }, fillText: (s: string) => labels.push(s) },
    { get: (o, k) => Reflect.get(o, k) ?? (() => {}) }) as unknown as CanvasRenderingContext2D;
  const cam = new THREE.PerspectiveCamera(65, 9 / 16, 0.2, 100);
  cam.updateMatrixWorld();
  try {
    def.walkways = {
      crossing: { from: [0, 0, 2], to: [0, 0, -20], width: 1 },
      behind: { from: [0, 0, 2], to: [0, 0, 20], width: 1 },
      parallel: { from: [0, 0, -2], to: [1, 0, -2], width: 1 },
      hidden: { from: [0, 0, 2], to: [1, 0, 2], width: 1 },
    };
    drawCatalogAnchors(ctx, sheet("cenarios-palco").items[0].spec.shots[0], cam);
    assert.ok(labels.includes("crossing")); assert.ok(labels.includes("parallel"));
    assert.ok(!labels.includes("behind")); assert.ok(!labels.includes("hidden"));
  } finally { def.walkways = original; }
});

test("catalog draws all four segments of the closed Paris walkway", () => {
  const labels: string[] = [];
  const ctx = new Proxy({ canvas: { width: 1080, height: 1920 }, fillText: (s: string) => labels.push(s) },
    { get: (o, k) => Reflect.get(o, k) ?? (() => {}) }) as unknown as CanvasRenderingContext2D;
  const cam = new THREE.PerspectiveCamera(65, 9 / 16, 0.2, 1500);
  cam.position.set(0, 10, 20); cam.lookAt(0, 0, -10); cam.updateMatrixWorld();
  drawCatalogAnchors(ctx, sheet("cenarios-paris").items[0].spec.shots[0], cam);
  assert.equal(labels.filter(name => name === "praca_perto").length, 4);
});
