// HyperFrames entry for every video. The spec (video.json) is inlined in the page as #video-spec; one Stage per
// canvas is posed for the time HyperFrames seeks to (hf-seek). Post chain: InkPass (own pass) -> lens blur pre ->
// lens main -> [bloom + NEUTRAL tone map + grade] (one EffectPass), MSAA 4. Ink runs before the DOF so lines blur
// with what they belong to; bloom after the DOF so glows defocus with their source; the grade is display-referred,
// so it comes after tone mapping. Every pixel-sized parameter is specified at 1080x1920 and scales with the
// drawing-buffer height. Crossfades draw the incoming shot on a second canvas; spec.flash gives 4-frame white flashes.
import * as THREE from "three";
import { BlendFunction, BloomEffect, Effect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { Stage } from "./stage";
import { loadKit } from "./kit";
import { InkPass, noInkFallback } from "./style/ink";
import { LensBlur, GrainEffect } from "./style/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "./style/grade";
import type { Kit } from "./style/build";
import { layersAt, flashAlpha, validateSpec, type ShotSpec, type VideoSpec } from "./spec";

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

const fwd = new THREE.Vector3();
const raw: unknown = JSON.parse(document.getElementById("video-spec")!.textContent!);
const checked = validateSpec(raw);
const spec = (checked.ok ? checked.spec : raw) as VideoSpec;

/** One canvas with its own stage, camera and post chain; returns draw(shot, t). */
const makeView = (canvas: HTMLCanvasElement, kit: Kit, W: number, H: number) => {
  // preserveDrawingBuffer: HyperFrames captures the page after the seek, not inside the draw
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, stencil: false, powerPreference: "high-performance", preserveDrawingBuffer: true });
  renderer.setPixelRatio(window.devicePixelRatio); // --resolution supersampling goes through devicePixelRatio
  renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // r187: PCFSoft was removed (it fell back to this anyway)
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(40, W / H, 0.2, 1500);
  const stage = new Stage(kit, spec);
  scene.add(stage.root);
  scene.fog = stage.fog; scene.background = null;
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

  return (shot: ShotSpec, t: number) => {
    const target = stage.update(shot, t, cam);
    noInkFallback(stage.root);
    // thin-lens focus: distance along the view axis to the shot's focus point (Stage: shot.focus, else the look point)
    cam.getWorldDirection(fwd);
    fx.lens.focus = Math.max(0.3, target.sub(cam.position).dot(fwd));
    fx.lens.cInf = shot.dof ?? 0; // blur-disc radius in px at 1080x1920 for things at infinity; 0 = all sharp
    gradeFor(fx.grade, shot.light);
    fx.grain.seed = Math.round(t * spec.fps); // deterministic per frame
    composer.render(0); // fixed delta: frames are seeked out of order
  };
};

type Draw = ReturnType<typeof makeView>;
type HfSeek = CustomEvent<{ time: number; waitUntil?: (p: Promise<unknown>) => void }>;

const root = document.getElementById("root")!;
const W = Number(root.dataset.width), H = Number(root.dataset.height);
const canvases = [document.getElementById("base") as HTMLCanvasElement, document.getElementById("over") as HTMLCanvasElement];
const flash = document.getElementById("flash")!;

const renderAt = (views: Draw[], time: number) => {
  // snap to the frame grid, inside the video
  const t = Math.min(spec.duration - 1 / spec.fps, Math.max(0, Math.round(time * spec.fps) / spec.fps));
  const layers = layersAt(spec, t);
  views.forEach((draw, i) => {
    const l = layers[i];
    canvases[i].style.opacity = l ? String(l.alpha) : "0";
    if (l) draw(l.shot, t);
  });
  flash.style.opacity = String(flashAlpha(spec, t));
};

// an invalid spec rejects buildReady (with the validator's pt-BR messages) instead of drawing a stale or blank frame
const ready = (checked.ok ? loadKit() : Promise.reject(new Error("spec inválido:\n" + checked.errors.join("\n"))))
  .then((kit) => canvases.map((c) => makeView(c, kit, W, H)));
ready.catch((e: Error) => { console.error(e); document.title = "ERRO: " + e.message; });
const hf = ((window as any).__hf ??= {});
(hf.buildReady ??= {}).engine = ready; // HyperFrames waits for this before the first capture

let views: Draw[] | null = null, lastT = 0;
window.addEventListener("hf-seek", (e) => {
  const { time, waitUntil } = (e as HfSeek).detail;
  lastT = time;
  if (views) renderAt(views, time);
  else waitUntil?.(ready.then((v) => renderAt(v, time)));
});
ready.then((v) => { views = v; renderAt(v, lastT); });
