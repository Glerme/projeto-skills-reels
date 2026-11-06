import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { poseAt, blinkAt } from "./actions";
import { loadCharacters } from "./load-chars";
import { validateSpec } from "../spec";

test("poseAt is deterministic", () => {
  for (const a of ["stand", "walk", "talk", "point", "shock", "cheer", "fall", "sit", "wave"] as const)
    assert.deepEqual(poseAt(a, 1.37, 7), poseAt(a, 1.37, 7));
});

test("poseAt basics", () => {
  assert.equal(poseAt("walk", 0.5, 1).mode, "stroll");
  for (let t = 0; t < 10; t += 0.05) { const l = poseAt("walk", t, 3).tilt!; assert.ok(l >= 1 && l <= 7); }
  assert.equal(poseAt("fall", 0, 1).mode, "fall");
  assert.equal(poseAt("sit", 0, 1).mode, "sit");
  assert.equal(poseAt("shock", 0, 1).expr, "shock");
  assert.equal(poseAt("point", 0, 1).arms, "point");
  const talk = Array.from({ length: 30 }, (_, f) => poseAt("talk", f / 30, 0).talk);
  assert.deepEqual(talk.slice(0, 11), [true, true, true, true, true, false, false, false, false, false, true]);
});

test("blinks every 0.5-2.3 s for 4 frames", () => {
  const fps = 30, starts: number[] = [];
  let run = 0;
  for (let f = 0; f < 60 * fps; f++) {
    if (blinkAt(5, f / fps, fps)) { if (run++ === 0) starts.push(f); } else { if (run) assert.equal(run, 4); run = 0; }
  }
  assert.ok(starts.length > 20);
  for (let i = 1; i < starts.length; i++) { const d = (starts[i] - starts[i - 1]) / fps; assert.ok(d >= 0.5 && d <= 2.3, String(d)); }
  assert.equal(blinkAt(5, 3.3), blinkAt(5, 3.3));
});

test("every kit character validates", () => {
  const cast = loadCharacters("kit/characters");
  assert.equal(Object.keys(cast).length, 11); // the 8 starter characters + gigante (Davi e Golias) + estudante (e se — série) + pirata (navio)
  const fx = JSON.parse(readFileSync("engine/fixtures/all-chars.json", "utf8"));
  assert.deepEqual(fx.cast, cast); // fixture must not drift from the kit
  fx.cast = cast;
  const r = validateSpec(fx);
  assert.ok(r.ok, r.ok ? "" : r.errors.join("\n"));
});

const NEW = ["gesture", "laugh", "taunt", "struggle", "unhelm", "pick", "whirl", "topple", "chop"] as const;
const sig = (o: object) => JSON.stringify(o);

test("new actions are deterministic", () => {
  for (const a of NEW) assert.equal(sig(poseAt(a, 0.83, 4, 0.5)), sig(poseAt(a, 0.83, 4, 0.5)), a);
});

test("no action holds a frozen pose for half a second", () => {
  for (const a of ["stand", "walk", "talk", "gesture", "laugh", "taunt", "struggle", "pick", "whirl", "chop"] as const)
    for (let t = 0; t < 3; t += 0.5) {
      const frames = Array.from({ length: 15 }, (_, f) => sig(poseAt(a, t + f / 30, 2, 9)));
      assert.ok(new Set(frames).size > 1, `${a} frozen at ${t}`);
    }
});

test("walk swings the arms against the legs", () => {
  const l = (t: number) => poseAt("walk", t, 1).rig!.armL![0];
  assert.ok(Math.abs(l(1 / 3) - l(1)) > 20); // phase .25 vs .75: the two extremes of the swing
});

test("whirl spins the sling until the release cue, then lets go", () => {
  const a = poseAt("whirl", 0.2, 1, 1.0), b = poseAt("whirl", 0.3, 1, 1.0);
  assert.equal(a.hand?.L, "sling");
  assert.notEqual(a.sling, b.sling);
  assert.equal(a.slingReleased, false);
  assert.equal(poseAt("whirl", 1.1, 1, 1.0).slingReleased, true);
  assert.ok(poseAt("whirl", 1.25, 1, 1.0).rig!.armL![0] < poseAt("whirl", 0.9, 1, 1.0).rig!.armL![0]); // the sling arm comes forward/down
});

test("chop raises the axe before the cue and brings it down at the cue", () => {
  const arm = (t: number) => poseAt("chop", t, 1, 1.0).rig!.armR![0];
  assert.equal(poseAt("chop", 0.5, 1, 1.0).hand?.R, "axe");
  assert.ok(arm(0.95) > arm(0.2) + 100); // raised over the head
  assert.ok(arm(1.3) < arm(0.95) - 90); // swung down
});

test("topple stands until the hit, then rolls to the ground and lands", () => {
  assert.equal(poseAt("topple", 0.5, 1, 1.0).roll ?? 0, 0);
  const rolls = [1.0, 1.3, 1.5, 1.7, 1.9].map((t) => poseAt("topple", t, 1, 1.0).roll ?? 0);
  for (let i = 1; i < rolls.length; i++) assert.ok(rolls[i] >= rolls[i - 1]);
  const down = poseAt("topple", 2.5, 1, 1.0);
  assert.equal(down.roll, 90);
  assert.ok((down.impact ?? -1) > 0);
});

test("pick crouches down to the ground and comes up with a stone", () => {
  const c = Array.from({ length: 42 }, (_, f) => poseAt("pick", f / 30, 1));
  assert.ok(Math.max(...c.map((p) => p.rig?.crouch ?? 0)) >= 0.8);
  assert.ok(c.some((p) => p.hand?.R === "stone"));
});
