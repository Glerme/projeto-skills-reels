import { test } from "node:test";
import assert from "node:assert/strict";
import { camAt, type Cam } from "./camera";
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
  const c = camAt(s, s.start + 40 / 30, views);
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
