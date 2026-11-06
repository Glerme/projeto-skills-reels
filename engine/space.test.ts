import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { groundDistance, MIN_CLEARANCE, overlaps, rect, propRect, walkwayRect, pathPosition, onWalkway, walkwaySegments, crowdNearTime } from "./space";
import { SETS } from "./sets/index";
import { camAt } from "./camera";
import { PARIS_PAVEMENTS } from "./sets/paris";
import { STREET_PAVEMENTS, PLAZA_FRONT } from "./sets/rua";
import { loadLocalKit } from "./kit-node";
import { crowdFraming, speakerFraming } from "./framing";
import { validateSpec } from "./spec";
import { readFileSync } from "node:fs";

const kit = await loadLocalKit();
test("rotated rectangles use separating axes, allow touching, and retain model origin", () => {
  assert.equal(overlaps(rect("a", 0, 0, 2, 2), rect("b", 2, 0, 2, 2)), false);
  assert.equal(overlaps(rect("a", 0, 0, 4, 0.2, 45), rect("b", 0, 0, 4, 0.2, -45)), true);
  assert.equal(overlaps(rect("a", 0, 0, 4, 0.2, 45), rect("b", 3, 3, 4, 0.2, 45)), false);
  const model = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 6).translate(2, 2, 1));
  const r = propRect({ model: "box", at: "a", turn: 90, scale: 0.5, dx: 1 }, { a: [10, 0, 20] }, { box: model }, "box");
  assert.deepEqual(r, rect("box", 11.5, 19, 1, 3, 90));
});
test("every set declares clear solids and actor spots; street walkways avoid solids", () => {
  for (const def of Object.values(SETS)) {
    const solids = def.blocked(kit);
    assert.ok(solids.length > 0, def.id);
    for (let i = 0; i < solids.length; i++) {
      const a = solids[i];
      for (const b of solids.slice(i + 1)) {
        const distance = groundDistance(a, b);
        assert.equal(overlaps(a, b), false, `${def.id}: ${a.name} / ${b.name}`);
        if (def.id === "paris" || def.id === "rua") assert.ok(distance >= MIN_CLEARANCE - 1e-6, `${def.id}: ${a.name} / ${b.name}: ${distance} m`);
      }
      for (const [name, p] of Object.entries(def.spots)) assert.equal(overlaps(a, rect(name, p[0], p[2], 0.001, 0.001)), false, `${def.id}: ${a.name} / ${name}`);
      for (const [name, w] of Object.entries(def.walkways)) assert.equal(overlaps(a, walkwayRect(name, w)), false, `${def.id}: ${a.name} / ${name}`);
    }
    if (def.id === "paris") assert.ok(solids.some((r) => r.name === "torre"));
  }
});
test("paths stay on sidewalks, maintain step speed, wrap offscreen and seek deterministically", () => {
  for (const def of [SETS.rua, SETS.paris]) {
    assert.equal(Object.keys(def.walkways).length, def.id === "paris" ? 9 : 5);
    for (const w of Object.values(def.walkways)) {
      const a = pathPosition(w, 1), b = pathPosition(w, 2), c = pathPosition(w, 3);
      if (!w.via) assert.ok(Math.abs(a.p.distanceTo(b.p) - 1.2) < 1e-9);
      if (!w.via) assert.ok(Math.abs(b.p.distanceTo(c.p) - 1.2) < 1e-9);
      for (const t of [0, 2, 100, 200, -1]) {
        const p = pathPosition(w, t).p;
        assert.ok(onWalkway(p.toArray() as [number, number, number], w));
        assert.deepEqual(pathPosition(w, t).p, p);
      }
    }
  }
});
const fixture = () => JSON.parse(readFileSync("engine/fixtures/two-shots.json", "utf8"));
test("validator rejects scenery, actor, walkway and prop collisions, identifies both objects", () => {
  const fake = { "car-sedan": new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)) };
  const errors = (props: unknown[]) => {
    const s = fixture(); s.dressing = { paris: props };
    const r = validateSpec(s, fake); assert.equal(r.ok, false); return r.ok ? "" : r.errors.join("\n");
  };
  const p = { model: "car-sedan", at: "centro" };
  assert.match(errors([p]), /prop 1 .*spot centro/);
  assert.match(errors([{ ...p, dx: 10, dz: -34 }]), /prop 1 .*prédio/);
  assert.match(errors([{ ...p, dx: 5.25 }]), /prop 1 .*calçada/);
  assert.match(errors([{ ...p, dx: 1, dz: -15 }, { ...p, dx: 1, dz: -15 }]), /prop 2 .*prop 1/);
  const s = fixture(); s.dressing = { paris: [{ ...p, dx: 1, dz: -15 }] };
  assert.equal(validateSpec(s, fake).ok, true);
  assert.equal(validateSpec(s, {}).ok, false);
});
test("paths replace at/to, old scene props fail, and street walk cannot cross the road", () => {
  const s = fixture(); const a = s.shots[0].actors[0]; s.shots[0].set = "paris";
  a.action = "walk"; a.to = "esquerda";
  assert.equal(validateSpec(s).ok, false);
  delete a.at; delete a.to; a.path = "praca";
  s.shots[0].cam = { from: "medio", recipe: "hold" };
  assert.equal(validateSpec(s).ok, true);
  a.path = "constructor"; assert.equal(validateSpec(s).ok, false);
  a.path = "esquerda_ida"; a.action = "talk"; assert.equal(validateSpec(s).ok, false);
  delete a.path; a.action = "talk"; a.at = "centro"; s.shots[0].props = [];
  assert.equal(validateSpec(s).ok, false);
});

