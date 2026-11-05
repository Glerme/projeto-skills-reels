import * as THREE from "three";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateSpec, layersAt, flashAlpha, type VideoSpec } from "./spec";

const fx = () => JSON.parse(readFileSync("engine/fixtures/two-shots.json", "utf8"));
const errs = (x: unknown) => { const r = validateSpec(x, { "car-sedan": new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1)) }); return r.ok ? [] : r.errors; };

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

test("rejects unknown actions and cues outside the shot", () => {
  const s = fx(); s.shots[0].actors[0].action = "dancar";
  assert.equal(validateSpec(s).ok, false);
  const c = fx(); c.shots[0].actors[0].cue = c.shots[0].end + 1;
  const r = validateSpec(c);
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.errors.some((e) => e.includes("cue")));
});

test("throws need two actors of the shot and times inside it", () => {
  const ok = fx(); const sh = ok.shots[0];
  ok.cast.mulher = ok.cast.mulher ?? ok.cast.homem;
  sh.actors = [{ who: "homem", at: "esquerda", action: "whirl", cue: sh.start + 0.2 }, { who: "mulher", at: "direita", action: "topple", cue: sh.start + 0.6 }];
  sh.throws = [{ from: "homem", to: "mulher", start: sh.start + 0.2, end: sh.start + 0.6 }];
  assert.equal(validateSpec(ok).ok, true, JSON.stringify(validateSpec(ok)));
  const bad = JSON.parse(JSON.stringify(ok)); bad.shots[0].throws[0].to = "ninguem";
  assert.equal(validateSpec(bad).ok, false);
  const late = JSON.parse(JSON.stringify(ok)); late.shots[0].throws[0].end = sh.end + 2;
  assert.equal(validateSpec(late).ok, false);
});

test("hold puts a known prop in a hand", () => {
  const s = fx(); s.shots[0].actors[0].hold = { L: "staff" };
  assert.equal(validateSpec(s).ok, true);
  const b = fx(); b.shots[0].actors[0].hold = { L: "guarda-chuva" };
  assert.equal(validateSpec(b).ok, false);
});

test("rejects an unknown camera recipe", () => {
  const a = fx(); a.shots[0].cam.recipe = "puhs";
  assert.ok(errs(a).some((e) => e.includes("cena 1") && e.includes("recipe")), JSON.stringify(errs(a)));
});

test("whirl and topple need a cue (else the stone never leaves / the giant never falls)", () => {
  for (const action of ["whirl", "topple"]) {
    const a = fx(); a.shots[0].actors[0].action = action;
    assert.ok(errs(a).some((e) => e.includes("cena 1") && e.includes("cue")), JSON.stringify(errs(a)));
    const ok = fx(); ok.shots[0].actors[0].action = action; ok.shots[0].actors[0].cue = (ok.shots[0].start + ok.shots[0].end) / 2;
    assert.deepEqual(errs(ok), []);
  }
});

test("dressing props validate model, spot, scale and finite transforms", () => {
  for (const scale of [undefined, 0.3, 1, 3]) {
    const s = fx(); s.dressing = { palco: [{ model: "car-sedan", at: "centro", scale, turn: -450, dx: -4, dz: 2 }] };
    assert.deepEqual(errs(s), []);
  }
  for (const props of ["x", [null], [{ model: "missing", at: "centro" }], [{ model: "car-sedan", at: "teto" }],
    ...[0.29, 3.01, NaN, Infinity, "1", null].map((scale) => [{ model: "car-sedan", at: "centro", scale }]),
    ...["turn", "dx", "dz"].flatMap((k) => [Infinity, NaN, "0", null].map((v) => [{ model: "car-sedan", at: "centro", [k]: v }]))]) {
    const s = fx(); s.dressing = { palco: props };
    assert.ok(errs(s).some((e) => e.includes("dressing palco") && (e.includes("prop") || e.includes("modelo"))));
  }
});

test("sky needs an outdoor set, boolean sun and 0–8 integer extra clouds", () => {
  for (const sky of [{}, { sun: true }, { sun: false, clouds: 0 }, { clouds: 8 }]) {
    const s = fx(); s.shots[0].sky = sky;
    assert.deepEqual(errs(s), []);
  }
  for (const sky of [null, [], true, { sun: 1 }, ...[-1, 9, 1.5, NaN, Infinity, "2", null].map((clouds) => ({ clouds }))]) {
    const s = fx(); s.shots[0].sky = sky;
    assert.ok(errs(s).some((e) => e.includes("cena 1") && e.includes("sky")));
  }
  for (const set of ["casa", "escritorio", "laboratorio"]) {
    const s = fx(); s.shots[0].set = set; s.shots[0].sky = {};
    assert.ok(errs(s).some((e) => e.includes("cena 1") && e.includes("céu")));
  }
});

test("scientist sequence validates; unknown expressions report the scene", () => {
  const spec = JSON.parse(readFileSync("engine/fixtures/cientista.json", "utf8"));
  assert.deepEqual(errs(spec), []);
  spec.shots[0].actors[0].expr[0][1] = "toString";
  assert.ok(errs(spec).some(e => e.includes("cena 1") && e.includes("expressão inválida")));
});


test("same-set cuts reject skipped sizes and cite both scenes; other sets are independent", () => {
  const s = fx(); s.shots[1].cam = { recipe: "hold", from: "close" };
  assert.ok(errs(s).some(e => e.includes("cenas 1 e 2") && e.includes("degrau")));
  s.shots[1].set = "casa";
  assert.ok(!errs(s).some(e => e.includes("cenas 1 e 2")));
  s.shots[0].cam = { recipe: "glide", from: "aberto", to: "close" };
  assert.ok(errs(s).some(e => e.includes("cena 1 (glide)") && e.includes("degrau")));
});

test("extras persist on their original path, even on returning to a set", () => {
  const s = fx();
  for (const h of s.shots) { h.set = "paris"; h.actors = []; h.cam = { recipe: "hold", from: "aberto" }; }
  s.shots[0].actors = [{ who: "mulher", action: "walk", path: "praca_frente" }];
  const continuity = () => errs(s).filter(e => e.includes("deve continuar"));
  assert.ok(continuity().some(e => e.includes("cenas 1 e 2") && e.includes("mulher")));
  s.shots[1].actors = [{ who: "mulher", action: "walk", path: "praca_perto" }];
  assert.equal(continuity().length, 1);
  s.shots[1].actors[0].path = "praca_frente";
  assert.deepEqual(continuity(), []);
  s.shots.splice(1, 0, { ...s.shots[1], id: 3, set: "palco", actors: [] });
  assert.deepEqual(continuity(), []);
  s.shots[2].actors = [];
  assert.equal(continuity().length, 1);
});
