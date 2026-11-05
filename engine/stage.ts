import { actorPosition } from "./space";
// One three.js world for a whole video: shared sky (5 stops), sun disc + halo, clouds, fog = horizon colour,
// hemi/sun/fill lights, the cast as lit cards from the Pool, plus one group per set used by the spec (only the shot's
// set is shown). update(shot, t, cam) is a pure function of (shot, t): frames are seeked out of order.
// Ported from the bridge's World (world.ts) and the generic half of cast.ts, minus everything bridge-specific.
import * as THREE from "three";
import type { VideoSpec, ShotSpec, ActorSpec, SetId } from "./spec";
import { camAt, type V3 } from "./camera";
import { SETS } from "./sets/index";
import type { SetDef } from "./sets/types";
import { poseAt, blinkAt } from "./cast/actions";
import { drawChar } from "./cast/chars";
import { Pool, Actor, Fx, type Place, type FxPlace } from "./style/cards";
import { fxShadow, fxContact, fxPuff, fxStars, fxBurst, type FrontOpts, type Pen } from "./style/toon";
import { LIGHTS, LOOK, type WorldLook } from "./style/lights";
import { TONE, CHAR, untone } from "./style/shade";
import { NOINK } from "./style/ink";
import { ctex, cloudHD } from "./style/paint";
import { setSight, type Kit, type Ray } from "./style/build";

import { setDressing, shotSky } from "./shot-extras";

const V = (v: V3) => new THREE.Vector3(v[0], v[1], v[2]);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const EYE = 1.5;    // focus height over a spot / an actor's feet

// ---------------- sun sprites ----------------
/** sun disc (solid, soft rim) and the flat golden halo (lighting.md 6 / depth.md 6.4: r50 13-26 % of the frame width) */
const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});

