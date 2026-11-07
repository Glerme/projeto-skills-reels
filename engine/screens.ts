import * as THREE from "three";
import { Batch, prop } from "./style/build";
import { NOINK } from "./style/ink";
import type { ScreenSpec, ShotSpec } from "./spec";

export const SCREEN_MODES = ["imagem", "subpixels", "mistura", "grade", "varredura", "rastro", "lcd", "oled", "branco"] as const;
export const SCREEN_LAYERS = ["luz-de-fundo", "polarizador-tras", "cristal", "filtro-cor", "polarizador-frente"] as const;
export type ScreenLayer = (typeof SCREEN_LAYERS)[number];
export function screenValue(keys: [number, number][] | undefined, t: number, fallback = 0) {
  if (!keys?.length) return fallback;
  for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) {
    const [a, b] = [keys[i - 1], keys[i]];
    const u = THREE.MathUtils.smoothstep(t, a[0], b[0]);
    return THREE.MathUtils.lerp(a[1], b[1], u);
  }
  return t < keys[0][0] ? keys[0][1] : keys[keys.length - 1][1];
}
const W = 768, H = 432;
/** Offset per exploded step (x, up, back), in monitor units. */
export const LAYER_STEP = [0, 0.5, 1.2] as const;
type RGB = [number, number, number];
const landscape = (x: number, y: number): RGB =>
  Math.hypot(x - 0.76, y - 0.25) < 0.12 ? [255, 225, 100] :
    y > 0.64 - 0.22 * Math.sin(x * 7) ? [70, 150, 85] : [80, 145, 205];

/** Deterministic sampling in screen coordinates (y grows down), including out-of-order seeks. */
export function screenPixel(s: ScreenSpec, age: number, duration: number, x: number, y: number): RGB {
  if (s.mode === "branco") return [255, 255, 255];
  const u = THREE.MathUtils.clamp(age / duration, 0, 1);
  if (s.mode === "subpixels" || s.mode === "mistura") {
    const channel = Math.floor(x * 9) % 3;
    const brightness = (c: number) => s.mode === "subpixels" || c === 0 ? 255 :
      255 * THREE.MathUtils.clamp((Math.max(0, age) - c * duration / 3) / 0.6, 0, 1);
    const rgb: RGB = [0, 0, 0];
    if ((x * 9) % 1 < 0.88 && (y * 3) % 1 < 0.92) rgb[channel] = brightness(channel);
    // A large square beside the strips keeps the summed colour readable in a small still.
    if (s.mode === "mistura" && x >= 0.62 && x <= 0.94 && y >= 0.22 && y <= 0.79)
      return [brightness(0), brightness(1), brightness(2)];
    return rgb;
  }
  if (s.mode === "lcd" || s.mode === "oled") {
    if (Math.hypot(x - 0.65, y - 0.38) < 0.13) return [180, 190, 210];
    const v = s.mode === "oled" ? 0 : Math.round(64 + 25 * Math.exp(-Math.min(x, 1 - x, y, 1 - y) * 15));
    return [v, v, v];
  }
  if (s.mode === "rastro") {
    const ball = (t: number) => 0.5 + 0.36 * Math.sin(t * 5);
    const background = landscape(x, y);
    for (let i = 0; i <= (s.trail === false ? 0 : 7); i++) {
      const distance = Math.hypot((x - ball(age - i * 0.035)) * 16 / 9, y - 0.5);
      if (distance < 0.14) {
        if (!i) return distance < 0.115 ? [255, 250, 225] : [25, 30, 40];
        const alpha = 0.8 * (1 - i / 8);
        return background.map(v => Math.round(v * (1 - alpha) + 255 * alpha)) as RGB;
      }
    }
    return background;
  }
  const sample = (density: number): RGB => {
    const rows = Math.max(1, Math.round(density * 9 / 16));
    if ((x * density) % 1 > 0.92 || (y * rows) % 1 > 0.92) return [4, 4, 4];
    return landscape((Math.floor(x * density) + 0.5) / density, (Math.floor(y * rows) + 0.5) / rows);
  };
  const density = s.density ?? (s.mode === "grade" ? 24 : 128);
  let rgb = sample(density);
  if (s.mode === "grade") {
    const fine = sample(s.toDensity ?? 128);
    return rgb.map((v, i) => THREE.MathUtils.lerp(v, fine[i], u)) as RGB;
  }
  if (s.mode === "varredura") {
    const phase = (Math.max(0, age) * (s.speed ?? 0.5)) % 1;
    const width = 1 / Math.max(1, Math.round(density * 9 / 16));
    // Wrap outside the panel; each row fades after refresh instead of resetting the whole image.
    const span = 1 + 2 * width, position = phase * span - width;
    const since = ((position - y) % span + span) % span;
    const redrawn = 1 - THREE.MathUtils.smoothstep(since, 0, span);
    const band = Math.max(0, 1 - Math.min(since, span - since) / width);
    rgb = rgb.map(v => THREE.MathUtils.lerp(v * (0.3 + 0.7 * redrawn), 240, band)) as RGB;
  }
  return rgb;
}

