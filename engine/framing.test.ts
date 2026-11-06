import * as THREE from "three";
import { camAt } from "./camera";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateSpec } from "./spec";
import { crowdFraming } from "./framing";
import { SETS } from "./sets/index";

const fixture = () => {
  const s = JSON.parse(readFileSync("engine/fixtures/two-shots.json", "utf8"));
  s.shots = [{ ...s.shots[0], set: "paris", start: 0, end: 4, cam: { from: "baixo", recipe: "hold" }, actors: [
    { who: Object.keys(s.cast)[0], at: "centro", action: "point" },
    { who: Object.keys(s.cast)[1], path: "praca", action: "walk" },
  ] }];
  s.duration = 4;
  return s;
};
test("validator rejects screen overlap despite distant world positions, identifies actor and time", () => {
  const s = fixture();
  const r = validateSpec(s);
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.match(r.errors.join("\n"), /cena 1: figurante .*12%.*silhueta.*em .* s/);
    assert.ok(!r.errors.some(e => e.includes("menos de 3 m")));
  }
  s.shots[0].start = 10; s.shots[0].end = 14;
  const shot = s.shots[0];
  assert.equal(crowdFraming(shot, SETS.paris, shot.actors[1], [shot.actors[0]], s.cast).near, undefined);
});
test("validator rejects slow lateral path/view and accepts plaza or short shot", () => {
  const s = fixture(), shot = s.shots[0];
  shot.start = 12; shot.end = 16; shot.cam.from = "aberto";
  shot.actors[1].path = "esquerda_ida";
  const check = () => crowdFraming(shot, SETS.paris, shot.actors[1], [], s.cast);
  assert.equal(check().slow, true);
  // Validator must report the incompatible combination, too.
  const r = validateSpec(s);
  assert.ok(!r.ok && r.errors.some(e => /path "esquerda_ida" x view "aberto".*15%.*2 s/.test(e)));
  shot.end = 13.9; assert.equal(check().slow, false);
  shot.end = 16; shot.actors[1].path = "praca"; assert.equal(check().slow, false);
});
test("invalid camera data returns errors instead of entering projection", () => {
  for (const cam of [null, { recipe: "glide", from: "baixo" }, { recipe: "hold", from: "missing" },
    { recipe: "hold", from: "baixo", punch: "bad" }]) {
    const s = fixture(); s.shots[0].cam = cam;
    assert.equal(validateSpec(s).ok, false);
  }
});
test("plaza edges include facades and trees beyond the tower, with clearance", () => {
  const solids = SETS.paris.blocked({});
  for (const side of [-1, 1]) {
    assert.ok(solids.some(r => r.name.startsWith("fachada") && r.z < -65 && Math.sign(r.x) === side));
    assert.ok(solids.some(r => r.name.startsWith("tree_default") && r.z < -65 && Math.sign(r.x) === side));
  }
});

// On the optical axis, a 2.16 m card at 13.5 m fills exactly 8% with a 90-degree lens.
const visibilityFixture = () => {
  const shot = { id: 1, start: 0, end: 1, set: "paris", light: "day",
    cam: { recipe: "hold", from: "aberto" }, actors: [{ who: "extra", action: "walk", path: "test" }] } as import("./spec").ShotSpec;
  const def = { ...SETS.paris,
    views: { aberto: { pos: [0, 1, 12.96], look: [0, 1, 0], fov: 90, roll: 0 } },
    walkways: { test: { from: [0, 0, 100], to: [0, 0, -100], width: 1 } },
  } as import("./sets/types").SetDef;
  return { shot, def };
};

test("extra must reach 8% for half the duration, including camera creep and scale", () => {
  const { shot, def } = visibilityFixture();
  const check = (scale = 1) => crowdFraming(shot, def, shot.actors[0], [], { extra: { scale } as import("./spec").CharDef });
  assert.equal(check().unseen, false); // remains above the height threshold for more than half the take
  def.views.aberto.pos[2] = 12.96;
  assert.equal(check().unseen, false); // exactly half the sampled duration is enough
  shot.end = 1.01;
  assert.equal(check().unseen, true); // the final partial frame is invisible and still counts toward duration
  shot.end = 1;
  def.views.aberto.pos[2] = 13.0;
  assert.equal(check().unseen, true); // crosses before halfway, despite being large enough at the start
  assert.equal(check(2).unseen, false);
  assert.equal(check(0.5).unseen, true);
});

