import * as THREE from "three";
import { camAt } from "../camera";
import type { ShotSpec } from "../spec";
import { test } from "node:test";
import assert from "node:assert/strict";
import { ANCHORS, SET_IDS } from "./anchors";
import { SETS, PENDING } from "./index";

test("every built set has exactly the anchors the validator knows", () => {
  for (const id of SET_IDS) {
    if (PENDING.includes(id)) { assert.throws(() => SETS[id].build(null as never, {}), /ainda não implementado/); continue; }
    const s = SETS[id];
    assert.equal(s.id, id);
    assert.deepEqual(Object.keys(s.spots).sort(), [...ANCHORS[id].spots].sort(), `${id} spots`);
    assert.deepEqual(Object.keys(s.views).sort(), [...ANCHORS[id].views].sort(), `${id} views`);
  }
});

test("paris keeps rua's view names and actor positions", () => {
  assert.deepEqual(Object.keys(SETS.paris.views), Object.keys(SETS.rua.views));
  assert.deepEqual(SETS.paris.spots, SETS.rua.spots);
});


test("paris keeps low/aerial directions and tower framing throughout hold", () => {
  const views = SETS.paris.views;
  for (const name of ["baixo", "aereo", "medio", "close"]) {
    const shot = { start: 0, end: 2, actors: [{ who: "host", at: "esquerda", action: "talk" }], cam: { recipe: "hold", from: name } } as ShotSpec;
    for (let f = 0; f < 60; f++) {
      const c = camAt(shot, f / 30, views, 30, SETS.paris.spots);
      const camera = new THREE.PerspectiveCamera(c.fov, 1080 / 1920, 0.2, 1500);
      camera.position.set(...c.pos);
      camera.lookAt(...c.look);
      camera.updateMatrixWorld();
      const project = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).project(camera);
      const inside = (p: THREE.Vector3) => Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.95 && Math.abs(p.z) < 1;
      if (name === "close" || name === "medio") {
        // The antenna and complete decks/lattice stay clear of the frame and adult head.
        assert.ok(inside(project(0, 27, -65)), `${name}: antenna at frame ${f}`);
        for (const x of [-1.5, 1.5]) assert.ok(inside(project(x, 14, -65)));
        for (const x of [-2.6, 2.6]) assert.ok(inside(project(x, 7, -65)));
        assert.ok(inside(project(0, 14, -65)));
        assert.ok(project(0, 14, -65).x > project(-1.6, 1.6, 0.3).x);
        for (const x of [-1.9, -1.3]) assert.ok(inside(project(x, 1.6, 0.3)));
      } else {
        assert.ok(inside(project(0, 27, -65)), `${name}: antenna at frame ${f}`);
        assert.ok(inside(project(0, 0, 0)), `${name}: actor feet at frame ${f}`);
        if (name === "baixo") {
          assert.ok(c.pos[1] < 1 && c.look[1] > c.pos[1]);
        } else {
          assert.ok(c.pos[1] > 16 && c.look[1] < c.pos[1]);
        }
      }
    }
  }
});

test("street crosswalks draw separated muted white stripes just above the road", async () => {
  const { drawCrosswalk } = await import("./rua");
  const { Batch } = await import("../style/build");
  const batch = new Batch(), root = new THREE.Group();
  drawCrosswalk(batch); batch.build(root);
  assert.equal(root.children.length, 1);
  const mesh = root.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
  const positions = mesh.geometry.getAttribute("position");
  const xs = new Set<number>(), zs = new Set<number>();
  for (let i = 0; i < positions.count; i++) {
    xs.add(Math.round(positions.getX(i) * 100)); zs.add(Math.round(positions.getZ(i) * 100));
    assert.ok(Math.abs(positions.getY(i) - 0.01) < 1e-6);
  }
  assert.equal(xs.size, 14); // seven separated stripes across the eight-metre road
  for (const z of [-7, 1.5]) {
    assert.ok(zs.has(Math.round((z - 0.7) * 100)));
    assert.ok(zs.has(Math.round((z + 0.7) * 100)));
  }
  assert.equal(mesh.material.color.getHexString(), "c6bfae");
});

// Canvas only supplies scenery textures; these checks inspect geometry/materials, without rendering pixels.
function buildParis() {
  const previous = globalThis.document;
  const context = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }) },
    { get: (target, key) => Reflect.get(target, key) ?? (() => {}) });
  globalThis.document = { createElement: () => ({ getContext: () => context }) } as unknown as Document;
  try {
    const root = new THREE.Group();
    SETS.paris.build(root, {});
    return root;
  } finally { globalThis.document = previous; }
}

test("Paris has paved ground beyond the fog in every direction and enclosing blocks", () => {
  const root = buildParis();
  root.updateMatrixWorld(true);
  const pavement: THREE.Mesh[] = [];
  root.traverse(o => {
    const mesh = o as THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
    if (mesh.isMesh && mesh.material.color.getHexString() === "aaa99f") pavement.push(mesh);
  });
  const ray = new THREE.Raycaster();
  for (const x of [-400, -100, 0, 100, 400]) for (const z of [-400, -150, 100, 400]) {
    ray.set(new THREE.Vector3(x, 20, z), new THREE.Vector3(0, -1, 0));
    assert.ok(ray.intersectObjects(pavement).length, `pavement at ${x}/${z}`);
  }
  const solids = SETS.paris.blocked({});
  for (const side of [-1, 1]) {
    assert.ok(solids.some(r => r.name.startsWith("fachada") && Math.sign(r.x) === side && r.z < -370));
    assert.ok(solids.some(r => r.name.startsWith("quarteirão") && Math.sign(r.x) === side && r.z > 40));
  }
  root.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose(); });
});

test("tower bronze uses two-tone modelling without the shared additive blue shadow lift", () => {
  const root = buildParis();
  let iron: THREE.MeshLambertMaterial | undefined;
  root.traverse(o => {
    const mesh = o as THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
    if (mesh.isMesh && mesh.material.color.getHexString() === "89704e") iron = mesh.material;
  });
  assert.ok(iron);
  assert.ok(iron.color.r > iron.color.g && iron.color.g > iron.color.b);
  const shader = { uniforms: {}, fragmentShader: "#include <common>\n#include <lights_fragment_begin>\n#include <lights_fragment_end>" };
  iron.onBeforeCompile(shader as never, null as never);
  assert.match(shader.fragmentShader, /#define LIFT_K 0\.000/);
  assert.match(shader.fragmentShader, /sunTerm/); // keep light/shade modelling
  root.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose(); });
});
