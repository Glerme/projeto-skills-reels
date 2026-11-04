// "The Bridge That Fell for a Song": HyperFrames entry (replaces the Remotion Bridge.tsx).
// One three.js world (world.ts) posed per frame from the story timeline (story.ts), drawn for the time HyperFrames
// seeks to (hf-seek). Post chain: InkPass (own pass) -> lens blur pre -> lens main -> [bloom + NEUTRAL tone map +
// grade] (one EffectPass), MSAA 4. Ink runs before the DOF so lines blur with what they belong to; bloom after the
// DOF so glows defocus with their source; the grade is display-referred, so it comes after tone mapping. Every
// pixel-sized parameter is specified at 1080x1920 and scales with the drawing-buffer height.
// Place changes crossfade by drawing the next shot on a second canvas; the hook ends on a 4-frame white flash.
import * as THREE from "three";
import { BlendFunction, BloomEffect, Effect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World, loadKit } from "./world";
import { InkPass, noInkFallback } from "./ink";
import { LensBlur, GrainEffect } from "./lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "./grade";
import { Kit } from "./build";
import { FPS, TOTAL, FLASH_AT, SHOTS, layersAt, dofAt } from "./story";

/** A/B switches for test stills; everything but grain is on. Grain is OFF: the reference has none and it quadruples the file size. */
const POST = { ink: true, lens: true, pre: true, bloom: true, grade: true, grain: false };

/** Bloom for emissive sources only. Its MIP chain always starts at 1920 px tall, whatever the output size, so the
 *  glow keeps the same size relative to the frame at 1080 and 1440 widths. ADD blend: HDR-safe. */
const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();

/** One canvas with its own world, camera and post chain; returns draw(shotId, frame). */
const makeView = (canvas: HTMLCanvasElement, kit: Kit, W: number, H: number) => {
  // preserveDrawingBuffer: HyperFrames captures the page after the seek, not inside the draw
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, stencil: false, powerPreference: "high-performance", preserveDrawingBuffer: true });
  renderer.setPixelRatio(window.devicePixelRatio); // --resolution supersampling goes through devicePixelRatio
  renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true; // what R3F's `shadows` prop set
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(40, W / H, 0.2, 1500);
  const world = new World(kit);
  scene.add(world.root);
  const fx = {
    ink: new InkPass(scene, cam),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
    grain: new GrainEffect({ amount: 0.025, cellPx: 1.5 }),
  };
  const composer = new EffectComposer(renderer, { multisampling: 4, frameBufferType: THREE.HalfFloatType });
  composer.addPass(new RenderPass(scene, cam));
  if (POST.ink) composer.addPass(fx.ink);
  // convolution effects (lens pre, lens main, bloom) each need their own EffectPass
  if (POST.lens && POST.pre) composer.addPass(new EffectPass(cam, fx.lens.pre));
  if (POST.lens) composer.addPass(new EffectPass(cam, fx.lens.main));
  const last: Effect[] = [fx.tone];
  if (POST.bloom) last.unshift(fx.bloom);
  if (POST.grade) last.push(fx.grade);
  if (POST.grain) last.push(fx.grain);
  composer.addPass(new EffectPass(cam, ...last));
  composer.setSize(W, H, false);

  return (id: number, f: number) => {
    const target = world.update(id, f, cam, scene);
    noInkFallback(world.root);
    // thin-lens focus: distance along the view axis to the shot's focus point (default: the camera's look target)
    const d = dofAt(f);
    cam.getWorldDirection(fwd);
    if (d.focus) fpt.set(...d.focus(f)); else fpt.copy(target);
    fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
    fx.lens.cInf = d.cInf;
    gradeFor(fx.grade, SHOTS[id - 1].light);
    fx.grain.seed = f; // deterministic per frame
    composer.render(0); // fixed delta: frames are seeked out of order
  };
};

type Draw = ReturnType<typeof makeView>;
type HfSeek = CustomEvent<{ time: number; waitUntil?: (p: Promise<unknown>) => void }>;

const root = document.getElementById("root")!;
const W = Number(root.dataset.width), H = Number(root.dataset.height);
const canvases = [document.getElementById("base") as HTMLCanvasElement, document.getElementById("over") as HTMLCanvasElement];
const flash = document.getElementById("flash")!;

const renderAt = (views: Draw[], t: number) => {
  const f = Math.min(TOTAL - 1, Math.max(0, Math.round(t * FPS)));
  const layers = layersAt(f);
  views.forEach((draw, i) => {
    const l = layers[i];
    canvases[i].style.opacity = l ? String(l.alpha) : "0";
    if (l) draw(l.id, f);
  });
  const k = f - FLASH_AT;
  flash.style.opacity = String(k >= 0 && k < 4 ? [1, 0.75, 0.45, 0.2][k] : 0);
};

const ready = loadKit().then((kit) => canvases.map((c) => makeView(c, kit, W, H)));
const hf = ((window as any).__hf ??= {});
(hf.buildReady ??= {}).bridge = ready; // HyperFrames waits for this before the first capture

let views: Draw[] | null = null, lastT = 0;
window.addEventListener("hf-seek", (e) => {
  const { time, waitUntil } = (e as HfSeek).detail;
  lastT = time;
  if (views) renderAt(views, time);
  else waitUntil?.(ready.then((v) => renderAt(v, time)));
});
ready.then((v) => { views = v; renderAt(v, lastT); });