test("extras outside the sides or behind the camera do not count as visible", () => {
  const { shot, def } = visibilityFixture();
  def.walkways.test.from[0] = def.walkways.test.to[0] = 100;
  assert.equal(crowdFraming(shot, def, shot.actors[0], [], {}).unseen, true);
  def.walkways.test.from[0] = def.walkways.test.to[0] = 0;
  def.views.aberto.look = [0, 1, 100];
  assert.equal(crowdFraming(shot, def, shot.actors[0], [], {}).unseen, true);
});

test("validator names the scene and extra when its path is too far away", () => {
  const s = fixture();
  s.shots[0].actors = [s.shots[0].actors[1]];
  s.shots[0].cam.from = "aberto";
  s.cast.mulher.scale = 0.5;
  const result = validateSpec(s);
  assert.ok(!result.ok);
  assert.match(result.errors.join("\n"), /cena 1: figurante mulher .*8%.*metade da cena/);
});

test("speaker must fit throughout creep and punches, with an exception for an intentional close", () => {
  const s = fixture(), shot = s.shots[0];
  shot.actors = [shot.actors[0]];
  shot.focus = shot.actors[0].who; // point/gesture presenters count, as well as talk
  shot.cam.punch = [1.8];
  shot.actors[0].at = "esquerda";
  assert.equal(validateSpec(s).ok, true); // the portrait axis follows the lateral presenter
  s.cast.homem.scale = 2;
  const result = validateSpec(s);
  assert.ok(!result.ok && result.errors.some(e => /quem fala/.test(e)));
  delete s.cast.homem.scale;
  shot.cam.from = "aberto";
  shot.actors[0].at = "centro";
  assert.equal(validateSpec(s).ok, true);
  delete shot.focus;
  shot.actors[0].action = "talk";
  shot.actors[0].at = "direita";
  shot.cam.from = "medio";
  assert.equal(validateSpec(s).ok, true);
  shot.actors[0].at = "centro";
  shot.cam.from = "close";
  assert.equal(validateSpec(s).ok, true);
});

test("validator requires a retained extra to be visible again in each scene", () => {
  const s = fixture();
  s.shots[0].actors = [s.shots[0].actors[1]];
  s.shots[0].cam.from = "medio";
  s.shots[0].end = 1;
  s.shots.push({ ...structuredClone(s.shots[0]), id: 2, start: 1, end: 2, cam: { recipe: "hold", from: "aereo" } });
  s.duration = 2;
  const r = validateSpec(s);
  assert.ok(!r.ok);
  assert.ok(r.errors.some(e => /cena 2: figurante .*8%.*metade da cena/.test(e)));
  assert.ok(!r.errors.some(e => /cena 1: figurante .*8%/.test(e)));
});

import { speakerFraming, CAPTION_TOP } from "./framing";
test("speaker clears caption band throughout a shot; face close must still clear its chin", () => {
  const s = fixture(), shot = s.shots[0];
  shot.actors = [shot.actors[0]]; shot.actors[0].at = "centro";
  shot.cam = { recipe: "push", from: "aberto", punch: [1] };
  const def: import("./sets/types").SetDef = { ...SETS.paris, views: { aberto: { pos: [0, 2, 10], look: [0, 2, 0], fov: 50, roll: 0 } } };
  assert.equal(speakerFraming(shot, def, shot.actors[0], s.cast), 0); // entire card fits, feet cross captions
  def.views.aberto.pos[1] = def.views.aberto.look[1] = 0.1;
  assert.equal(speakerFraming(shot, def, shot.actors[0], s.cast), undefined);
  shot.cam.from = "close";
  const close: import("./sets/types").SetDef = { ...def, views: { close: { ...def.views.aberto, pos: [0, 2, 4], look: [0, 2, 0] } } };
  assert.equal(speakerFraming(shot, close, shot.actors[0], s.cast), 0); // cropped chin is not exempt
  close.views = { close: { pos: [0, 0.8, 3.4], look: [0, 0.8, 0], fov: 50, roll: 0 } };
  assert.equal(speakerFraming(shot, close, shot.actors[0], s.cast), undefined);
});

test("keys: a pull-back from a face close to medium passes on the face rule while it moves, not once it stops", () => {
  const s = fixture(), shot = s.shots[0];
  shot.actors = [{ ...shot.actors[0], at: "centro" }];
  const pull = { recipe: "keys", keys: [{ t: shot.start, on: "centro", dist: 3.5, h: 1.3, aim: 1.2, fov: 32 },
    { t: shot.start + 1, on: "centro", dist: 7.2, h: 1.4, aim: 0.6, fov: 40, ease: "out" }] } as import("./spec").ShotSpec["cam"];
  assert.equal(speakerFraming({ ...shot, cam: pull }, SETS.palco, shot.actors[0], s.cast), undefined);
  // the same 62 % frame held still: the whole card must clear the band, and it cannot
  const held = { recipe: "keys", keys: [{ t: shot.start, on: "centro", dist: 5.6, h: 1.35, aim: 0.9, fov: 36 }] } as import("./spec").ShotSpec["cam"];
  assert.equal(speakerFraming({ ...shot, cam: held }, SETS.palco, shot.actors[0], s.cast), shot.start);
});

