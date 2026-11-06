import { LIGHT_IDS } from "./style/lights";
import { cameraCut, EASES, type CamKey } from "./camera";
import { crowdFraming, speakerFraming } from "./framing";
import { SETS } from "./sets/index";
import { crowdNearTime, groundDistance, MIN_CLEARANCE, overlaps, pointRect, propRect, walkwayRect, onWalkway } from "./space";
import type { Kit } from "./style/build";
import models from "../kit/models.json";
import { isExpr, type Outfit, type Expr } from "./style/toon";
import { ANCHORS, SET_IDS, SKY_SETS, type SetId } from "./sets/anchors";

export type { SetId };
export type Light = import("./style/lights").LightId;
export const ACTION_IDS = ["stand", "walk", "talk", "point", "shock", "cheer", "fall", "sit", "wave",
  "gesture", "laugh", "taunt", "struggle", "unhelm", "pick", "whirl", "topple", "run", "chop"] as const;
export type ActionId = (typeof ACTION_IDS)[number];
export type Mood = "curioso" | "animado" | "tenso" | "calmo";
/** scale: optional size multiplier (0.5–2), e.g. a giant; default 1 */
export type CharDef = { id: string; label: string; build: "adult" | "stout" | "kid" | "elder" | "slim"; outfit: Outfit; skin: number; scale?: number };
/** cue: absolute time of the action's key moment (whirl: sling release; topple: the hit; chop: the axe lands) */
export const HAND_PROPS = ["stone", "staff", "spear", "helmet", "sling", "axe"] as const;
/** hold: props kept in the screen-left / screen-right hand whatever the action (the action's own props win) */
/** beats: [absolute time, action] switches during the shot (action is the one before the first beat);
 *  travel: [start, end] window of the at -> to move (default: the whole shot); dx/dz: metres off the spot; toDx/toDz: off the end spot;
 *  enter/exit: absolute times of a pop-in (scale up with overshoot and a dust puff) and a pop-out */
export type ActorSpec = { who: string; at?: string; to?: string; path?: string; action: ActionId; expr?: [number, Expr][]; facing?: -1 | 0 | 1; cue?: number;
  beats?: [number, ActionId][]; travel?: [number, number]; dx?: number; dz?: number; toDx?: number; toDz?: number; enter?: number; exit?: number;
  hold?: { L?: (typeof HAND_PROPS)[number]; R?: (typeof HAND_PROPS)[number] } };
/** a visible thrown stone: from the thrower's hand to the target's forehead, between start and end (absolute s) */
export type ThrowSpec = { from: string; to: string; start: number; end: number };
/** keys: free camera (see CamKey in camera.ts); from/to/punch only apply to the view recipes */
export type CamSpec = { recipe: "hold" | "push" | "glide" | "keys"; from: string; to?: string; punch?: number[]; keys?: CamKey[] };
export type PropSpec = { model: string; at: string; turn?: number; scale?: number; dx?: number; dz?: number };
export type SkySpec = { sun?: boolean; clouds?: number };
export const EFFECT_KINDS = ["fire", "water", "splash", "sound"] as const;
/** an animated effect at a spot or on an actor (+dx/dz, y metres up): fire (size = flame height), water (a pool with
 *  ripples, size = diameter), splash (one burst at start), sound (rings spreading at ~3 m/s, size = largest radius;
 *  toDx/toDz move the source between start and end, so the rings bunch up ahead of it: Doppler) */
export type EffectSpec = { kind: (typeof EFFECT_KINDS)[number]; at: string; dx?: number; dz?: number; y?: number; size?: number;
  start?: number; end?: number; toDx?: number; toDz?: number; /** sound: ring speed m/s (default 3) and seconds between rings (0.45) */ speed?: number; every?: number };
/** a kit model that moves during the shot (a car driving, a plane flying): from the spot + dx/dz/y to + toDx/toDz/toY
 *  between start and end (constant speed), facing `turn` degrees (0 = the model's own front); scale multiplies its height */
