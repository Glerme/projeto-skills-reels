import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateSpec, layersAt, flashAlpha, type VideoSpec } from "./spec";

const fx = () => JSON.parse(readFileSync("engine/fixtures/two-shots.json", "utf8"));
const errs = (x: unknown) => { const r = validateSpec(x); return r.ok ? [] : r.errors; };

test("accepts the two-shot fixture", () => {
  const r = validateSpec(fx());
  assert.ok(r.ok, r.ok ? "" : r.errors.join("\n"));
});

test("rejects gaps, overlaps and long xfades", () => {
  const gap = fx(); gap.shots[0].end = 1.5;
  const overlap = fx(); overlap.shots[0].end = 2.5;
  const long = fx(); long.shots[1].xfade = 1.2;
  for (const bad of [gap, overlap, long]) assert.ok(errs(bad).some((e) => e.includes("cena 2")), JSON.stringify(errs(bad)));
});

test("rejects unknown set, spot and character", () => {
  const a = fx(); a.shots[0].set = "lua";
  const b = fx(); b.shots[0].actors[0].at = "teto";
  const c = fx(); c.shots[0].actors[0].who = "fantasma";
  for (const bad of [a, b, c]) assert.ok(errs(bad).some((e) => e.includes("cena 1")), JSON.stringify(errs(bad)));
});

test("layersAt crossfades linearly", () => {
  const spec = (validateSpec(fx()) as { spec: VideoSpec }).spec;
  const mid = layersAt(spec, 2.0);
  assert.deepEqual(mid.map((l) => l.shot.id), [1, 2]);
  assert.ok(Math.abs(mid[1].alpha - 0.5) < 1e-9);
  assert.equal(layersAt(spec, 1.0).length, 1);
});

test("flashAlpha follows 1/.75/.45/.2", () => {
  const spec = (validateSpec(fx()) as { spec: VideoSpec }).spec;
  const f = (n: number) => flashAlpha(spec, 2 + n / 30);
  assert.deepEqual([0, 1, 2, 3].map(f), [1, 0.75, 0.45, 0.2]);
  assert.equal(f(4), 0);
  assert.equal(flashAlpha(spec, 1), 0);
});

test("never throws on malformed input", () => {
  const good = () => JSON.parse(readFileSync("engine/fixtures/two-shots.json", "utf8"));
  const bad: unknown[] = [null, 42, "x", [], {}, { ...good(), shots: "x" }, { ...good(), shots: [null, 7] }];
  const shot = (patch: object) => { const g = good(); Object.assign(g.shots[0], patch); return g; };
  bad.push(shot({ actors: [null] }), shot({ actors: "x" }), shot({ kicks: "x" }), shot({ cam: { recipe: "hold", from: "aberto", punch: 3 } }),
    shot({ actors: [{ who: "homem", at: "centro", action: "talk", expr: [null] }] }), shot({ actors: [{ who: "homem", at: "centro", action: "talk", expr: "x" }] }),
    shot({ set: "constructor" }), shot({ focus: "constructor" }), { ...good(), cast: { constructor: null } });
  { const g = good(); g.shots[0] = null; g.shots[1].xfade = 0.4; bad.push(g); }
  for (const b of bad) {
    let r: ReturnType<typeof validateSpec> | undefined;
    assert.doesNotThrow(() => { r = validateSpec(b); }, JSON.stringify(b));
    assert.equal(r!.ok, false, JSON.stringify(b));
    assert.ok(!r!.ok && r!.errors.length > 0);
  }
});

test("who: constructor is not a cast member", () => {
  const g = JSON.parse(readFileSync("engine/fixtures/two-shots.json", "utf8"));
  g.shots[0].actors[0].who = "constructor";
  const r = validateSpec(g);
  assert.ok(!r.ok && r.errors.some((e) => e.includes('personagem "constructor" não existe')), JSON.stringify(r));
});

test("character scale is optional and must be 0.5–2", () => {
  const withScale = (v: unknown) => { const s = fx(); s.cast.homem.scale = v; return validateSpec(s); };
  assert.equal(validateSpec(fx()).ok, true);
  assert.equal(withScale(1.6).ok, true);
  for (const bad of [0.2, 3, "grande", null]) {
    const r = withScale(bad);
    assert.equal(r.ok, false, String(bad));
    if (!r.ok) assert.ok(r.errors.some((e) => e.includes("personagem homem") && e.includes("scale")), String(bad));
  }
});
