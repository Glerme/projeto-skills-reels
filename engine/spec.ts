import type { Outfit, Expr } from "./style/toon";
import { ANCHORS, SET_IDS, type SetId } from "./sets/anchors";

export type { SetId };
export type Light = "day" | "golden";
export const ACTION_IDS = ["stand", "walk", "talk", "point", "shock", "cheer", "fall", "sit", "wave",
  "gesture", "laugh", "taunt", "struggle", "unhelm", "pick", "whirl", "topple"] as const;
export type ActionId = (typeof ACTION_IDS)[number];
export type Mood = "curioso" | "animado" | "tenso" | "calmo";
/** scale: optional size multiplier (0.5–2), e.g. a giant; default 1 */
export type CharDef = { id: string; label: string; build: "adult" | "stout" | "kid" | "elder" | "slim"; outfit: Outfit; skin: number; scale?: number };
/** cue: absolute time of the action's key moment (whirl: sling release; topple: the hit) */
export const HAND_PROPS = ["stone", "staff", "spear", "helmet", "sling"] as const;
/** hold: props kept in the screen-left / screen-right hand whatever the action (the action's own props win) */
export type ActorSpec = { who: string; at: string; to?: string; action: ActionId; expr?: [number, Expr][]; facing?: -1 | 0 | 1; cue?: number;
  hold?: { L?: (typeof HAND_PROPS)[number]; R?: (typeof HAND_PROPS)[number] } };
/** a visible thrown stone: from the thrower's hand to the target's forehead, between start and end (absolute s) */
export type ThrowSpec = { from: string; to: string; start: number; end: number };
export type CamSpec = { recipe: "hold" | "push" | "glide"; from: string; to?: string; punch?: number[] };
export type ShotSpec = { id: number; start: number; end: number; set: SetId; light: Light; cam: CamSpec; actors: ActorSpec[];
  dof?: number; focus?: string; xfade?: number; kicks?: number[]; throws?: ThrowSpec[] };
export type SfxCue = { t: number; name: string; gainDb?: number };
export type VideoSpec = { version: 1; slug: string; format: "historia" | "curiosidade" | "lista"; fiction: boolean; fps: 30;
  duration: number; cast: Record<string, CharDef>; shots: ShotSpec[]; flash?: number[]; sfx: SfxCue[]; music: { mood: Mood } };

const EPS = 1e-6;
const BUILDS = ["adult", "stout", "kid", "elder", "slim"];
const isObj = (x: unknown): x is Record<string, any> => typeof x === "object" && x !== null && !Array.isArray(x);