export type MoverSpec = { model: string; at: string; dx?: number; dz?: number; y?: number; toDx?: number; toDz?: number; toY?: number;
  start?: number; end?: number; turn?: number; scale?: number };
export type ShotSpec = { id: number; start: number; end: number; set: SetId; light: Light; cam: CamSpec; actors: ActorSpec[];
  dof?: number; focus?: string; xfade?: number; kicks?: number[]; throws?: ThrowSpec[]; sky?: SkySpec; effects?: EffectSpec[]; movers?: MoverSpec[] };
export type SfxCue = { t: number; name: string; gainDb?: number };
export type VideoSpec = { version: 1; slug: string; format: "historia" | "curiosidade" | "lista" | "e-se" | "e-se-serie"; fiction: boolean; fps: 30;
  duration: number; cast: Record<string, CharDef>; shots: ShotSpec[]; dressing?: Partial<Record<SetId, PropSpec[]>>; flash?: number[]; sfx: SfxCue[]; music: { mood: Mood; stop?: number } };

const EPS = 1e-6;
/** keys good enough to evaluate the camera (the detailed messages come from the scene pass) */
const keysValid = (s: any) => Array.isArray(s.cam.keys) && s.cam.keys.length > 0 && s.cam.keys.every((k: any, j: number) =>
  isObj(k) && typeof k.t === "number" && typeof k.dist === "number" && k.dist >= 1.2 && (!j || k.t > s.cam.keys[j - 1].t) &&
  (k.ease === undefined || (EASES as string[]).includes(k.ease)) && (k.on === undefined || typeof k.on === "string" || (Array.isArray(k.on) && k.on.length === 3)));
const BUILDS = ["adult", "stout", "kid", "elder", "slim"];
const isObj = (x: unknown): x is Record<string, any> => typeof x === "object" && x !== null && !Array.isArray(x);