test("caption band covers maximum two-line type and stroke inside craft's safe bottom", () => {
  const source = readFileSync("pipeline/captions.py", "utf8");
  const bottom = Number(source.match(/bottom: (\d+)px/)![1]);
  const font = Number(source.match(/Math.min\((\d+), fit/)![1]);
  const leading = Number(source.match(/line-height: ([\d.]+)/)![1]);
  const stroke = Number(source.match(/text-stroke: ([\d.]+)em/)![1]) * font;
  assert.ok(bottom - stroke >= 460);
  assert.equal(CAPTION_TOP, Math.ceil(bottom + 2 * font * leading + stroke));
});

test("a closed walkway still rejects a longitudinal leg that looks stationary for two seconds", () => {
  const { shot, def } = visibilityFixture();
  shot.end = 3;
  def.walkways.test = { from: [0, 0, 0], via: [[0, 0, -10], [2, 0, -10], [2, 0, 0]], to: [0, 0, 0], width: 1 };
  assert.equal(crowdFraming(shot, def, shot.actors[0], [], {}).slow, true);
});

test("every set/view/main spot frames a speaker at the required size", () => {
  for (const [set, def] of Object.entries(SETS)) for (const view of Object.keys(def.views)) {
    // These are landscape/action views, aimed at the tower, stream or duel rather than a presenter.
    if (["aereo", "duelo", "riacho", "queda"].includes(view)) continue;
    for (const at of ["centro", "esquerda", "direita"]) for (const recipe of ["hold", "push"] as const) {
      const s = fixture();
      s.shots = [{ id: 1, start: 0, end: 60, set, light: "day", cam: { from: view, recipe, punch: [1] },
        actors: [{ who: "homem", at, action: "talk" }] }];
      s.duration = 60;
      const result = validateSpec(s);
      assert.ok(result.ok, `${set}/${view}/${at}/${recipe}: ${result.ok ? "" : result.errors.join("; ")}`);
      // Independent projection checks the numeric contract, rather than only trusting the validator.
      for (const t of [0, 60]) {
        const c = camAt(s.shots[0], t, def.views, 30, def.spots);
        const camera = new THREE.PerspectiveCamera(c.fov, 9 / 16, 0.2, 1500);
        camera.position.set(...c.pos); camera.lookAt(...c.look); camera.updateMatrixWorld();
        const p = new THREE.Vector3(...def.spots[at]);
        const yaw = Math.atan2(camera.position.x - p.x, camera.position.z - p.z);
        const corners = [-0.648, 0.648].flatMap(x => [-0.054, 2.106].map(y =>
          new THREE.Vector3(x, y, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(p).project(camera)));
        const bottom = Math.min(...corners.map(p => p.y)), top = Math.max(...corners.map(p => p.y));
        const height = (top - bottom) / 2;
        assert.ok(height >= (view === "medio" ? 0.35 : view === "close" ? 0.65 : 0.18));
        if (view === "medio") {
          assert.ok(height <= 0.45);
          assert.ok(bottom >= -1 + 2 * 676 / 1920 && bottom <= -0.15, "feet just above captions");
        }
      }
    }
  }
});

test("validator rejects undersized speakers and oversized medium, including scale", () => {
  for (const view of ["aberto", "medio", "close", "baixo"]) {
    const s = fixture();
    s.shots[0].actors = [{ who: "homem", at: "centro", action: "talk" }];
    s.shots[0].cam = { recipe: "hold", from: view };
    assert.equal(validateSpec(s).ok, true, view);
    s.cast.homem.scale = 0.5;
    const result = validateSpec(s);
    assert.ok(!result.ok && result.errors.some(e => /altura mínima: aberto\/baixo 18%, medio 35–45%, close 65%/.test(e)), view);
  }
  const s = fixture(); s.shots[0].actors = [{ who: "homem", at: "centro", action: "talk" }];
  s.shots[0].cam = { recipe: "hold", from: "medio" };
  s.cast.homem.scale = 1.3;
  assert.equal(validateSpec(s).ok, false);
});
