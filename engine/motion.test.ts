// Free camera (cam.keys), beats, travel windows and pop-ins.
import { test } from "node:test";
import assert from "node:assert/strict";
import { camAt, type Cam } from "./camera";
import { actorPose } from "./cast/actions";
import { actorPosition } from "./space";
import { validateSpec, type ShotSpec, type ActorSpec } from "./spec";
import { SETS } from "./sets/index";

const views: Record<string, Cam> = { aberto: { pos: [0, 0.8, 11], look: [0, 0.8, 0], fov: 50, roll: 0 } };
const spots = { centro: [0, 0, 0], esquerda: [-2, 0, 0] } as Record<string, [number, number, number]>;
const shot = (o: Partial<ShotSpec>): ShotSpec =>
  ({ id: 1, start: 0, end: 4, set: "palco", light: "day", actors: [], cam: { recipe: "hold", from: "aberto" }, ...o } as ShotSpec);
const near = (a: number, b: number, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);

test("keys: lands on each key and orbits the target", () => {
  const s = shot({ cam: { recipe: "keys", from: "", keys: [
    { t: 0, on: "centro", dist: 4, yaw: 0, fov: 30 }, { t: 2, on: "centro", dist: 10, yaw: 90, h: 3, aim: 1, fov: 50 }] } });
  const a = camAt(s, 0, views, 30, spots), b = camAt(s, 2, views, 30, spots);
  near(a.pos[2], 4); near(a.pos[0], 0); near(a.look[1], 1.35); near(a.fov, 30);
  near(b.pos[0], 10, 1e-6); near(b.pos[1], 3); near(b.fov, 50 * (1 - 0.00012 * 60));
  // between keys the distance grows monotonically (log-spline, no overshoot with two keys)
  let prev = 0;
  for (let f = 0; f <= 60; f++) {
    const c = camAt(s, f / 30, views, 30, spots), d = Math.hypot(c.pos[0], c.pos[2]);
    assert.ok(d >= prev - 1e-9); prev = d;
  }
});

test("keys: a key on an actor tracks the actor while it travels", () => {
  const walker: ActorSpec = { who: "x", at: "centro", to: "esquerda", action: "stand", travel: [1, 3] };
  const s = shot({ actors: [walker], cam: { recipe: "keys", from: "", keys: [{ t: 0, on: "x", dist: 5 }] } });
  near(camAt(s, 0.5, views, 30, spots).look[0], 0);
  near(camAt(s, 3.5, views, 30, spots).look[0], -2);
  // the travel window: still before, moving inside, still after
  assert.equal(actorPosition(s, spots, {}, walker, 0.5).dir.lengthSq(), 0);
  assert.ok(actorPosition(s, spots, {}, walker, 2).dir.lengthSq() > 0);
  near(actorPosition(s, spots, {}, walker, 2).p.x, -1);
});

test("keys: a world point target", () => {
  const s = shot({ cam: { recipe: "keys", from: "", keys: [{ t: 0, on: [0, 0, -60], dist: 50, aim: 20 }] } });
  const c = camAt(s, 0, views, 30, spots);
  near(c.pos[2], -10); near(c.look[1], 20);
});

test("beats switch the pose, blending with an overshoot", () => {
  const a: ActorSpec = { who: "x", at: "centro", action: "stand", beats: [[1, "cheer"]] };
  assert.equal(actorPose(a, 0, 4, 0.9, 1).expr, undefined);
  assert.equal(actorPose(a, 0, 4, 1.5, 1).expr, "grin");
  // the arms rise from hanging to the cheer V without a jump of more than ~half the way in one frame
  const arm = (t: number) => actorPose(a, 0, 4, t, 1).rig!.armL![0];
  for (let f = 30; f < 40; f++) assert.ok(Math.abs(arm((f + 1) / 30) - arm(f / 30)) < 90);
  assert.ok(Math.max(...Array.from({ length: 8 }, (_, k) => arm(1 + k / 30))) > arm(1.5) - 15);
});

test("travel walks inside its window and runs when fast", () => {
  const a: ActorSpec = { who: "x", at: "centro", action: "point", to: "esquerda", travel: [1, 2] };
  assert.equal(actorPose(a, 0, 4, 1.5, 1, 2).mode, "stroll");
  assert.equal(actorPose(a, 0, 4, 3, 1, 2).arms, "point");
  assert.equal(actorPose({ ...a, travel: [1, 1.5] }, 0, 4, 1.2, 1, 6).mode, "march"); // 12 m/s: run
});

test("validator: keys, beats, travel and pop-ins", () => {
  const base = (s: object) => ({ version: 1, slug: "t", format: "curiosidade", fiction: false, fps: 30, duration: 4, sfx: [], music: { mood: "curioso" },
    cast: { x: { id: "x", label: "x", build: "adult", outfit: {}, skin: 0 } },
    shots: [{ id: 1, start: 0, end: 4, set: "palco", light: "day", actors: [], cam: { recipe: "keys", keys: [{ t: 0, dist: 8 }] }, ...s }] });
  assert.ok(validateSpec(base({})).ok);
  assert.ok(validateSpec(base({ light: "night" })).ok);
  assert.ok((validateSpec(base({ light: "noite" })) as { errors: string[] }).errors.some(e => e.includes('light "noite" inválida')));
  assert.ok(validateSpec(base({ effects: [{ kind: "fire", at: "centro" }, { kind: "sound", at: "x", start: 1, end: 3, toDx: 2 }],
    actors: [{ who: "x", at: "centro", action: "stand" }], movers: [{ model: "car-sedan", at: "centro", dz: -20, toDz: 5 }] })).ok);
  const fxBad = (validateSpec(base({ effects: [{ kind: "lava", at: "nada", start: 3, end: 2 }], movers: [{ model: "ufo", at: "centro", scale: 9 }] })) as { errors: string[] }).errors.join("\n");
  for (const m of ['kind "lava"', 'at "nada"', "start < end", 'modelo "ufo"', "scale deve ir"]) assert.ok(fxBad.includes(m), `faltou: ${m}\n${fxBad}`);
  assert.ok(SETS.palco.spots.centro);
  const bad = validateSpec(base({ cam: { recipe: "keys", keys: [{ t: 0, dist: 0.5, ease: "zoom" }, { t: 0, dist: 3, on: "nada" }] },
    actors: [{ who: "x", at: "centro", action: "stand", beats: [[9, "walk"]], travel: [2, 1], enter: 5 }] }));
  assert.ok(!bad.ok);
  const msg = (bad as { errors: string[] }).errors.join("\n");
  for (const m of ["dist deve ir", "ease \"zoom\"", "maior que o da chave anterior", "on \"nada\"", "beat 9 fora", "beat \"walk\"", "travel deve ser", "travel exige", "enter 5 fora"])
    assert.ok(msg.includes(m), `faltou: ${m}\n${msg}`);
});

test("keys: a far next key does not swing the lens past the current segment", () => {
  const s = shot({ cam: { recipe: "keys", from: "", keys: [
    { t: 0, on: "centro", dist: 3, aim: 1.2 }, { t: 1, on: "centro", dist: 10, aim: 0.8 }, { t: 2, on: [0, 0, -60], dist: 50, aim: 20, h: 5 }] } });
  for (let f = 0; f <= 30; f++) { const y = camAt(s, f / 30, views, 30, spots).look[1]; assert.ok(y >= 0.8 - 1e-9 && y <= 1.2 + 1e-9, `${y}`); }
});
