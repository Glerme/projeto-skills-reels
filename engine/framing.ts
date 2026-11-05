import * as THREE from "three";
import { camAt } from "./camera";
import { actorPosition } from "./space";
import type { ActorSpec, CharDef, ShotSpec } from "./spec";
import type { SetDef } from "./sets/types";

/** Conservative silhouette envelope: the same 600 x 1000 design-unit card used by Stage. */
function bounds(shot: ShotSpec, def: SetDef, actor: ActorSpec, t: number, camera: THREE.PerspectiveCamera, scale: number, bottom = -0.054) {
  const p = actorPosition(shot, def.spots, def.walkways, actor, t).p;
  const yaw = Math.atan2(camera.position.x - p.x, camera.position.z - p.z);
  const points = [-0.648, 0.648].flatMap((x) => [bottom, 2.106].map((y) =>
    new THREE.Vector3(x * scale, y * scale, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(p).project(camera)));
  return { left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)),
    bottom: Math.min(...points.map(p => p.y)), top: Math.max(...points.map(p => p.y)),
    depth: points.every(p => p.z >= -1 && p.z <= 1) };
}
const visible = (b: ReturnType<typeof bounds>) => b.depth && b.right >= -1 && b.left <= 1 && b.top >= -1 && b.bottom <= 1;

/** Same projection for all framing rules, including glide, creep, punches and roll. */
function projector(shot: ShotSpec, def: SetDef, cast: Record<string, CharDef>) {
  const camera = new THREE.PerspectiveCamera(50, 9 / 16, 0.2, 1500);
  return (a: ActorSpec, t: number, bottom?: number) => {
    const c = camAt(shot, t, def.views, 30, def.spots);
    camera.fov = c.fov; camera.updateProjectionMatrix();
    camera.position.set(...c.pos); camera.up.set(0, 1, 0); camera.lookAt(...c.look);
    camera.rotateZ(THREE.MathUtils.degToRad(c.roll)); camera.updateMatrixWorld();
    return bounds(shot, def, a, t, camera, cast[a.who]?.scale ?? 1, bottom);
  };
}

const inside = (b: ReturnType<typeof bounds>) => b.depth && b.left >= -1 && b.right <= 1 && b.bottom >= -1 && b.top <= 1;

// Two 78 px lines (1.08 leading), 484 px bottom and 0.3em stroke: top at 676 px from bottom.
export const CAPTION_TOP = 676;
export const SPEAKER_MIN_HEIGHT: Record<string, number> = { aberto: 0.18, medio: 0.35, baixo: 0.18, close: 0.65 };
/** A named face close keeps the chin above captions; other shots keep the complete card above them. */
export function speakerFraming(shot: ShotSpec, def: SetDef, speaker: ActorSpec, cast: Record<string, CharDef>) {
  const close = shot.cam.from === "close" && (shot.cam.recipe !== "glide" || shot.cam.to === "close");
  const project = projector(shot, def, cast);
  for (let f = 0; f <= Math.ceil((shot.end - shot.start) * 30); f++) {
    const t = Math.min(shot.end, shot.start + f / 30);
    // Lower head envelope leaves room for bob/tilt, including the shorter child's chin.
    const chin = cast[speaker.who]?.build === "kid" ? 0.7 : 1.0;
    const b = project(speaker, t, close ? chin : undefined);
    const full = project(speaker, t);
    const height = (full.top - full.bottom) / 2;
    const from = SPEAKER_MIN_HEIGHT[shot.cam.from] ?? 0;
    const to = shot.cam.recipe === "glide" ? SPEAKER_MIN_HEIGHT[shot.cam.to!] ?? 0 : from;
    const minimum = Math.min(from, to);
    const medium = shot.cam.from === "medio" && (shot.cam.recipe !== "glide" || shot.cam.to === "medio");
    const center = (b.left + b.right) / 2;
    const cropped = close ? b.top > 1 || Math.abs(center) > 1 : !inside(b);
    if (!b.depth || cropped || b.bottom < -1 + 2 * CAPTION_TOP / 1920 ||
        height < minimum || (medium && height > 0.45)) return t;
  }
}

export function crowdFraming(shot: ShotSpec, def: SetDef, extra: ActorSpec, speakers: ActorSpec[], cast: Record<string, CharDef>) {
  const project = projector(shot, def, cast);
  let near: { who: string; t: number } | undefined;
  const samples: { t: number; x: number; visible: boolean; longitudinal: boolean }[] = [];
  const frames = Math.ceil((shot.end - shot.start) * 30);
  for (let f = 0; f <= frames; f++) {
    const t = Math.min(shot.end, shot.start + f / 30), b = project(extra, t);
    const dir = actorPosition(shot, def.spots, def.walkways, extra, t).dir;
    samples.push({ t, x: (b.left + b.right) / 2, visible: visible(b), longitudinal: Math.abs(dir.z) > Math.abs(dir.x) });
  }
  for (const speaker of speakers) {
    const gap = (t: number) => {
      const b = project(extra, t), a = project(speaker, t);
      return visible(a) && visible(b) ? Math.max(a.left - b.right, b.left - a.right) / 2 : Infinity;
    };
    // camAt rounds to frames: search each constant-camera interval as well as its boundaries.
    for (let f = 0; f <= frames && !near; f++) {
      let lo = Math.max(shot.start, shot.start + (f - 0.5) / 30);
      let hi = Math.min(shot.end, shot.start + (f + 0.5) / 30 - 1e-10);
      if (hi < lo) continue;
      for (const t of [lo, hi]) if (gap(t) < 0.12) near = { who: speaker.who, t };
      for (let step = 0; step < 32 && !near; step++) {
        const a = lo + (hi - lo) / 3, b = hi - (hi - lo) / 3;
        const ga = gap(a), gb = gap(b);
        if (ga < 0.12 || gb < 0.12) { near = { who: speaker.who, t: ga < gb ? a : b }; break; }
        if (ga < gb) hi = b; else lo = a;
      }
    }
  }
  // Short shots cannot supply the two-second movement measurement.
  let slow = false;
  for (let i = 60; i < samples.length; i++) {
    const window = samples.slice(i - 60, i + 1);
    if (window.every(p => p.visible && p.longitudinal) && Math.abs(window[60].x - window[0].x) / 2 < 0.15) { slow = true; break; }
  }
  // Weight the last partial frame by its duration; scene endpoints have no duration.
  let visibleTime = 0;
  for (let f = 0; f < frames; f++) {
    const start = shot.start + f / 30, end = Math.min(shot.end, start + 1 / 30);
    const b = project(extra, (start + end) / 2);
    if (inside(b) && (b.top - b.bottom) / 2 >= 0.08) visibleTime += end - start;
  }
  return { near, slow, unseen: visibleTime + 1e-9 < (shot.end - shot.start) / 2 };
}
