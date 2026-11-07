import * as THREE from "three";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createScreen, updateScreen, screenPixel, SCREEN_MODES } from "./screens";
import { validateSpec, type ScreenSpec, type ShotSpec, type VideoSpec, layersAt } from "./spec";

const pixel = (mode: ScreenSpec["mode"], t: number, x = 0.05, y = 0.1, extra = {}) =>
  screenPixel({ at: "centro", mode, ...extra }, t, 3, x, y);

test("RGB strips stay lit; mixture starts red and ramps other channels over 0.6 seconds", () => {
  const xs = [0.05, 0.16, 0.27];
  for (let channel = 0; channel < 3; channel++) {
    const rgb = [0, 0, 0]; rgb[channel] = 255;
    assert.deepEqual(pixel("subpixels", 0, xs[channel]), rgb);
  }
  assert.deepEqual(pixel("mistura", 0, xs[0]), [255, 0, 0]);
  assert.deepEqual(pixel("mistura", 0, 0.78, 0.5), [255, 0, 0]);
  for (const channel of [1, 2]) {
    for (const dt of [0, 0.15, 0.3, 0.6, 0.9]) {
      const brightness = 255 * Math.min(1, dt / 0.6);
      const strip = [0, 0, 0]; strip[channel] = brightness;
      const sum = [0, 0, 0].map((_, i) => i < channel ? 255 : i === channel ? brightness : 0);
      const actualStrip = pixel("mistura", channel + dt, xs[channel]);
      const actualSum = pixel("mistura", channel + dt, 0.78, 0.5);
      assert.ok(actualStrip.every((v, i) => Math.abs(v - strip[i]) < 1e-10));
      assert.ok(actualSum.every((v, i) => Math.abs(v - sum[i]) < 1e-10));
    }
  }
  // At 30 fps, even a full-screen close changes by at most one eighteenth per frame.
  for (let frame = 1; frame <= 90; frame++) {
    const before = pixel("mistura", (frame - 1) / 30, 0.78, 0.5);
    const after = pixel("mistura", frame / 30, 0.78, 0.5);
    assert.ok(after.every((v, i) => Math.abs(v - before[i]) <= 255 / 18 + 1e-10));
  }
});

test("grade crossfades two fixed densities, including grid gaps and reverse transitions", () => {
  for (const [density, toDensity] of [[8, 64], [64, 8], [8, 8]]) {
    for (const [x, y] of [[0.33, 0.3], [0.12, 0.19], [0.76, 0.25]]) {
      const coarse = pixel("imagem", 0, x, y, { density });
      const fine = pixel("imagem", 0, x, y, { density: toDensity });
      for (const t of [0, 0.01, 1.5, 2.99, 3]) {
        const actual = pixel("grade", t, x, y, { density, toDensity });
        assert.ok(actual.every((v, i) => Math.abs(v - (coarse[i] + (fine[i] - coarse[i]) * t / 3)) < 1e-10));
      }
    }
  }
});

test("scanout moves between rows, redraws above the band, loops and scales with speed", () => {
  const scan: typeof pixel = (mode, t, x = 0.05, y = 0.1, extra = {}) => pixel(mode, t, x, y, { density: 32, ...extra });
  const x = 0.3, y = 0.25;
  const width = 1 / 18, hit = (y + width) / (1 + 2 * width) / 0.5;
  assert.notDeepEqual(scan("varredura", hit - 0.04, x, y), scan("varredura", hit - 0.02, x, y));
  assert.ok(scan("varredura", hit, x, y).every(v => Math.abs(v - 240) < 1e-10));
  assert.ok(scan("varredura", hit + 0.15, x, y)[0] > scan("varredura", hit - 0.15, x, y)[0]);
  assert.deepEqual(scan("varredura", 0.5), scan("varredura", 0.25, 0.05, 0.1, { speed: 1 }));
  assert.deepEqual(scan("varredura", 0.5), scan("varredura", 2.5));
  // Sub-row time changes must not cause a full-band jump, even at the old row boundaries.
  for (let row = 1; row < 18; row++) {
    const t = row / 18 / 0.5;
    for (const y of [(row - 0.5) / 18, row / 18, (row + 0.5) / 18]) {
      const before = scan("varredura", t - 1e-6, x, y);
      const after = scan("varredura", t + 1e-6, x, y);
      assert.ok(before.every((v, i) => Math.abs(v - after[i]) < 0.01));
    }
  }
});