// ---------------- cast helpers (cast.ts) ----------------
const q = (v: number, n = 120) => Math.round(v * n) / n;
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (sun: THREE.Vector3, right: THREE.Vector3, mirror: boolean) => {
  const sx = sun.dot(right) * (mirror ? -1 : 1), sy = -sun.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
/** ground shadow under a standing card: a tight multiply contact pool under the feet, plus by day (cards cast no real
 *  shadow) a lighter soft tail stretched away from the sun, ~1.6 m / tan(sun elevation), capped */
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: FxPlace[], sun: THREE.Vector3, light: "day" | "golden", x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(sun.x, sun.z) || 1, ox = -sun.x / hl, oz = -sun.z / hl, rot = Math.atan2(-ox, -oz);
  if (light === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, sun.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c, w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[light], k);
  out.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

/** every lens position of the set's shots looking at its subject: centre, sides and top of frame */
const sightLines = (spec: VideoSpec, def: SetDef): Ray[] => {
  const out: Ray[] = [];
  for (const s of spec.shots) if (s.set === def.id) for (let t = s.start; t < s.end; t += 2 / spec.fps) {
    const c = camAt(s, t, def.views, spec.fps, def.spots), o = V(c.pos), fw = V(c.look).sub(o), len = fw.length();
    fw.normalize();
    const rt = fw.clone().cross(new THREE.Vector3(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
    const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
    for (const [sx, sy] of [[0, 0], [-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.4]])
      out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
  }
  return out;
};

export class Stage {
  root = new THREE.Group();
  fog = new THREE.Fog("#bccbec", 25, 420); // main.ts puts it on the scene
  private spec: VideoSpec;
  private sets = new Map<SetId, THREE.Group>();
  private dressing = new Map<SetId, THREE.Group>();
  private extraClouds: THREE.Mesh[] = [];
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private fill: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(kit: Kit, spec: VideoSpec) {
    this.spec = spec;
    const R = this.root;
    // sky: 5 colour stops by elevation, written as tone-map-inverted linear values
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true,
      transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.fill = new THREE.DirectionalLight("#9fb8ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.fill, this.fill.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30;
      m.position.set(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
        map: this.cloudMaps.day[i % 4], transparent: true, depthWrite: false, fog: false,
        color: new THREE.Color(1.1, 1.1, 1.1) }));
      m.layers.set(NOINK); m.visible = false;
      this.extraClouds.push(m); R.add(m);
    }
    setSight([]);
    for (const id of new Set(spec.shots.map((s) => s.set))) {
      const group = setDressing(spec.dressing?.[id] ?? [], SETS[id], kit);
      group.visible = false; this.dressing.set(id, group); R.add(group);
    }
    // one group per set the video uses, built with that set's sight lines kept clear
    for (const id of new Set(spec.shots.map((s) => s.set))) {
      const g = new THREE.Group(), def = SETS[id];
      setSight(sightLines(spec, def));
      def.build(g, kit);
      g.visible = false;
      this.sets.set(id, g); R.add(g);
    }
    setSight([]);
  }

  /** camera-relative sun, frozen per shot: the shot's mean view direction turned by az toward screen right, lifted by el */
  private shotSun(s: ShotSpec, def: SetDef) {
    let v = this.sunCache.get(s.id);
    if (v) return v;
    const L = LIGHTS[s.light];
    let fx = 0, fz = 0;
    for (let t = s.start; t < s.end; t += 3 / this.spec.fps) {
      const c = camAt(s, t, def.views, this.spec.fps, def.spots), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(def.sunAz ?? L.az), el = THREE.MathUtils.degToRad(L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az); // screen right = (-fz, fx)
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(s.id, v);
    return v;
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  /** Paths follow absolute video time; named spots keep the existing scene movement and spread. */
  private feet(shot: ShotSpec, def: SetDef, a: ActorSpec, t: number) {
    return actorPosition(shot, def.spots, def.walkways, a, t);
  }

  update(shot: ShotSpec, t: number, cam: THREE.PerspectiveCamera): THREE.Vector3 {
    const def = SETS[shot.set], L = LIGHTS[shot.light];
    const K: WorldLook = { ...LOOK[shot.light], ...def.look };
    // ---- camera ----
    const c = camAt(shot, t, def.views, this.spec.fps, def.spots);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(THREE.MathUtils.degToRad(c.roll));
    cam.fov = c.fov; cam.near = 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const look = V(c.look), dist = cam.position.distanceTo(look);
    cam.layers.enable(NOINK); // sky, clouds and sun sprites live on the no-ink layer but are still rendered
    for (const [id, g] of this.sets) g.visible = id === shot.set;
    for (const [s, g] of this.dressing) g.visible = s === shot.set;
    // ---- light rig: camera-relative sun frozen per shot, two-tone uniforms, shadow fit ----
    const sunDir = this.shotSun(shot, def);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (shot.light === "golden") Rr = Math.max(Rr, 30); // el 7: 2 m cards throw ~16 m shadows
    this.sun.position.copy(look).addScaledVector(sunDir, 220); this.sun.target.position.copy(look);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    this.fill.intensity = 0; // not used by the two-tone shading
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog (colour = horizon colour), sun disc + halo, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    this.sky.visible = def.sky;
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    const layout = shotSky(shot, cam, sunDir);
    const showSun = def.sky && (shot.sky?.sun ?? (shot.light === "golden"));
    this.sunDisc.visible = showSun;
    this.sunHalo.visible = showSun && shot.light === "golden";
    if (showSun) {
      if (shot.sky?.sun) this.sunDisc.position.copy(layout.sun);
      else this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.visible = def.sky;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[shot.light][i % 4];
    }
    this.extraClouds.forEach((m, i) => {
      const cloud = layout.clouds[i];
      m.visible = def.sky && !!cloud;
      if (!cloud) return;
      m.position.copy(cloud.position); m.quaternion.copy(cam.quaternion);
      m.scale.set(cloud.width, cloud.height, 1);
      (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[shot.light][i % 4];
    });
    // ---- cast: one card per actor, posed by its action, plus contact blobs ----
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const places: Place[] = [], fxp: FxPlace[] = [];
    const ids = Object.keys(this.spec.cast);
    let focus = look;
    const hands: Record<string, { feet: THREE.Vector3; sc: number; head: THREE.Vector3 }> = {};
    for (const a of shot.actors) {
      const ch = this.spec.cast[a.who], seed = ids.indexOf(a.who) + 1, ts = t - shot.start;
      const { p, dir } = this.feet(shot, def, a, t);
      const moving = dir.lengthSq() > 1e-6, mirror = moving && dir.dot(right) < 0;
      const pose = poseAt(a.action, ts, seed, a.cue !== undefined ? a.cue - shot.start : Infinity);
      if (a.hold) pose.hand = { ...a.hold, ...pose.hand }; // held props, unless the action holds something there
      const ex = (a.expr ?? []).filter(([te]) => te <= t).pop();
      const fo: FrontOpts = { ...pose, expr: ex ? ex[1] : pose.expr, blink: blinkAt(seed, t, this.spec.fps),
        facing: a.facing ?? (moving ? 1 : 0), light: light2D(sunDir, right, mirror), seed };
      const sc = ch.scale ?? 1, roll = pose.roll ?? 0;
      const [w, h, k] = tier(cam.position.distanceTo(this.v.set(p.x, p.y + 1.2 * sc, p.z)) / sc);
      const { roll: _r, impact: _i, ...drawn } = fo;
      places.push({ key: `F|${ch.id}|${fkey(drawn)}`, draw: (pen) => drawChar(pen, ch, drawn), x: p.x, y: p.y, z: p.z, mirror, scale: sc, roll, size: [w, h, k] });
      hands[a.who] = { feet: p.clone(), sc, head: p.clone().addScaledVector(right, -Math.sin(THREE.MathUtils.degToRad(roll)) * 1.7 * sc).setY(p.y + Math.cos(THREE.MathUtils.degToRad(roll)) * 1.7 * sc) };
      if (pose.impact !== undefined) { // a fall lands: a dust puff along the body, then stars circling the head
        const im = pose.impact, mid = p.clone().addScaledVector(right, -0.9 * sc);
        if (im < 0.7) fxp.push({ key: `puff|${q(im / 0.7, 20)}`, cw: 300, ch: 300, draw: (pen) => fxPuff(pen, im / 0.7), x: mid.x, y: p.y + 0.35 * sc, z: mid.z, w: 2.2 * sc, h: 2.2 * sc, soft: true });
        if (im > 0.2) fxp.push({ key: `stars|${q((im * 0.8) % 1, 24)}`, cw: 420, ch: 210, draw: (pen) => fxStars(pen, (im * 0.8) % 1), x: hands[a.who].head.x, y: hands[a.who].head.y + 0.55 * sc, z: hands[a.who].head.z, w: 1.1 * sc, h: 0.55 * sc });
      }
      if (fo.mode === "stand" || fo.mode === "stroll" || fo.mode === "march") blob(fxp, sunDir, shot.light, p.x, p.y, p.z);
      if (shot.focus === a.who) focus = p.clone().setY(p.y + EYE * sc);
    }
    for (const th of shot.throws ?? []) { // a visible stone: hand -> forehead on an arc, with a trail; a burst on the hit
      const A = hands[th.from], B = hands[th.to];
      if (!A || !B || t < th.start || t > th.end + 0.4) continue;
      const from = A.feet.clone().addScaledVector(right, -0.4 * A.sc).setY(A.feet.y + 2.1 * A.sc)  /* the sling hand (screen-left, raised) */, to = B.head.clone().setY(B.head.y - 0.05 * B.sc);
      const at = (u: number) => from.clone().lerp(to, u).setY(from.y + (to.y - from.y) * u + 0.6 * 4 * u * (1 - u));
      const u = (t - th.start) / (th.end - th.start);
      if (u <= 1) {
        for (let k2 = 3; k2 >= 1; k2--) {
          const pk = at(Math.max(0, u - 0.07 * k2)), al = (0.45 - 0.12 * k2).toFixed(2);
          fxp.push({ key: `trail|${al}`, cw: 128, ch: 128, draw: (pen: Pen) => pen.ell(64, 64, 40, 34, `rgba(120,116,110,${al})`, 0), x: pk.x, y: pk.y, z: pk.z, w: 0.24, h: 0.24, soft: true });
        }
        const ps = at(u);
        fxp.push({ key: "stone", cw: 128, ch: 128, draw: (pen: Pen) => { pen.ell(64, 64, 40, 34, "#8f8b84", 9); pen.ell(52, 54, 12, 9, "#b9b5ae", 0); }, x: ps.x, y: ps.y, z: ps.z, w: 0.3, h: 0.3 });
      } else {
        const hb = (t - th.end) / 0.4;
        fxp.push({ key: `hit|${q(hb, 20)}`, cw: 500, ch: 500, draw: (pen: Pen) => fxBurst(pen, hb), x: to.x, y: to.y, z: to.z, w: 1.2 * B.sc, h: 1.2 * B.sc });
      }
    }
    if (shot.focus && shot.focus in def.spots) focus = V(def.spots[shot.focus]).setY(def.spots[shot.focus][1] + EYE);
    // ---- placement (frustum-culled), then one pool flush ----
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of places) {
      const sc = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc, p.z), 3.5 * sc))) continue;
      const a = this.actor(ai++), [w, h, k] = p.size!;
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      // roll: a fall about the feet; lift the card by its half-thickness as it tips, so a body lying down rests on the ground
      a.mesh.position.set(p.x, p.y + Math.sin(THREE.MathUtils.degToRad(p.roll ?? 0)) * 0.32 * sc, p.z);
      a.mesh.rotation.set(0, Math.atan2(cam.position.x - p.x, cam.position.z - p.z), THREE.MathUtils.degToRad(p.roll ?? 0));
      a.mesh.scale.set(p.mirror ? -sc : sc, sc, sc);
      a.mesh.castShadow = L.actorShadow; // day: soft contact blobs instead
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of fxp) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e = this.fx(fi++);
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.use(!!p.soft);
      e.mesh.visible = true;
      e.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e.mesh.quaternion.copy(cam.quaternion); e.mesh.rotateZ(p.rot ?? 0); }
      e.mesh.scale.set(p.w, p.h, 1);
      fused.push(e);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e of fused) e.bind();
    return focus;
  }
}
