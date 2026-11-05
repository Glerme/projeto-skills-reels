import { test } from "node:test";
import assert from "node:assert/strict";
import { camAt, cameraCut, type Cam } from "./camera";
import type { ShotSpec } from "./spec";

const views: Record<string, Cam> = {
  a: { pos: [0, 2, 10], look: [0, 1, 0], fov: 40, roll: 0 },
  b: { pos: [5, 3, 6], look: [1, 1, 0], fov: 30, roll: 4 },
};
const shot = (o: Partial<ShotSpec> & { cam: ShotSpec["cam"] }): ShotSpec =>
  ({ id: 1, start: 2, end: 6, set: "praca" as any, light: "day", actors: [], ...o });
const dist = (c: Cam) => Math.hypot(c.pos[0] - c.look[0], c.pos[1] - c.look[1], c.pos[2] - c.look[2]);
const T = (s: ShotSpec, f: number) => s.start + f / 30;

test("hold never freezes", () => {
  const s = shot({ cam: { recipe: "hold", from: "a" } });
  for (let f = 0; f < 119; f++) assert.notDeepEqual(camAt(s, T(s, f), views).pos, camAt(s, T(s, f + 1), views).pos);
});

test("glide lands on target", () => {
  const s = shot({ cam: { recipe: "glide", from: "a", to: "b" } });
  const c = camAt(s, s.end, views);
  for (const [x, y] of [...c.pos.map((v, i) => [v, views.b.pos[i]]), ...c.look.map((v, i) => [v, views.b.look[i]]), [c.fov, 30], [c.roll, 4]])
    assert.ok(Math.abs(x - y) < 1e-6);
});

test("kick flips sign and dies in 7 frames", () => {
  const base = shot({ cam: { recipe: "hold", from: "a" } });
  const kicked = { ...base, kicks: [3] };
  const sgn = Array.from({ length: 8 }, (_, k) => {
    const f = 30 + k;
    return Math.sign(camAt(kicked, T(base, f), views).roll - camAt(base, T(base, f), views).roll);
  });
  assert.deepEqual(sgn, [1, -1, 1, -1, 1, -1, 1, 0]);
  assert.deepEqual(camAt(kicked, T(base, 37), views), camAt(base, T(base, 37), views));
});

test("push is faster than hold", () => {
  const h = shot({ cam: { recipe: "hold", from: "a" } }), p = shot({ cam: { recipe: "push", from: "a" } });
  assert.ok(dist(camAt(p, T(p, 30), views)) < dist(camAt(h, T(h, 30), views)));
});

test("punch speeds up, unknown view throws", () => {
  const h = shot({ cam: { recipe: "hold", from: "a" } }), p = shot({ cam: { recipe: "hold", from: "a", punch: [2] } });
  assert.ok(dist(camAt(p, T(p, 30), views)) < dist(camAt(h, T(h, 30), views)));
  assert.throws(() => camAt(shot({ cam: { recipe: "hold", from: "zz" } }), 2, views), /view desconhecida: zz/);
});

test("kick lateral offset follows d x up (right) at k=0, opposite at k=1", () => {
  const base = shot({ cam: { recipe: "hold", from: "a" } }), kicked = { ...base, kicks: [3] };
  const dot = (f: number) => {
    const c = camAt(base, T(base, f), views), k = camAt(kicked, T(base, f), views);
    const d = [c.look[0] - c.pos[0], c.look[2] - c.pos[2]];
    return (k.pos[0] - c.pos[0]) * -d[1] + (k.pos[2] - c.pos[2]) * d[0];
  };
  assert.ok(dot(30) > 0);
  assert.ok(dot(31) < 0);
});


test("long takes and repeated punches stay bounded and smooth", () => {
  for (const recipe of ["hold", "push"] as const) {
    const s = shot({ end: 120, cam: { recipe, from: "a", punch: [3, 4, 5] } });
    let previous = camAt(s, s.start, views);
    for (let f = 1; f <= 3600; f++) {
      const c = camAt(s, T(s, f), views);
      assert.ok(dist(c) >= dist(views.a) * (recipe === "hold" ? 0.92 : 0.88) * 0.97);
      assert.ok(Math.abs(dist(c) - dist(previous)) < dist(views.a) * 0.004);
      previous = c;
    }
  }
});

test("glide uses the whole take and can be seeked backwards", () => {
  const s = shot({ cam: { recipe: "glide", from: "a", to: "b" } });
  assert.notDeepEqual(camAt(s, s.start + 2, views).pos, views.b.pos);
  const first = camAt(s, s.start + 1, views);
  camAt(s, s.end, views);
  assert.deepEqual(camAt(s, s.start + 1, views), first);
});