/** Frame remains in the ink pass; only the emissive, nearest-filtered screen bypasses ink. */
export function createScreen(flat = false) {
  const group = new THREE.Group(), housing = new THREE.Group();
  const mat = flat ? new THREE.MeshBasicMaterial({ color: "#514e49", fog: false, toneMapped: false }) :
    new THREE.MeshLambertMaterial({ color: "#514e49" });
  for (const [w, h, d, y, z] of [[3.4, 0.125, 0.18, 2.6125, 0], [3.4, 0.125, 0.18, 0.6875, 0], [0.2, 0.65, 0.18, 0.45, 0], [1.2, 0.12, 0.65, 0.06, 0]]) {
    const mesh = new THREE.Mesh(flat ? new THREE.PlaneGeometry(w, h) : new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(0, y, z); housing.add(mesh);
  }
  for (const x of [-1.65, 1.65]) {
    const edge = new THREE.Mesh(flat ? new THREE.PlaneGeometry(0.1, 1.8) : new THREE.BoxGeometry(0.1, 1.8, 0.18), mat);
    edge.position.set(x, 1.65, 0); housing.add(edge);
  }
  if (flat) group.add(housing);
  else {
    const batch = new Batch();
    prop(batch, { "pixel-display": housing }, "pixel-display", 0, 0, 0, 2.675);
    batch.build(group);
  }
  const data = new Uint8Array(W * H * 4), texture = new THREE.DataTexture(data, W, H);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.8), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, fog: false }));
  screen.position.set(0, 1.65, 0.101); screen.layers.set(NOINK); group.add(screen);
  const layers = flat ? [] : SCREEN_LAYERS.map((name, i) => {
    const layer = new THREE.Group(); layer.name = name;
    const material = new THREE.MeshBasicMaterial({ color: i === 0 ? new THREE.Color("#fff8ea").multiplyScalar(1.6) : "#9bbacb", transparent: true, side: THREE.DoubleSide, toneMapped: false, fog: false });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.8, 0.018), material); layer.add(plate);
    const pattern = new THREE.Group(); layer.add(pattern);
    if (i > 0) for (let n = 0; n < 18; n++) {
      const horizontal = i === 4;
      const rod = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? 3.16 : i === 2 ? 0.065 : i === 3 ? 0.14 : 0.09,
        horizontal ? 0.055 : i === 2 ? 0.38 : 1.76, 0.008),
        new THREE.MeshBasicMaterial({ color: i === 3 ? ["#ff1010", "#10ff30", "#2040ff"][n % 3] : i === 2 ? "#f0faff" : "#172b51", transparent: true, toneMapped: false, fog: false }));
      rod.position.set(horizontal ? 0 : -1.53 + n * 3.06 / 17, horizontal ? -0.85 + n * 1.7 / 17 : i === 2 ? Math.sin(n * 2) * 0.65 : 0, 0.015);
      pattern.add(rod);
    }
    if (i === 4) {
      const emitter = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.8), new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }));
      emitter.position.z = 0.025; layer.add(emitter);
    }
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(plate.geometry),
      new THREE.LineBasicMaterial({ color: "#b6d9ff", transparent: true, toneMapped: false, fog: false }));
    layer.add(outline);
    // Bright frame (over 1.0 so the bloom picks it up) marks the highlighted plate.
    const border = new THREE.Group(); border.name = "borda";
    const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color("#9fd4ff").multiplyScalar(2.2), transparent: true, toneMapped: false, fog: false });
    for (const [w, h, x, y] of [[3.36, 0.08, 0, 0.94], [3.36, 0.08, 0, -0.94], [0.08, 1.96, 1.64, 0], [0.08, 1.96, -1.64, 0]]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), glow); bar.position.set(x, y, 0); border.add(bar);
    }
    layer.add(border);
    layer.traverse(o => o.layers.set(NOINK));
    group.add(layer); return layer;
  });
  return { group, texture, screen, layers };

}
export type Screen = ReturnType<typeof createScreen>;