test("walkway endpoints and loop discontinuities stay outside every street view", async () => {
  const { camAt } = await import("./camera");
  for (const def of [SETS.rua, SETS.paris]) for (const view of Object.keys(def.views)) {
    const shot = { start: 0, end: 36, cam: { from: view, recipe: "hold" } } as import("./spec").ShotSpec;
    for (const t of [0, 18, 35.9]) {
      const c = camAt(shot, t, def.views);
      const camera = new THREE.PerspectiveCamera(c.fov, 9 / 16, 0.2, 1500);
      camera.position.set(...c.pos); camera.lookAt(...c.look); camera.updateMatrixWorld();
      for (const [name, w] of Object.entries(def.walkways)) for (const end of [w.from, w.to]) {
        if (w.via) continue; // Closed route returns to the same point without teleporting.
        // Nearby plaza loops are for street-level views; the Eiffel spec checks their actual cameras below.
        if (view === "aereo" && (name.startsWith("praca_") || name.startsWith("lateral_"))) continue;
        const p = new THREE.Vector3(...end).project(camera);
        assert.ok(Math.abs(p.x) > 1 || Math.abs(p.y) > 1 || Math.abs(p.z) > 1, `${def.id} ${view}: ${end}`);
      }
    }
  }
});

test("Eiffel spec uses continuous dressing and valid sidewalk paths", { skip: !kit["lantern"] || !kit["stall-green"] }, () => {
  const s = JSON.parse(readFileSync("engine/fixtures/torre-eiffel-verao.json", "utf8"));
  for (const [role, id] of Object.entries(s.cast)) s.cast[role] = JSON.parse(readFileSync(`kit/characters/${id}.json`, "utf8"));
  const result = validateSpec(s, kit);
  assert.ok(result.ok, result.ok ? "" : result.errors.join("\n"));
  assert.equal(s.dressing.paris.length, 4);
  let scenesWithVisibleExtra = 0;
  for (const shot of s.shots) {
    const speakers = shot.actors.filter((a: import("./spec").ActorSpec) => !a.path);
    const extras = shot.actors.filter((a: import("./spec").ActorSpec) => a.path);
    if (extras.some((a: import("./spec").ActorSpec) => !crowdFraming(shot, SETS.paris, a, speakers, s.cast).unseen)) scenesWithVisibleExtra++;
    if (shot.id === 1 || shot.id === 12) assert.equal(speakerFraming(shot, SETS.paris, speakers[0], s.cast), undefined);
    // Check the complete card at both loop endpoints in every camera actually using the new paths.
    for (const extra of extras.filter((a: import("./spec").ActorSpec) => !SETS.paris.walkways[a.path!].via)) for (const t of [shot.start, shot.end]) {
      const c = camAt(shot, t, SETS.paris.views);
      const camera = new THREE.PerspectiveCamera(c.fov, 9 / 16, 0.2, 1500);
      camera.position.set(...c.pos); camera.lookAt(...c.look); camera.updateMatrixWorld();
      for (const end of [SETS.paris.walkways[extra.path!].from, SETS.paris.walkways[extra.path!].to]) {
        const corners = [-0.648, 0.648].map(x => new THREE.Vector3(end[0] + x, end[1] + 1, end[2]).project(camera));
        assert.ok(corners.every(p => Math.abs(p.x) > 1 || Math.abs(p.y) > 1 || Math.abs(p.z) > 1), `${shot.id}: loop outside frame`);
      }
    }
    assert.equal(shot.props, undefined);
    for (const actor of shot.actors) if (actor.action === "walk") assert.ok(actor.path);
  }
  assert.ok(scenesWithVisibleExtra === s.shots.length, "extra visible in every scene");
  for (const shot of s.shots) assert.ok(shot.actors.some((a: import("./spec").ActorSpec) => a.who === "visitante" && a.path === "praca_perto"));
});