test("camera cuts enforce 15 degrees, same side and distance ratio 2.5", () => {
  const a = shot({ end: 2, cam: { recipe: "hold", from: "a" } });
  const b = shot({ cam: { recipe: "hold", from: "b" } });
  const angleView = (degrees: number): Cam => ({ ...views.a,
    pos: [10 * Math.sin(degrees * Math.PI / 180), 1, 10 * Math.cos(degrees * Math.PI / 180)], look: [0, 1, 0] });
  for (const [degrees, rejected] of [[15, false], [15.01, true], [180, true]] as const) {
    const v = { a: angleView(0), b: angleView(degrees) };
    assert.equal(cameraCut(a, b, v).some(e => e.includes("eixo")), rejected);
  }
  assert.ok(cameraCut(a, b, { a: angleView(-5), b: angleView(5) }).some(e => e.includes("lado")));
  for (const [ratio, rejected] of [[2.5, false], [2.501, true]] as const) {
    const v = { a: angleView(0), b: { ...angleView(0), pos: [0, 1, 10 / ratio] as [number, number, number] } };
    assert.equal(cameraCut(a, b, v).some(e => e.includes("distância")), rejected);
  }
});


test("parallel cameras cannot jump sideways to a different part of the set", () => {
  const a = shot({ end: 2, cam: { recipe: "hold", from: "a" } });
  const b = shot({ cam: { recipe: "hold", from: "b" } });
  for (const [offset, rejected] of [[5, false], [5.01, true]] as const) {
    const v = { a: { pos: [0, 1, 10], look: [0, 1, 0], fov: 50, roll: 0 } as Cam,
      b: { pos: [offset, 1, 10], look: [offset, 1, 0], fov: 50, roll: 0 } as Cam };
    assert.equal(cameraCut(a, b, v).some(e => e.includes("eixo")), rejected);
  }
});


test("cut distance includes accumulated push; glide ends at its destination size", () => {
  const v = { aberto: { ...views.a, pos: [0, 1, 24] as [number, number, number], look: [0, 1, 0] as [number, number, number] },
    medio: { ...views.a, pos: [0, 1, 10] as [number, number, number], look: [0, 1, 0] as [number, number, number] },
    close: { ...views.a, pos: [0, 1, 5] as [number, number, number], look: [0, 1, 0] as [number, number, number] } };
  const a = shot({ start: 0, end: 100, cam: { recipe: "push", from: "medio" } });
  const b = shot({ start: 100, end: 102, cam: { recipe: "hold", from: "aberto" } });
  assert.ok(cameraCut(a, b, v).some(e => e.includes("distância")));
  a.cam = { recipe: "glide", from: "medio", to: "close" };
  assert.ok(cameraCut(a, b, v).some(e => e.includes("degrau")));
  b.cam.from = "medio";
  assert.deepEqual(cameraCut(a, b, v), []);
});

test("Paris cuts keep direction within 2 degrees and lateral position within 0.2 metres", () => {
  const a = shot({ set: "paris", end: 2, cam: { recipe: "hold", from: "a" } });
  const b = shot({ set: "paris", cam: { recipe: "hold", from: "b" } });
  const base: Cam = { pos: [0, 1, 10], look: [0, 1, 0], fov: 50, roll: 0 };
  for (const [offset, rejected] of [[0.2, false], [0.201, true]] as const) {
    const other: Cam = { ...base, pos: [offset, 1, 10], look: [offset, 1, 0] };
    assert.equal(cameraCut(a, b, { a: base, b: other }).some(e => e.includes("eixo")), rejected);
  }
  for (const [angle, rejected] of [[2, false], [2.01, true]] as const) {
    const other: Cam = { ...base, look: [10 * Math.tan(angle * Math.PI / 180), 1, 0] };
    assert.equal(cameraCut(a, b, { a: base, b: other }).some(e => e.includes("eixo")), rejected);
  }
});

test("portrait axis follows focus or speaker spot without mutating presets; landscape stays fixed", () => {
  const v = { medio: views.a, close: views.a, aereo: views.a };
  const spots = { centro: [0, 0, 0], esquerda: [-1.6, 0, 0.3], direita: [1.6, 0, -0.3] } satisfies Record<string, [number, number, number]>;
  const s = shot({ cam: { recipe: "hold", from: "medio" }, actors: [
    { who: "speaker", at: "esquerda", action: "talk" }, { who: "focus", at: "direita", action: "point" },
  ] });
  const original = structuredClone(v);
  const check = (dx: number, dz: number) => {
    const base = camAt(s, s.start + 1, v), moved = camAt(s, s.start + 1, v, 30, spots);
    assert.deepEqual(moved.pos, [base.pos[0] + dx, base.pos[1], base.pos[2] + dz]);
    assert.deepEqual(moved.look, [base.look[0] + dx, base.look[1], base.look[2] + dz]);
  };
  check(-1.6, 0.3);
  s.focus = "focus"; check(1.6, -0.3);
  s.cam.from = "aereo"; check(0, 0);
  assert.deepEqual(v, original);
  s.cam.from = "medio";
  const next = structuredClone(s); next.actors[1].at = "esquerda";
  assert.ok(cameraCut(s, next, v, spots).some(e => e.includes("eixo")) === false); // generic limit is five metres
  s.set = next.set = "paris";
  assert.ok(cameraCut(s, next, v, spots).some(e => e.includes("eixo")));
});