test("ghost trail can be disabled; LCD leaks at borders while OLED switches off", () => {
  const x = 0.5 + 0.36 * Math.sin(-7 * 0.035 * 5);
  assert.notDeepEqual(pixel("rastro", 0, x, 0.5), pixel("rastro", 0, x, 0.5, { trail: false }));
  assert.deepEqual(pixel("rastro", 0, x, 0.5, { trail: false }), [70, 150, 85]);
  assert.deepEqual(pixel("rastro", 0, 0.5, 0.5), [255, 250, 225]);
  assert.deepEqual(pixel("rastro", 0, 0.5, 0.63), [25, 30, 40]);
  for (const x of [0.01, 0.3, 0.5, 0.99]) {
    const gray = pixel("lcd", 0, x, 0.7);
    assert.ok(gray.every(v => v >= 64 && v <= 89));
    assert.deepEqual(pixel("oled", 0, x, 0.7), [0, 0, 0]);
  }
  assert.deepEqual(pixel("oled", 0), [0, 0, 0]);
  assert.ok(pixel("lcd", 0, 0.01)[0] > pixel("lcd", 0, 0.3, 0.7)[0]);
  assert.deepEqual(pixel("lcd", 0, 0.65, 0.38), pixel("oled", 0, 0.65, 0.38));
});

test("display placement, texture and time restore on seek without rendering", () => {
  const d = createScreen(), s: ScreenSpec = { at: "centro", mode: "mistura", dx: 1, y: 2, dz: -1, turn: 30, scale: 0.5 };
  const shot = { start: 10, end: 13 } as ShotSpec;
  updateScreen(d, s, shot, 10, [2, 0, 3]);
  const first = new Uint8Array(d.texture.image.data as Uint8Array);
  assert.deepEqual(d.group.position.toArray(), [3, 2, 2]);
  assert.equal(d.group.scale.x, 0.5);
  updateScreen(d, s, shot, 12, [2, 0, 3]);
  assert.notDeepEqual(d.texture.image.data, first);
  updateScreen(d, s, shot, 10, [2, 0, 3]);
  assert.deepEqual(d.texture.image.data, first);
});

const fixture = () => JSON.parse(readFileSync("engine/fixtures/pixel-display.json", "utf8"));
test("all eight fixture modes validate; malformed screens are rejected", () => {
  assert.deepEqual(fixture().shots.map((s: any) => s.screens[0].mode), [...SCREEN_MODES].filter(m => m !== "branco"));
  assert.deepEqual(validateSpec(fixture()), { ok: true, spec: fixture() });
  for (const bad of [null, { mode: "bad" }, { at: "centro", mode: "imagem", dx: "1" },
    { at: "centro", mode: "grade", density: 1 }, { at: "centro", mode: "grade", toDensity: 129 },
    { at: "centro", mode: "rastro", trail: 1 }, { at: "centro", mode: "varredura", speed: 0 }]) {
    const spec = fixture(); spec.shots[0].screens = [bad];
    assert.equal(validateSpec(spec).ok, false);
  }
  const spec = fixture(); spec.shots[0].screens = {};
  assert.equal(validateSpec(spec).ok, false);
});


test("test cameras keep the entire screen inside the vertical frame", () => {
  for (const path of ["engine/fixtures/pixel-display.json"]) {
    const spec = JSON.parse(readFileSync(path, "utf8"));
    assert.equal(validateSpec(spec).ok, true);
    for (const shot of spec.shots) for (const key of shot.cam.keys) {
      assert.ok(key.dist >= 2);
      const halfHeight = key.dist * Math.tan(key.fov * Math.PI / 360);
      assert.ok(halfHeight * 9 / 16 >= 1.7, "monitor width fits");
      assert.ok(halfHeight >= 1.65, "stand fits below screen target");
    }
  }
});

test("scanout loop is continuous over the whole panel, including both edges", () => {
  for (const density of [2, 32, 128]) for (const speed of [0.4, 0.6, 1.44, 10]) {
    for (let row = 0; row <= 40; row++) {
      const y = row / 40;
      for (const x of [0.05, 0.3, 0.76]) {
        const s: ScreenSpec = { at: "centro", mode: "varredura", density, speed };
        const before = screenPixel(s, 1 / speed - 1e-8, 4, x, y);
        const after = screenPixel(s, 1 / speed + 1e-8, 4, x, y);
        assert.ok(before.every((v, i) => Math.abs(v - after[i]) < 0.01));
      }
    }
  }
});

