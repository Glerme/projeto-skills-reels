import * as THREE from "three";
import { walkwaySegments } from "./space";
import { ACTION_IDS, validateSpec, type VideoSpec, type CharDef, type ShotSpec } from "./spec";
import { SETS } from "./sets/index";
import { EXPR_IDS } from "./style/toon";
import { KENNEY } from "./kit";
import { setDressing } from "./shot-extras";
import type { Kit } from "./style/build";

export type CatalogItem = { name: string; spec: VideoSpec; model?: string; anchors?: boolean };
export type CatalogSheet = { name: string; items: CatalogItem[] };
export function catalogSheets(cast: Record<string, CharDef>): CatalogSheet[] {
  const item = (name: string, actors: ShotSpec["actors"], set: ShotSpec["set"] = "palco", view = "medio"): CatalogItem => ({
    name, spec: { version: 1, slug: `catalogo-${name}`, format: "lista", fiction: false, fps: 30, duration: 2,
      cast, shots: [{ id: 1, start: 0, end: 2, set, light: "day", cam: { recipe: "hold", from: view }, actors }],
      sfx: [], music: { mood: "calmo" } },
  });
  const scientist = { who: "cientista", at: "centro", action: "stand", facing: 0 } as const;
  return [
    { name: "personagens", items: Object.keys(cast).map(who => item(who, [{ ...scientist, who }])) },
    { name: "expressoes", items: EXPR_IDS.map(expr => item(expr, [{ ...scientist, expr: [[0, expr]] }])) },
    { name: "acoes", items: ACTION_IDS.map(action => item(action, [{ ...scientist, action,
      ...(action === "walk" ? { at: "esquerda", to: "direita" } : {}),
      ...(action === "whirl" || action === "topple" || action === "chop" ? { cue: 1 } : {}) }], "palco", "aberto")) },
    ...Object.values(SETS).map(def => ({ name: `cenarios-${def.id}`, items: Object.keys(def.views).map(view =>
      ({ ...item(view, [], def.id, view), anchors: true })) })),
    { name: "props", items: KENNEY.map(model => ({ ...item(model, [{ ...scientist, at: "esquerda" }], "palco", "aberto"), model })) },
  ];
}

/** Validate each independent panel; camera cuts between catalog entries are not video continuity. */
export function catalogSpec(items: CatalogItem[], kit: Kit): VideoSpec {
  for (const item of items) {
    const result = validateSpec(item.spec, kit);
    if (!result.ok) throw new Error(`${item.name}: ${result.errors.join("\n")}`);
    if (item.model && (!KENNEY.includes(item.model) || !kit[item.model])) throw new Error(`modelo ausente: ${item.model}`);
    if (item.anchors !== undefined && typeof item.anchors !== "boolean") throw new Error("anchors inválido");
  }
  return { ...items[0].spec, duration: items.length * 2, shots: items.map((item, i) => {
    const s = item.spec.shots[0], offset = i * 2;
    return { ...s, id: i + 1, start: offset, end: offset + 2, actors: s.actors.map(a => ({ ...a,
      ...(a.cue !== undefined ? { cue: a.cue + offset } : {}),
      ...(a.expr ? { expr: a.expr.map(([t, ex]) => [t + offset, ex] as [number, typeof ex]) } : {}) })) };
  }) };
}

export function catalogProp(model: string, kit: Kit) {
  const group = setDressing([{ model, at: "direita" }], SETS.palco, kit);
  const bounds = new THREE.Box3().setFromObject(group);
  group.position.x += Math.max(0, 0.4 - bounds.min.x);
  group.updateMatrixWorld(true);
  return group;
}

/** Fit the native-sized prop and the person together, including wide and tall models. */
export function fitCatalogProp(group: THREE.Group, cam: THREE.PerspectiveCamera) {
  const bounds = new THREE.Box3().setFromObject(group);
  bounds.expandByPoint(new THREE.Vector3(-2.2, 0, 0));
  bounds.expandByPoint(new THREE.Vector3(-1, 2.4, 0));
  const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
  const distance = Math.max(size.y, size.x / cam.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))) * 1.2 + size.z / 2;
  cam.position.set(center.x, center.y, center.z + distance); cam.lookAt(center); cam.updateMatrixWorld();
}

/** Screen overlay, after post processing: points and walkway lines stay legible above scenery. */
export function drawCatalogAnchors(ctx: CanvasRenderingContext2D, shot: ShotSpec, cam: THREE.PerspectiveCamera) {
  const def = SETS[shot.set], w = ctx.canvas.width, h = ctx.canvas.height;
  const project = (p: [number, number, number]) => {
    const v = new THREE.Vector3(...p).project(cam);
    return { x: (v.x + 1) * w / 2, y: (1 - v.y) * h / 2, visible: v.z >= -1 && v.z <= 1 };
  };
  ctx.font = `bold ${w / 36}px sans-serif`; ctx.lineWidth = w / 270;
  ctx.strokeStyle = "#fff"; ctx.fillStyle = "#161616";
  const label = (name: string, p: ReturnType<typeof project>) => {
    ctx.strokeText(name, p.x + 8, p.y - 8); ctx.fillText(name, p.x + 8, p.y - 8);
  };
  for (const [name, route] of Object.entries(def.walkways)) for (const walkway of walkwaySegments(route)) {
    const from = new THREE.Vector3(...walkway.from).applyMatrix4(cam.matrixWorldInverse);
    const to = new THREE.Vector3(...walkway.to).applyMatrix4(cam.matrixWorldInverse);
    let lo = 0, hi = 1;
    const dz = to.z - from.z;
    if (Math.abs(dz) < 1e-9) {
      if (from.z > -cam.near || from.z < -cam.far) continue;
    } else {
      const near = (-cam.near - from.z) / dz, far = (-cam.far - from.z) / dz;
      lo = Math.max(lo, Math.min(near, far)); hi = Math.min(hi, Math.max(near, far));
      if (lo > hi) continue;
    }
    const point = (t: number) => from.clone().lerp(to, t).applyMatrix4(cam.matrixWorld).toArray() as [number, number, number];
    const a = project(point(lo)), b = project(point(hi));
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    label(name, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, visible: true });
  }
  for (const [name, spot] of Object.entries(def.spots)) {
    const p = project(spot); if (!p.visible) continue;
    ctx.beginPath(); ctx.arc(p.x, p.y, w / 180, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); label(name, p);
  }
}