export function updateScreen(display: Screen, s: ScreenSpec, shot: ShotSpec, t: number, base: readonly number[]) {
  display.group.position.set(base[0] + (s.dx ?? 0), base[1] + (s.y ?? 0), base[2] + (s.dz ?? 0));
  display.group.rotation.y = THREE.MathUtils.degToRad(s.turn ?? 0);
  display.group.scale.setScalar(s.scale ?? 1);
  const exploded = screenValue(s.explode, t);
  const oled = screenValue(s.oled, t, s.mode === "oled" ? 1 : 0);
  display.screen.position.set(0, 1.65, 0.101);
  (display.screen.material as THREE.MeshBasicMaterial).transparent = true;
  (display.screen.material as THREE.MeshBasicMaterial).opacity = 1 - exploded;
  display.layers.forEach((layer, i) => {
    // Exploded-diagram stack: plates stay parallel and step back along the monitor axis, rising so a 3/4 camera sees
    // each one above the next; the rise waits until the plates have left the frame, so none crosses its top bar.
    const separation = (4 - i) * exploded, lift = (4 - i) * THREE.MathUtils.smoothstep(exploded, 0.25, 1);
    layer.position.set(separation * LAYER_STEP[0], 1.65 + lift * LAYER_STEP[1], 0.07 + i * 0.005 - separation * LAYER_STEP[2]);
    const emphasis = THREE.MathUtils.smoothstep(t, shot.start, shot.start + 0.6) *
      (1 - THREE.MathUtils.smoothstep(t, shot.end - 0.6, shot.end));
    const highlight = s.highlight === undefined || s.highlight === SCREEN_LAYERS[i] ? 1 : 1 - 0.6 * emphasis;
    const opacity = exploded * highlight * (i === 4 ? 1 : 1 - oled);
    layer.visible = opacity > 0;
    layer.traverse(o => {
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) (o.material as THREE.MeshBasicMaterial).opacity = opacity;
    });
    const chosen = s.highlight === SCREEN_LAYERS[i] ? emphasis : 0;
    (layer.getObjectByName("borda")!.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material.opacity = exploded * chosen;
    if (i === 2) layer.children[1].children.forEach((rod, n) => { rod.rotation.z = Math.sin(t * 1.8 + n * 0.2) * 0.6; });
    if (i === 4) {
      const m = (layer.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
      m.opacity = opacity * (1 - oled);
      layer.children[1].traverse(o => { if (o instanceof THREE.Mesh) (o.material as THREE.MeshBasicMaterial).opacity = opacity * (1 - oled); });
      ((layer.children[2] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = opacity * oled;
    }
    // Only fully opaque parts write depth: an invisible emitter must not hide the stripes behind it.
    layer.traverse(o => { if (o instanceof THREE.Mesh) { const m = o.material as THREE.MeshBasicMaterial; m.depthWrite = m.opacity >= 1; } });
  });
  const data = display.texture.image.data as Uint8Array;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const px = (x + 0.5) / W, py = 1 - (y + 0.5) / H;
    let rgb = screenPixel(s, t - shot.start, shot.end - shot.start, px, py);
    if (s.oled) {
      const lcd = screenPixel({ ...s, mode: "lcd" }, 0, 1, px, py);
      const emissive = screenPixel({ ...s, mode: "oled" }, 0, 1, px, py);
      rgb = lcd.map((v, i) => THREE.MathUtils.lerp(v, emissive[i], oled)) as RGB;
    }
    const i = (y * W + x) * 4;
    data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2]; data[i + 3] = 255;
  }
  display.texture.needsUpdate = true;
}
