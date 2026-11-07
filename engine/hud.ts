import * as THREE from "three";
import { SCREEN_LAYERS, type ScreenLayer } from "./screens";
import type { V3 } from "./camera";

export type HudAnchor = { point: V3; mover?: number; screen?: number; layer?: ScreenLayer };
type Timed = { start: number; end: number };
export type HudSpec = Timed & (
  { kind: "selecao"; anchor: HudAnchor; size: V3; label: string; tone: "termo" | "ok" | "falha" } |
  { kind: "seta"; anchor: HudAnchor; from: [number, number] } |
  { kind: "numero" | "placa" | "cartao"; position: [number, number]; text: string; label: string } |
  { kind: "progresso"; position: [number, number]; colors: string[] } |
  { kind: "verbos"; position: [number, number]; items: { text: string; t: number }[] }
);
const vector = (v: unknown, n: number): v is number[] => Array.isArray(v) && v.length === n && v.every(Number.isFinite);
const text = (v: unknown) => typeof v === "string" && v.trim().length > 0 && v.length <= 80;
const color = (v: unknown) => typeof v === "string" && /^#[\da-f]{6}$/i.test(v);
const obj = (v: any) => v !== null && typeof v === "object" && !Array.isArray(v);
export function validateHud(value: unknown, start: number, end: number, movers: number, screens = 0): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return ["hud deve ser uma lista"];
  return value.flatMap((h: any, i) => {
    let ok = obj(h) && Number.isFinite(h.start) && Number.isFinite(h.end) && start <= h.start && h.start < h.end && h.end <= end;
    if (ok) switch (h.kind) {
      case "selecao": case "seta":
        ok = obj(h.anchor) && vector(h.anchor.point, 3) && (h.anchor.mover === undefined ||
          Number.isInteger(h.anchor.mover) && h.anchor.mover >= 0 && h.anchor.mover < movers);
        ok &&= h.anchor.screen === undefined ? h.anchor.layer === undefined :
          h.anchor.mover === undefined && Number.isInteger(h.anchor.screen) && h.anchor.screen >= 0 && h.anchor.screen < screens && SCREEN_LAYERS.includes(h.anchor.layer);
        ok &&= h.kind === "selecao" ? vector(h.size, 3) && h.size.every((n: number) => n > 0) && text(h.label) && ["termo", "ok", "falha"].includes(h.tone) : vector(h.from, 2);
        break;
      case "numero": case "placa": case "cartao": ok = vector(h.position, 2) && text(h.text) && text(h.label); break;
      case "progresso": ok = vector(h.position, 2) && Array.isArray(h.colors) && h.colors.length > 0 && h.colors.length <= 30 && h.colors.every(color); break;
      case "verbos": ok = vector(h.position, 2) && Array.isArray(h.items) && h.items.length > 0 && h.items.length <= 10 && h.items.every((v: any, j: number) => obj(v) && text(v.text) && Number.isFinite(v.t) && v.t >= h.start && v.t < h.end && (!j || v.t > h.items[j - 1].t)); break;
      default: ok = false;
    }
    return ok ? [] : [`hud ${i + 1}: elemento, âncora ou tempos inválidos`];
  });
}
export const hudEntry = (h: HudSpec, t: number) => t < h.start || t >= h.end ? 0 : Math.min(1, (t - h.start) / 0.25);
export function projectHud(point: THREE.Vector3, cam: THREE.PerspectiveCamera) {
  const p = point.clone().project(cam);
  return p.z < -1 || p.z > 1 ? null : [(p.x + 1) * 540, (1 - p.y) * 960] as const;
}
/** Screen coordinates are in the 1080 x 1920 design frame; anchors are world or mover-local metres. */
export function drawHud(ctx: CanvasRenderingContext2D, elements: HudSpec[], t: number, cam: THREE.PerspectiveCamera,
  resolve: (a: HudAnchor, offset?: V3) => THREE.Vector3 | null) {
  ctx.save(); ctx.scale(ctx.canvas.width / 1080, ctx.canvas.height / 1920);
  for (const h of elements) {
    const u = hudEntry(h, t); if (!u) continue;
    ctx.save(); ctx.globalAlpha = u; ctx.strokeStyle = "#9edbff"; ctx.lineWidth = 2;
    const label = (s: string, x: number, y: number, size = 26, col = "#ffd23a") => {
      ctx.font = `500 ${size}px sans-serif`; ctx.fillStyle = col; ctx.fillText(s.toUpperCase(), x, y, 780);
    };
    if (h.kind === "selecao") {
      const points = [-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(z => {
        const p = resolve(h.anchor, [x * h.size[0] / 2, y * h.size[1] / 2, z * h.size[2] / 2]);
        return p && projectHud(p, cam);
      })));
      if (points.every(p => p !== null)) {
        const ps = points as (readonly [number, number])[], x = Math.min(...ps.map(p => p[0])), y = Math.min(...ps.map(p => p[1]));
        const w = Math.max(...ps.map(p => p[0])) - x, height = Math.max(...ps.map(p => p[1])) - y;
        ctx.setLineDash([2 * (w + height)]); ctx.lineDashOffset = 2 * (w + height) * (1 - u);
        ctx.strokeRect(x, y, w, height); ctx.setLineDash([]);
        ctx.fillStyle = "#9edbff"; for (const px of [x, x + w]) for (const py of [y, y + height]) ctx.fillRect(px - 4, py - 4, 8, 8);
        ctx.fillStyle = "#101a30"; ctx.fillRect(x, y - 42, Math.min(780, h.label.length * 18 + 20) * u, 36);
        label(h.label, x + 10, y - 14, 24, { termo: "#ffd23a", ok: "#74e39c", falha: "#ff7777" }[h.tone]);
      }
    } else if (h.kind === "seta") {
      const world = resolve(h.anchor), p = world && projectHud(world, cam);
      if (p) {
        const [x,y] = h.from, ex = x + (p[0] - x) * u, ey = y + (p[1] - y) * u, a = Math.atan2(ey-y, ex-x);
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(ex,ey);
        for (const d of [-0.5,0.5]) { ctx.moveTo(ex,ey); ctx.lineTo(ex - 18*Math.cos(a+d), ey - 18*Math.sin(a+d)); } ctx.stroke();
      }
    } else {
      const [x,y] = h.position;
      if (h.kind === "progresso") {
        const filled = Math.floor((t-h.start)/(h.end-h.start)*h.colors.length);
        h.colors.forEach((c,i) => { ctx.fillStyle = i < filled ? c : "#243049"; ctx.fillRect(x+i*26,y,20,20); });
      } else if (h.kind === "verbos") {
        ctx.fillStyle = "#101a30"; ctx.fillRect(x-16,y-36,440,h.items.length*38+24);
        const active = h.items.reduce((last, v, i) => t >= v.t ? i : last, -1);
        h.items.forEach((v,i) => label(v.text,x,y+i*38,28,i===active ? "#ffd23a" : "#aeb8ca"));
      } else {
        if (h.kind !== "numero") { ctx.fillStyle = "#101a30"; ctx.fillRect(x-24,y-76,828,140); }
        label(h.text,x,y,h.kind === "cartao" ? 44 : 72); label(h.label,x,y+44,24,"#ffffff");
      }
    }
    ctx.restore();
  }
  ctx.restore();
}