test("monitor-pixels screen state is applied on the cut frame and restores on seek", () => {
  const spec = JSON.parse(readFileSync("videos/monitor-pixels/video.json", "utf8")) as VideoSpec;
  const d = createScreen();
  const cuts = [
    spec.shots.findIndex((s, i) => i > 0 && s.screens?.[0].mode === "grade" &&
      spec.shots[i - 1].screens?.[0].mode === "grade"),
    spec.shots.findIndex(s => s.screens?.[0].mode === "oled"),
  ];
  assert.ok(cuts.every(index => index > 0));
  for (const index of cuts) {
    const shot = spec.shots[index], previous = spec.shots[index - 1], s = shot.screens![0];
    const t = Math.ceil(shot.start * spec.fps) / spec.fps;
    assert.equal(layersAt(spec, t)[0].shot, shot);
    updateScreen(d, s, shot, t, [0, 0, 0]);
    const first = new Uint8Array(d.texture.image.data as Uint8Array);
    // Compare every texel with the incoming mode at the first sampled time, without a renderer.
    for (let y = 0; y < d.texture.image.height; y++) for (let x = 0; x < d.texture.image.width; x++) {
      const expected = new Uint8Array(screenPixel(s, t - shot.start, shot.end - shot.start,
        (x + 0.5) / d.texture.image.width, 1 - (y + 0.5) / d.texture.image.height));
      const offset = (y * d.texture.image.width + x) * 4;
      assert.deepEqual(first.subarray(offset, offset + 3), expected);
    }
    if (s.mode === "grade") {
      assert.equal(s.density, previous.screens![0].toDensity);
      for (const [x, y] of [[0.05, 0.1], [0.76, 0.25]])
        assert.deepEqual(screenPixel(s, 0, shot.end - shot.start, x, y),
          screenPixel(previous.screens![0], previous.end - previous.start, previous.end - previous.start, x, y));
    }
    updateScreen(d, s, shot, t + 0.1, [0, 0, 0]);
    if (s.mode === "oled") assert.deepEqual(d.texture.image.data, first);
    updateScreen(d, previous.screens![0], previous, previous.end - 1 / spec.fps, [0, 0, 0]);
    updateScreen(d, s, shot, t, [0, 0, 0]);
    assert.deepEqual(d.texture.image.data, first);
  }
});


test("flat monitor has only front planes and unlit housing; default pixels are denser", () => {
  const flat = createScreen(true);
  flat.group.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    o.geometry.computeBoundingBox();
    assert.equal(o.geometry.boundingBox!.getSize(new THREE.Vector3()).z, 0);
    assert.ok(o.material instanceof THREE.MeshBasicMaterial);
  });
  assert.equal(flat.texture.image.width, 768);
  for (const [x, y] of [[0.12, 0.19], [0.76, 0.25], [0.33, 0.3]]) {
    assert.deepEqual(pixel("imagem", 0, x, y), pixel("imagem", 0, x, y, { density: 128 }));
    assert.deepEqual(pixel("grade", 0, x, y), pixel("imagem", 0, x, y, { density: 24 }));
    assert.deepEqual(pixel("grade", 3, x, y), pixel("imagem", 0, x, y, { density: 128 }));
  }
});

test("2D fixture validates, background is bounded and cuts still reject jumps", () => {
  const example = () => JSON.parse(readFileSync("videos/_teste-tela-pixels/video.json", "utf8"));
  assert.equal(validateSpec(example()).ok, true);
  for (const background of [null, {}, { top: "red" }, { top: "#123456", bottom: 42 }]) {
    const s = example(); s.shots[0].background = background;
    assert.equal(validateSpec(s).ok, false);
  }
  for (const background of [{ top: "#123456" }, { top: "#123456", bottom: "#abcdef" }]) {
    const s = example(); s.shots[0].background = background;
    assert.equal(validateSpec(s).ok, true);
  }
  const wrongSet = example(); wrongSet.shots[0].set = "palco";
  assert.equal(validateSpec(wrongSet).ok, false);
  for (const edit of [(s: any) => s.screens[0].turn = 30, (s: any) => s.dof = 2,
    (s: any) => s.cam.keys[0].dist = 100, (s: any) => s.cam.keys[0].fov = 75, (s: any) => s.cam.keys[0].on[0] = 20]) {
    const s = example(); edit(s.shots[1]);
    assert.equal(validateSpec(s).ok, false);
  }
});
