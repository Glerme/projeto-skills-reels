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
  assert.equal(Object.keys(cast).length, 8);
  const fx = JSON.parse(readFileSync("engine/fixtures/all-chars.json", "utf8"));
  const r = validateSpec(fx);
  assert.ok(r.ok, r.ok ? "" : r.errors.join("\n"));
  assert.deepEqual(Object.keys(fx.cast).sort(), Object.keys(cast).sort());
});