test("dressing reserves cartoon vegetation beyond the original GLB box", async () => {
  const { propBounds } = await import("./style/build");
  const model = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4, 0.1));
  const r = propRect({ model: "tree_default", at: "a", turn: 35, scale: 0.8 }, { a: [2, 0, -10] }, { tree_default: model }, "tree");
  const box = propBounds({}, "tree_default", 2, 0, -10, 3.2, 35 * Math.PI / 180);
  assert.ok(r.width > 0.1 && r.depth > 0.1);
  assert.ok(r.x - r.width / 2 <= box.min.x && r.x + r.width / 2 >= box.max.x);
  assert.ok(r.z - r.depth / 2 <= box.min.z && r.z + r.depth / 2 >= box.max.z);
});

test("ground clearance measures rotated edges, diagonal gaps, touching and overlap", () => {
  const a = rect("a", 0, 0, 2, 2);
  assert.equal(groundDistance(a, rect("b", 0, 0, 1, 1)), 0);
  assert.equal(groundDistance(a, rect("b", 2, 0, 2, 2)), 0);
  assert.ok(Math.abs(groundDistance(a, rect("b", 2.6, 0, 2, 2)) - 0.6) < 1e-9);
  assert.ok(Math.abs(groundDistance(a, rect("b", 2.3, 2.4, 2, 2)) - 0.5) < 1e-9);
  const b = rect("b", 4, 0, 2, 2, 45);
  assert.ok(Math.abs(groundDistance(a, b) - (3 - Math.SQRT2)) < 1e-9);
  assert.equal(groundDistance(a, b), groundDistance(b, a));
});

test("validator enforces 0.6 m between props, including a non-overlapping near miss", () => {
  const fake = { "car-sedan": new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)) };
  for (const gap of [0, 0.59, 0.6, 0.61]) {
    const s = fixture();
    s.dressing = { paris: [
      { model: "car-sedan", at: "centro", dx: -1, dz: -15 },
      { model: "car-sedan", at: "centro", dx: gap, dz: -15 },
    ] };
    const result = validateSpec(s, fake);
    assert.equal(result.ok, gap >= 0.6, JSON.stringify(result));
    if (!result.ok) assert.match(result.errors.join("\n"), /prop 2 .*prop 1 .*distância [\d.]+ m/);
  }
});