export function validateSpec(x: unknown, kit: Kit = {}): { ok: true; spec: VideoSpec } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!isObj(x)) return { ok: false, errors: ["o vídeo não é um objeto"] };
  if (x.version !== 1) errors.push("version deve ser 1");
  if (typeof x.slug !== "string" || !x.slug) errors.push("slug ausente");
  if (!["historia", "curiosidade", "lista", "e-se", "e-se-serie"].includes(x.format)) errors.push(`format inválido: ${x.format}`);
  if (typeof x.fiction !== "boolean") errors.push("fiction deve ser booleano");
  if (x.fps !== 30) errors.push("fps deve ser 30");
  if (typeof x.duration !== "number" || !(x.duration > 0)) errors.push("duration inválida");
  if (!isObj(x.music) || !["curioso", "animado", "tenso", "calmo"].includes(x.music.mood)) errors.push("music.mood inválido");
  if (isObj(x.music) && x.music.stop !== undefined && !(typeof x.music.stop === "number" && x.music.stop > 0 && x.music.stop < x.duration))
    errors.push(`music.stop deve ficar entre 0 e duration: ${x.music.stop}`);
  if (!Array.isArray(x.sfx)) errors.push("sfx deve ser uma lista");
  if (!isObj(x.cast)) errors.push("cast deve ser um objeto");
  else for (const [k, c] of Object.entries(x.cast)) {
    if (!isObj(c) || typeof c.id !== "string" || typeof c.label !== "string" || !BUILDS.includes(c.build) || !isObj(c.outfit)
      || !Number.isInteger(c.skin) || c.skin < 0) errors.push(`personagem ${k}: id, label, build, outfit ou skin inválido`);
    else if (c.scale !== undefined && !(typeof c.scale === "number" && c.scale >= 0.5 && c.scale <= 2)) errors.push(`personagem ${k}: scale deve ser um número de 0,5 a 2`);
  }
  if (!Array.isArray(x.shots) || !x.shots.length) { errors.push("shots deve ser uma lista não vazia"); return { ok: false, errors }; }

  if (x.dressing !== undefined) {
    if (!isObj(x.dressing)) errors.push("dressing deve ser um objeto por cenário");
    else for (const [id, props] of Object.entries(x.dressing)) {
      const c = `dressing ${id}`;
      if (!Object.hasOwn(SETS, id)) { errors.push(`${c}: cenário desconhecido`); continue; }
      const def = SETS[id as SetId];
      if (!Array.isArray(props)) { errors.push(`${c}: props deve ser uma lista`); continue; }
      const occupied = def.blocked(kit);
      const passages = [...Object.entries(def.spots).map(([n, p]) => pointRect(`spot ${n}`, p)),
        ...Object.entries(def.walkways).map(([n, w]) => walkwayRect(n, w))];
      props.forEach((p, i) => {
        const before = errors.length;
        if (!isObj(p)) { errors.push(`${c}: prop deve ser um objeto`); return; }
        if (!models.includes(p.model)) errors.push(`${c}: modelo "${p.model}" não existe em models.json`);
        if (!Object.hasOwn(def.spots, p.at)) errors.push(`${c}: prop.at "${p.at}" não existe em ${id}`);
        for (const k of ["turn", "scale", "dx", "dz"]) {
          if (p[k] !== undefined && (typeof p[k] !== "number" || !Number.isFinite(p[k]) ||
            (k === "scale" && (p[k] < 0.3 || p[k] > 3)))) errors.push(`${c}: prop.${k} inválido${k === "scale" ? " (0,3–3)" : ""}`);
        }
        if (before !== errors.length) return;
        const name = `prop ${i + 1} (${p.model})`;
        if (!Object.hasOwn(kit, p.model)) { errors.push(`${c}: ${name}: modelo .glb ausente; não foi possível medir`); return; }
        const r = propRect(p as PropSpec, def.spots, kit, name);
        for (const other of occupied) {
          const distance = groundDistance(r, other);
          if (distance < MIN_CLEARANCE - EPS) errors.push(`${c}: ${name} sem folga de 0,6 m com ${other.name}: distância ${distance.toFixed(3)} m`);
        }
        for (const other of passages) if (overlaps(r, other)) errors.push(`${c}: ${name} colide com ${other.name}`);
        occupied.push(r);
      });
    }
  }

  const shots = x.shots as any[];
  let prevEnd = 0;
  shots.forEach((s, i) => {
    const c = `cena ${s?.id}`;
    if (!isObj(s) || typeof s.start !== "number" || typeof s.end !== "number") { errors.push(`${c}: start/end inválidos`); return; }
    if (Math.abs(s.start - prevEnd) > EPS)
      errors.push(`${c}: começa em ${s.start.toFixed(1)} s mas ${i ? `a cena anterior termina em ${prevEnd.toFixed(1)} s` : "o vídeo começa em 0 s"}`);
    prevEnd = s.end;
    if (s.end - s.start < 0.5 - EPS) errors.push(`${c}: dura menos de 0.5 s`);
    if (!LIGHT_IDS.includes(s.light)) errors.push(`${c}: light "${s.light}" inválida (use ${LIGHT_IDS.join(", ")})`);
    const a = Object.hasOwn(ANCHORS, s.set) ? ANCHORS[s.set as SetId] : undefined;
    if (!a) { errors.push(`${c}: set desconhecido "${s.set}" (use ${SET_IDS.join(", ")})`); return; }
    const spot = (n: unknown, what: string) => { if (!a.spots.includes(n as string)) errors.push(`${c}: ${what} "${n}" não existe em ${s.set}`); };
    const view = (n: unknown, what: string) => { if (!a.views.includes(n as string)) errors.push(`${c}: ${what} "${n}" não existe em ${s.set}`); };
    const actorIds = Array.isArray(s.actors) ? s.actors.filter(isObj).map((ac: any) => ac.who) : [];
    if (isObj(s.cam) && s.cam.recipe === "keys") {
      if (!Array.isArray(s.cam.keys) || !s.cam.keys.length) errors.push(`${c}: cam.keys deve ser uma lista não vazia`);
      else s.cam.keys.forEach((k: any, j: number) => {
        const w = `${c}: cam.keys[${j}]`;
        if (!isObj(k)) { errors.push(`${w} não é um objeto`); return; }
        if (typeof k.t !== "number" || k.t < s.start - EPS || k.t > s.end + EPS) errors.push(`${w}.t ${k.t} fora da cena (${s.start}–${s.end} s)`);
        if (j && isObj(s.cam.keys[j - 1]) && !(k.t > s.cam.keys[j - 1].t)) errors.push(`${w}.t deve ser maior que o da chave anterior`);
        if (typeof k.dist !== "number" || k.dist < 1.2 || k.dist > 400) errors.push(`${w}.dist deve ir de 1,2 a 400 m`);
        for (const [f, lo, hi] of [["h", -1, 300], ["yaw", -360, 360], ["aim", -1, 60], ["fov", 12, 75], ["roll", -15, 15]] as const)
          if (k[f] !== undefined && !(typeof k[f] === "number" && k[f] >= lo && k[f] <= hi)) errors.push(`${w}.${f} deve ir de ${lo} a ${hi}`);
        if (k.ease !== undefined && !(EASES as string[]).includes(k.ease)) errors.push(`${w}.ease "${k.ease}" inválido (use ${EASES.join(", ")})`);
        const point = Array.isArray(k.on) && k.on.length === 3 && k.on.every((v: unknown) => typeof v === "number" && Number.isFinite(v));
        if (k.on !== undefined && !point && !a.spots.includes(k.on) && !actorIds.includes(k.on)) errors.push(`${w}.on "${k.on}" não é spot de ${s.set}, ator da cena nem ponto [x, y, z]`);
      });
    } else if (!isObj(s.cam)) errors.push(`${c}: cam ausente`);
    else {
      if (!["hold", "push", "glide"].includes(s.cam.recipe)) errors.push(`${c}: cam.recipe "${s.cam.recipe}" inválido (use hold, push, glide ou keys)`);
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
    if (s.props !== undefined) errors.push(`${c}: props por cena foi removido; use dressing no topo do vídeo`);
    if (s.sky !== undefined) {
      if (!SKY_SETS.includes(s.set)) errors.push(`${c}: sky exige cenário com céu`);
      if (!isObj(s.sky)) errors.push(`${c}: sky deve ser um objeto`);
      else {
        if (s.sky.sun !== undefined && typeof s.sky.sun !== "boolean") errors.push(`${c}: sky.sun deve ser booleano`);
        if (s.sky.clouds !== undefined && (!Number.isInteger(s.sky.clouds) || s.sky.clouds < 0 || s.sky.clouds > 8)) errors.push(`${c}: sky.clouds deve ser inteiro de 0 a 8`);
      }
    }
    list(s.kicks, "kicks").forEach((t) => inside(t, "kick"));
    list(s.cam?.punch, "cam.punch").forEach((t) => inside(t, "punch"));
    list(s.actors, "actors").forEach((ac, j) => {
      if (!isObj(ac)) { errors.push(`${c}: ator ${j + 1} não é um objeto`); return; }
      if (!isObj(x.cast) || typeof ac.who !== "string" || !Object.hasOwn(x.cast, ac.who)) errors.push(`${c}: personagem "${ac.who}" não existe em cast`);
      const def = SETS[s.set as SetId];
      if (ac.path !== undefined) {
        if (typeof ac.path !== "string" || !Object.hasOwn(def.walkways, ac.path)) errors.push(`${c}: path "${ac.path}" não existe em ${s.set}`);
        if (ac.action !== "walk" || ac.at !== undefined || ac.to !== undefined) errors.push(`${c}: path exige walk e substitui at/to`);
      } else {
        spot(ac.at, "at");
        if (ac.action === "walk" || ac.travel !== undefined) {
          if (ac.to === undefined) { if (ac.action === "walk") errors.push(`${c}: walk precisa de to ou path`); }
          else if (Object.keys(def.walkways).length && Object.hasOwn(def.spots, ac.at) && Object.hasOwn(def.spots, ac.to) &&
            !Object.values(def.walkways).some((w) => onWalkway(def.spots[ac.at], w) && onWalkway(def.spots[ac.to], w)))
            errors.push(`${c}: walk de ${ac.at} até ${ac.to} cruza a pista; figurante anda por path`);
        }
      }
      if (ac.to !== undefined) spot(ac.to, "to");
      if (!(ACTION_IDS as readonly string[]).includes(ac.action)) errors.push(`${c}: ação "${ac.action}" não existe (use: ${ACTION_IDS.join(", ")})`);
      list(ac.beats, "beats").forEach((b) => {
        if (!Array.isArray(b) || b.length !== 2) { errors.push(`${c}: beats deve ser uma lista de [tempo, ação]`); return; }
        inside(b[0], "beat");
        if (!(ACTION_IDS as readonly string[]).includes(b[1]) || b[1] === "walk") errors.push(`${c}: beat "${b[1]}" inválido (ações menos walk; deslocamento é to + travel)`);
      });
      if (ac.travel !== undefined) {
        if (!Array.isArray(ac.travel) || ac.travel.length !== 2 || !(ac.travel[1] > ac.travel[0])) errors.push(`${c}: travel deve ser [início, fim] com início < fim`);
        else { inside(ac.travel[0], "travel"); inside(ac.travel[1], "travel"); }
        if (ac.to === undefined && ac.toDx === undefined && ac.toDz === undefined) errors.push(`${c}: travel exige to, toDx ou toDz`);
      }
      for (const k of ["dx", "dz", "toDx", "toDz"]) if (ac[k] !== undefined && !(typeof ac[k] === "number" && Math.abs(ac[k]) <= 8)) errors.push(`${c}: ${k} deve ir de -8 a 8 m`);
      for (const k of ["enter", "exit"]) if (ac[k] !== undefined) inside(ac[k], k);
      if (typeof ac.enter === "number" && typeof ac.exit === "number" && !(ac.exit > ac.enter)) errors.push(`${c}: exit deve vir depois de enter`);
      if (ac.cue !== undefined) inside(ac.cue, "cue");
      else if (ac.action === "whirl" || ac.action === "topple" || ac.action === "chop") errors.push(`${c}: ${ac.action} precisa de cue (o tempo do arremesso ou do golpe)`);
      if (ac.hold !== undefined) {
        if (!isObj(ac.hold)) errors.push(`${c}: hold deve ser um objeto {L?, R?}`);
        else for (const [k, v] of Object.entries(ac.hold))
          if (!["L", "R"].includes(k) || !(HAND_PROPS as readonly string[]).includes(v as string)) errors.push(`${c}: hold.${k} "${v}" inválido (use: ${HAND_PROPS.join(", ")})`);
      }
      list(ac.expr, "expr").forEach((e) => {
        if (!Array.isArray(e) || e.length !== 2) errors.push(`${c}: expr deve ser uma lista de [tempo, expressão]`);
        else { inside(e[0], "expr"); if (!isExpr(e[1])) errors.push(`${c}: expressão inválida: ${e[1]}`); }
      });
    });
    const def = SETS[s.set as SetId];
    const actors = list(s.actors, "actors").filter(isObj);
    const placed = actors.filter((ac) => ac.path === undefined && Object.hasOwn(def.spots, ac.at) &&
      (ac.to === undefined || Object.hasOwn(def.spots, ac.to)));
    if (Array.isArray(s.actors) && s.actors.every(isObj) && Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start) {
      const cameraValid = isObj(s.cam) && (s.cam.recipe === "keys" ? keysValid(s) : ["hold", "push", "glide"].includes(s.cam.recipe) &&
        Object.hasOwn(def.views, s.cam.from) && (s.cam.recipe !== "glide" || Object.hasOwn(def.views, s.cam.to))) &&
        (s.cam.punch === undefined || Array.isArray(s.cam.punch)) && (s.kicks === undefined || Array.isArray(s.kicks));
      const cast = isObj(x.cast) ? x.cast as Record<string, CharDef> : {};
      if (cameraValid) for (const speaker of placed.filter(ac => ac.action === "talk" || ac.who === s.focus)) {
        const t = speakerFraming(s as ShotSpec, def, speaker as ActorSpec, cast);
        if (t !== undefined) errors.push(`${c}: quem fala (${speaker.who}) cortado pelo quadro em ${t.toFixed(6)} s ou cruza a faixa da legenda; use enquadramento inteiro ou close de rosto; altura mínima: aberto/baixo 18%, medio 35–45%, close 65%`);
      }
      for (const extra of actors.filter((ac) => typeof ac.path === "string" && Object.hasOwn(def.walkways, ac.path))) {
        if (cameraValid) {
          const framing = crowdFraming(s as ShotSpec, def, extra as ActorSpec, placed as ActorSpec[], isObj(x.cast) ? x.cast as Record<string, CharDef> : {});
          if (framing.unseen) errors.push(`${c}: figurante ${extra.who} precisa ficar dentro do quadro com altura mínima de 8% por pelo menos metade da cena`);
          if (framing.near) errors.push(`${c}: figurante ${extra.who} a menos de 12% da largura do quadro da silhueta de ${framing.near.who} em ${framing.near.t.toFixed(6)} s`);
          if (framing.slow) errors.push(`${c}: path "${extra.path}" x view "${s.cam.from}" não desloca 15% da largura do quadro em 2 s; use praca ou plano curto`);
        }
        for (const speaker of placed) {
          const t = crowdNearTime(s as ShotSpec, def.spots, def.walkways, extra as ActorSpec, speaker as ActorSpec);
          if (t !== undefined) errors.push(`${c}: figurante ${extra.who} a menos de 3 m de ${speaker.who} em ${t.toFixed(6)} s`);
        }
      }
    }
    list(s.throws, "throws").forEach((th) => {
      const who = list(s.actors, "actors").filter(isObj).map((a) => a.who);
      if (!isObj(th)) { errors.push(`${c}: throw não é um objeto`); return; }
      for (const k of ["from", "to"]) if (!who.includes(th[k])) errors.push(`${c}: throw.${k} "${th[k]}" não é ator da cena`);
      inside(th.start, "throw.start"); inside(th.end, "throw.end");
      if (!(typeof th.start === "number" && typeof th.end === "number" && th.end > th.start)) errors.push(`${c}: throw precisa de start < end`);
    });
    list(s.effects, "effects").forEach((e, j) => {
      const n = `${c}: effect ${j + 1}`;
      if (!isObj(e)) { errors.push(`${n} não é um objeto`); return; }
      if (!EFFECT_KINDS.includes(e.kind)) errors.push(`${n}: kind "${e.kind}" inválido (use ${EFFECT_KINDS.join(", ")})`);
      const who = list(s.actors, "actors").filter(isObj).map((a) => a.who);
      if (!(Object.hasOwn(SETS, s.set) && Object.hasOwn(SETS[s.set as SetId].spots, e.at)) && !who.includes(e.at)) errors.push(`${n}: at "${e.at}" não é spot nem ator da cena`);
      for (const k of ["dx", "dz", "y", "toDx", "toDz"]) if (e[k] !== undefined && !(typeof e[k] === "number" && Number.isFinite(e[k]))) errors.push(`${n}: ${k} inválido`);
      if (e.size !== undefined && !(typeof e.size === "number" && e.size > 0 && e.size <= 20)) errors.push(`${n}: size deve ir de 0 a 20 m`);
      if (e.speed !== undefined && !(typeof e.speed === "number" && e.speed >= 0.5 && e.speed <= 100)) errors.push(`${n}: speed deve ir de 0,5 a 100 m/s`);
      if (e.every !== undefined && !(typeof e.every === "number" && e.every >= 0.1 && e.every <= 5)) errors.push(`${n}: every deve ir de 0,1 a 5 s`);
      if (e.start !== undefined) inside(e.start, "effect.start");
      if (e.end !== undefined) inside(e.end, "effect.end");
      if ((e.start ?? s.start) >= (e.end ?? s.end)) errors.push(`${n}: precisa de start < end`);
    });
    list(s.movers, "movers").forEach((m, j) => {
      const n = `${c}: mover ${j + 1}`;
      if (!isObj(m)) { errors.push(`${n} não é um objeto`); return; }
      if (!models.includes(m.model)) errors.push(`${n}: modelo "${m.model}" não existe em models.json`);
      if (!(Object.hasOwn(SETS, s.set) && Object.hasOwn(SETS[s.set as SetId].spots, m.at))) errors.push(`${n}: at "${m.at}" não é spot de ${s.set}`);
      for (const k of ["dx", "dz", "y", "toDx", "toDz", "toY", "turn"]) if (m[k] !== undefined && !(typeof m[k] === "number" && Number.isFinite(m[k]))) errors.push(`${n}: ${k} inválido`);
      if (m.scale !== undefined && !(typeof m.scale === "number" && m.scale >= 0.3 && m.scale <= 3)) errors.push(`${n}: scale deve ir de 0,3 a 3`);
      if (m.start !== undefined) inside(m.start, "mover.start");
      if (m.end !== undefined) inside(m.end, "mover.end");
      if ((m.start ?? s.start) >= (m.end ?? s.end)) errors.push(`${n}: precisa de start < end`);
    });
    if (s.xfade !== undefined) {
      const prev = shots[i - 1];
      const lim = Math.min(s.end - s.start, isObj(prev) && typeof prev.end === "number" && typeof prev.start === "number" ? prev.end - prev.start : Infinity) / 2;
      if (s.xfade > lim + EPS) errors.push(`${c}: xfade ${s.xfade} s maior que metade da menor cena vizinha (${lim} s)`);
    }
  });
  // Cross-scene invariants run only after each scene has passed structural validation.
  const crowds = new Map<string, Map<string, { path: string; id: number }>>();
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (!isObj(s) || !Object.hasOwn(SETS, s.set) || !Array.isArray(s.actors)) continue;
    const seen = crowds.get(s.set) ?? new Map<string, { path: string; id: number }>();
    for (const [who, first] of seen) {
      if (!s.actors.some((a: unknown) => isObj(a) && a.who === who && a.action === "walk" && a.path === first.path))
        errors.push(`cenas ${first.id} e ${s.id}: figurante ${who} deve continuar na path "${first.path}" até o fim de ${s.set}`);
    }
    for (const a of s.actors.filter(isObj)) if (typeof a.path === "string" && !seen.has(a.who))
      seen.set(a.who, { path: a.path, id: s.id });
    crowds.set(s.set, seen);
    const prev = shots[i - 1], def = SETS[s.set as SetId];
    const validCamera = (h: any) => isObj(h) && isObj(h.cam) && (h.cam.recipe === "keys" ? keysValid(h) :
      ["hold", "push", "glide"].includes(h.cam.recipe) && Object.hasOwn(def.views, h.cam.from) &&
      (h.cam.recipe !== "glide" || Object.hasOwn(def.views, h.cam.to))) &&
      Number.isFinite(h.start) && Number.isFinite(h.end) &&
      (h.cam.punch === undefined || (Array.isArray(h.cam.punch) && h.cam.punch.every(Number.isFinite)));
    if (validCamera(s) && s.cam.recipe === "glide") {
      const from = { ...s, end: s.start, cam: { recipe: "hold", from: s.cam.from } } as ShotSpec;
      const to = { ...s, cam: { recipe: "hold", from: s.cam.to } } as ShotSpec;
      for (const message of cameraCut(from, to, def.views, def.spots, def.walkways)) errors.push(`cena ${s.id} (glide): ${message}`);
    }
    if (isObj(prev) && prev.set === s.set && validCamera(prev) && validCamera(s))
      for (const message of cameraCut(prev as ShotSpec, s as ShotSpec, def.views, def.spots, def.walkways))
        errors.push(`cenas ${prev.id} e ${s.id}: ${message}`);
  }
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