export function validateSpec(x: unknown): { ok: true; spec: VideoSpec } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!isObj(x)) return { ok: false, errors: ["o vídeo não é um objeto"] };
  if (x.version !== 1) errors.push("version deve ser 1");
  if (typeof x.slug !== "string" || !x.slug) errors.push("slug ausente");
  if (!["historia", "curiosidade", "lista"].includes(x.format)) errors.push(`format inválido: ${x.format}`);
  if (typeof x.fiction !== "boolean") errors.push("fiction deve ser booleano");
  if (x.fps !== 30) errors.push("fps deve ser 30");
  if (typeof x.duration !== "number" || !(x.duration > 0)) errors.push("duration inválida");
  if (!isObj(x.music) || !["curioso", "animado", "tenso", "calmo"].includes(x.music.mood)) errors.push("music.mood inválido");
  if (!Array.isArray(x.sfx)) errors.push("sfx deve ser uma lista");
  if (!isObj(x.cast)) errors.push("cast deve ser um objeto");
  else for (const [k, c] of Object.entries(x.cast)) {
    if (!isObj(c) || typeof c.id !== "string" || typeof c.label !== "string" || !BUILDS.includes(c.build) || !isObj(c.outfit)
      || !Number.isInteger(c.skin) || c.skin < 0) errors.push(`personagem ${k}: id, label, build, outfit ou skin inválido`);
    else if (c.scale !== undefined && !(typeof c.scale === "number" && c.scale >= 0.5 && c.scale <= 2)) errors.push(`personagem ${k}: scale deve ser um número de 0,5 a 2`);
  }
  if (!Array.isArray(x.shots) || !x.shots.length) { errors.push("shots deve ser uma lista não vazia"); return { ok: false, errors }; }

  const shots = x.shots as any[];
  let prevEnd = 0;
  shots.forEach((s, i) => {
    const c = `cena ${s?.id}`;
    if (!isObj(s) || typeof s.start !== "number" || typeof s.end !== "number") { errors.push(`${c}: start/end inválidos`); return; }
    if (Math.abs(s.start - prevEnd) > EPS)
      errors.push(`${c}: começa em ${s.start.toFixed(1)} s mas ${i ? `a cena anterior termina em ${prevEnd.toFixed(1)} s` : "o vídeo começa em 0 s"}`);
    prevEnd = s.end;
    if (s.end - s.start < 0.5 - EPS) errors.push(`${c}: dura menos de 0.5 s`);
    const a = Object.hasOwn(ANCHORS, s.set) ? ANCHORS[s.set as SetId] : undefined;
    if (!a) { errors.push(`${c}: set desconhecido "${s.set}" (use ${SET_IDS.join(", ")})`); return; }
    const spot = (n: unknown, what: string) => { if (!a.spots.includes(n as string)) errors.push(`${c}: ${what} "${n}" não existe em ${s.set}`); };
    const view = (n: unknown, what: string) => { if (!a.views.includes(n as string)) errors.push(`${c}: ${what} "${n}" não existe em ${s.set}`); };
    if (!isObj(s.cam)) errors.push(`${c}: cam ausente`);
    else {
      view(s.cam.from, "cam.from");
      if (s.cam.to !== undefined) view(s.cam.to, "cam.to");
      if (s.cam.recipe === "glide" && s.cam.to === undefined) errors.push(`${c}: cam.to é obrigatório em glide`);
    }
    if (s.focus !== undefined && !a.spots.includes(s.focus) && !(isObj(x.cast) && Object.hasOwn(x.cast, s.focus))) errors.push(`${c}: focus "${s.focus}" não existe em ${s.set}`);
    const inside = (t: unknown, what: string) => {
      if (typeof t !== "number" || t < s.start - EPS || t > s.end + EPS) errors.push(`${c}: ${what} ${t} fora da cena (${s.start}–${s.end} s)`);
    };
    const list = (v: unknown, what: string): unknown[] => {
      if (v === undefined) return [];
      if (Array.isArray(v)) return v;
      errors.push(`${c}: ${what} deve ser uma lista`); return [];
    };
    list(s.kicks, "kicks").forEach((t) => inside(t, "kick"));
    list(s.cam?.punch, "cam.punch").forEach((t) => inside(t, "punch"));
    list(s.actors, "actors").forEach((ac, j) => {
      if (!isObj(ac)) { errors.push(`${c}: ator ${j + 1} não é um objeto`); return; }
      if (!isObj(x.cast) || typeof ac.who !== "string" || !Object.hasOwn(x.cast, ac.who)) errors.push(`${c}: personagem "${ac.who}" não existe em cast`);
      spot(ac.at, "at");
      if (ac.to !== undefined) spot(ac.to, "to");
      if (!(ACTION_IDS as readonly string[]).includes(ac.action)) errors.push(`${c}: ação "${ac.action}" não existe (use: ${ACTION_IDS.join(", ")})`);
      if (ac.cue !== undefined) inside(ac.cue, "cue");
      if (ac.hold !== undefined) {
        if (!isObj(ac.hold)) errors.push(`${c}: hold deve ser um objeto {L?, R?}`);
        else for (const [k, v] of Object.entries(ac.hold))
          if (!["L", "R"].includes(k) || !(HAND_PROPS as readonly string[]).includes(v as string)) errors.push(`${c}: hold.${k} "${v}" inválido (use: ${HAND_PROPS.join(", ")})`);
      }
      list(ac.expr, "expr").forEach((e) => {
        if (!Array.isArray(e) || e.length !== 2) errors.push(`${c}: expr deve ser uma lista de [tempo, expressão]`);
        else inside(e[0], "expr");
      });
    });
    list(s.throws, "throws").forEach((th) => {
      const who = list(s.actors, "actors").filter(isObj).map((a) => a.who);
      if (!isObj(th)) { errors.push(`${c}: throw não é um objeto`); return; }
      for (const k of ["from", "to"]) if (!who.includes(th[k])) errors.push(`${c}: throw.${k} "${th[k]}" não é ator da cena`);
      inside(th.start, "throw.start"); inside(th.end, "throw.end");
      if (!(typeof th.start === "number" && typeof th.end === "number" && th.end > th.start)) errors.push(`${c}: throw precisa de start < end`);
    });
    if (s.xfade !== undefined) {
      const prev = shots[i - 1];
      const lim = Math.min(s.end - s.start, isObj(prev) && typeof prev.end === "number" && typeof prev.start === "number" ? prev.end - prev.start : Infinity) / 2;
      if (s.xfade > lim + EPS) errors.push(`${c}: xfade ${s.xfade} s maior que metade da menor cena vizinha (${lim} s)`);
    }
  });
  if (typeof x.duration === "number" && Math.abs(prevEnd - x.duration) > EPS)
    errors.push(`cena ${shots[shots.length - 1]?.id}: termina em ${prevEnd.toFixed(1)} s mas a duração é ${x.duration} s`);
  return errors.length ? { ok: false, errors } : { ok: true, spec: x as unknown as VideoSpec };
}

export function shotAt(spec: VideoSpec, t: number): ShotSpec {
  const s = spec.shots;
  return s.find((h) => t >= h.start && t < h.end) ?? (t < 0 ? s[0] : s[s.length - 1]);
}

export function layersAt(spec: VideoSpec, t: number): { shot: ShotSpec; alpha: number }[] {
  const cur = shotAt(spec, t);
  const i = spec.shots.indexOf(cur);
  const xf = spec.shots[i + 1]?.xfade ?? 0;
  // next shot starts fading in half an xfade before its start
  const nxt = spec.shots[i + 1];
  if (nxt && xf > 0 && t >= nxt.start - xf / 2) return [{ shot: cur, alpha: 1 }, { shot: nxt, alpha: (t - (nxt.start - xf / 2)) / xf }];
  const xc = cur.xfade ?? 0, prev = spec.shots[i - 1];
  if (prev && xc > 0 && t < cur.start + xc / 2) return [{ shot: prev, alpha: 1 }, { shot: cur, alpha: (t - (cur.start - xc / 2)) / xc }];
  return [{ shot: cur, alpha: 1 }];
}

const FLASH = [1, 0.75, 0.45, 0.2];
export function flashAlpha(spec: VideoSpec, t: number): number {
  const f = Math.round(t * spec.fps);
  for (const ft of spec.flash ?? []) {
    const k = f - Math.round(ft * spec.fps);
    if (k >= 0 && k < FLASH.length) return FLASH[k];
  }
  return 0;
}