test("a transverse walkway moves a visible walker by 15% of each view in two seconds", async () => {
  const { camAt } = await import("./camera");
  for (const def of [SETS.rua, SETS.paris]) for (const view of ["aberto", "medio", "baixo"]) {
    const camera = new THREE.PerspectiveCamera(50, 9 / 16, 0.2, 1500);
    const crosses = Object.keys(def.walkways).some((path) => {
      // Find a visible crossing within one loop; camera time and walking time are both absolute.
      for (let start = 0; start < 120; start += 0.25) {
        const shot = { start, end: start + 4, cam: { from: view, recipe: "hold" } } as import("./spec").ShotSpec;
        const projected = Array.from({ length: 61 }, (_, frame) => {
          const t = start + frame / 30, c = camAt(shot, t, def.views);
          camera.fov = c.fov; camera.updateProjectionMatrix();
          camera.position.set(...c.pos); camera.lookAt(...c.look); camera.updateMatrixWorld();
          return pathPosition(def.walkways[path], t).p.add(new THREE.Vector3(0, 1, 0)).project(camera);
        });
        if (projected.every((p) => Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && Math.abs(p.z) < 1) &&
          Math.abs(projected[60].x - projected[0].x) / 2 >= 0.15) return true;
      }
      return false;
    });
    assert.ok(crosses, `${def.id} ${view}: visible transverse motion >= 15%`);
  }
});

test("validator measures the clearance from a prop to the tower edge", () => {
  const fake = { "car-sedan": new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)) };
  for (const gap of [0.59, 0.6]) {
    const s = fixture();
    s.dressing = { paris: [{ model: "car-sedan", at: "centro", dz: -65 + 4.88 + 0.5 + gap }] };
    const result = validateSpec(s, fake);
    assert.equal(result.ok, gap >= 0.6, JSON.stringify(result));
    if (!result.ok) assert.match(result.errors.join("\n"), /prop 1 .*torre: distância 0.590 m/);
  }
});

test("walkways wrap at their endpoints, never at scene boundaries", () => {
  for (const w of Object.values(SETS.paris.walkways).filter(w => !w.via)) {
    const from = new THREE.Vector3(...w.from), to = new THREE.Vector3(...w.to), dir = to.clone().sub(from);
    const length = dir.length(), start = Math.max(0, Math.min(length, -from.dot(dir) / length));
    const wrap = (length - start) / 1.2;
    assert.ok(pathPosition(w, wrap - 0.001).p.distanceTo(to) < 0.002);
    assert.ok(pathPosition(w, wrap + 0.001).p.distanceTo(from) < 0.002);
    assert.ok(pathPosition(w, 1).p.distanceTo(pathPosition(w, 1 + length / 1.2).p) < 1e-9);
  }
});

test("every street walkway fits entirely on the drawn sidewalk or plaza", () => {
  for (const def of [SETS.rua, SETS.paris]) {
    assert.ok(def.walkways.praca.from[2] + def.walkways.praca.width / 2 <= PLAZA_FRONT + 1e-6);
    assert.equal(def.walkways.travessia, undefined);
    assert.equal(def.walkways.travessia_frente, undefined);
    // Areas come from the set's pavement geometry, not the path being checked.
    if (def.id === "paris") for (const car of def.blocked(kit).filter((r) => r.name.startsWith("car-"))) {
      assert.ok(car.z - car.depth / 2 >= PLAZA_FRONT, `${car.name}: outside pedestrian forecourt`);
    }
    const areas = def.id === "paris" ? PARIS_PAVEMENTS : STREET_PAVEMENTS;
    for (const [name, w] of Object.entries(def.walkways)) {
      const r = walkwayRect(name, w), angle = r.turn * Math.PI / 180;
      const corners = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({
        x: r.x + sx * r.width / 2 * Math.cos(angle) + sz * r.depth / 2 * Math.sin(angle),
        z: r.z - sx * r.width / 2 * Math.sin(angle) + sz * r.depth / 2 * Math.cos(angle),
      })));
      assert.ok(areas.some((a) => corners.every((p) => p.x >= a.x0 - 1e-6 && p.x <= a.x1 + 1e-6 && p.z >= a.z0 - 1e-6 && p.z <= a.z1 + 1e-6)), `${def.id}: ${name}`);
    }
  }
});

test("validator rejects paths approaching any presenter, even between frames and across wraps", async () => {
  const { crowdNearTime, actorPosition } = await import("./space");
  const s = fixture(), shot = s.shots[0]; shot.set = "paris";
  const def = SETS.paris, original = def.walkways, originalSpots = def.spots;
  try {
    def.spots = { ...def.spots, centro: [0.018, 0, 0] };
    for (const distance of [2.9999999, 3, 3.001]) {
      // Closest point is 0.015 s, between the first two frames.
      def.walkways = { test: { from: [-20, 0, distance], to: [20, 0, distance], width: 0.5 } };
      shot.actors = [{ who: Object.keys(s.cast)[0], action: "point", at: "centro" },
        { who: Object.keys(s.cast)[1] ?? Object.keys(s.cast)[0], action: "walk", path: "test" }];
      const result = validateSpec(s);
      assert.equal(result.ok ? false : result.errors.some(e => e.includes("menos de 3 m")), distance < 3, JSON.stringify(result));
      if (!result.ok && distance < 3) assert.match(result.errors.join("\n"), /cena 1: figurante .*menos de 3 m.*em [\d.]+ s/);
    }
    const moving = { ...shot, start: 0, end: 2, actors: [
      { who: "speaker", at: "a", to: "b", action: "walk" },
      { who: "extra", path: "test", action: "walk" },
    ] } as import("./spec").ShotSpec;
    const spots: Record<string, [number, number, number]> = { a: [0, 0, 5], b: [0, 0, -5] };
    const paths: Record<string, import("./space").Walkway> = { test: { from: [-10, 0, 0], to: [10, 0, 0], width: 0.5 } };
    const time = crowdNearTime(moving, spots, paths, moving.actors[1], moving.actors[0]);
    assert.notEqual(time, undefined);
    assert.ok(actorPosition(moving, spots, paths, moving.actors[1], time!).p.distanceTo(actorPosition(moving, spots, paths, moving.actors[0], time!).p) < 3);
    const wrapPaths: Record<string, import("./space").Walkway> = { test: { from: [-10, 0, 0], to: [10, 0, 0], width: 0.5 } };
    const wrapShot = { ...moving, start: 8, end: 9, actors: [{ who: "s", at: "a", action: "talk" }, moving.actors[1]] } as import("./spec").ShotSpec;
    assert.equal(crowdNearTime(wrapShot, { a: [0, 0, 0] }, wrapPaths, wrapShot.actors[1], wrapShot.actors[0]), undefined);
    assert.notEqual(crowdNearTime(wrapShot, { a: [-10, 0, 0] }, wrapPaths, wrapShot.actors[1], wrapShot.actors[0]), undefined);
  } finally { def.walkways = original; def.spots = originalSpots; }
});

test("closed plaza route keeps speed, turns, clearance and a continuous absolute-time seam", () => {
  const w = SETS.paris.walkways.praca_perto;
  const parts = walkwaySegments(w);
  assert.equal(parts.length, 4);
  assert.deepEqual(w.from, w.to);
  const length = parts.reduce((sum, part) => sum + new THREE.Vector3(...part.from).distanceTo(new THREE.Vector3(...part.to)), 0);
  let distance = 0;
  for (const part of parts) {
    const t = (distance + 0.2) / 1.2;
    assert.ok(Math.abs(pathPosition(w, t).p.distanceTo(pathPosition(w, t + 0.1).p) - 0.12) < 1e-9);
    distance += new THREE.Vector3(...part.from).distanceTo(new THREE.Vector3(...part.to));
    assert.ok(pathPosition(w, distance / 1.2).p.distanceTo(new THREE.Vector3(...part.to)) < 1e-9);
  }
  const period = length / 1.2;
  assert.ok(pathPosition(w, period - 0.001).p.distanceTo(pathPosition(w, period + 0.001).p) <= 0.0024);
  assert.ok(pathPosition(w, -1).p.distanceTo(pathPosition(w, period - 1).p) < 1e-9);
  const shot = { start: 0, end: 36, actors: [{ who: "a", path: "praca_perto", action: "walk" },
    { who: "b", at: "esquerda", action: "talk" }] } as import("./spec").ShotSpec;
  assert.equal(crowdNearTime(shot, SETS.paris.spots, SETS.paris.walkways, shot.actors[0], shot.actors[1]), undefined);
  const spots = { ...SETS.paris.spots, esquerda: w.from };
  assert.notEqual(crowdNearTime(shot, spots, SETS.paris.walkways, shot.actors[0], shot.actors[1]), undefined);
});
