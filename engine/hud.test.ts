import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { drawHud, projectHud, validateHud, hudEntry, type HudSpec } from "./hud";
import { validateSpec } from "./spec";
import { readFileSync } from "node:fs";
const fixture = () => JSON.parse(readFileSync("videos/_teste-hud/video.json", "utf8"));
test("HUD fixture and every element validate; malformed input never throws", () => {
  assert.deepEqual(validateHud(fixture().shots[0].hud,0,8,1), []);
  assert.equal(validateSpec(fixture()).ok, true);
  for (const v of [null, {}, [null], [{kind:'seta',start:0,end:2,anchor:null}], [{kind:'progresso',start:0,end:2,position:[0,0],colors:['red']} ] ] ) {
    assert.ok(validateHud(v,0,8,1).length);
  }
  for (const patch of [{start:-1}, {end:9}, {size:[1,0,1]}, {anchor:{point:[0,1,0],mover:2}}, {anchor:{point:[0,NaN,0]}}]) {
    assert.ok(validateHud([{...fixture().shots[0].hud[0],...patch}],0,8,1).length);
  }
});
test("projection follows camera and rejects points behind it; entry is bounded and seekable", () => {
  const cam = new THREE.PerspectiveCamera(40,9/16,0.2,100); cam.position.z=10; cam.lookAt(0,0,0); cam.updateMatrixWorld();
  assert.deepEqual(projectHud(new THREE.Vector3(),cam),[540,960]);
  assert.equal(projectHud(new THREE.Vector3(0,0,20),cam),null);
  cam.position.x=1; cam.updateMatrixWorld(); assert.notDeepEqual(projectHud(new THREE.Vector3(),cam),[540,960]);
  const h = fixture().shots[0].hud[0]; assert.deepEqual([-1,0,0.125,1,8].map(t=>hudEntry(h,t)),[0,0,0.5,1,0]);
});
test("all HUD drawing branches are deterministic across out-of-order seeks", () => {
  const commands: string[] = [];
  const ctx = new Proxy({canvas:{width:1080,height:1920}}, {get(target,key) { return key in target ? (target as any)[key] : (...args: any[]) => commands.push(JSON.stringify([key,...args])); }, set(){return true;}}) as unknown as CanvasRenderingContext2D;
  const cam = new THREE.PerspectiveCamera(40,9/16,0.2,100); cam.position.z=10; cam.updateMatrixWorld();
  const hud: HudSpec[] = fixture().shots[0].hud;
  const draw = (t:number) => {commands.length=0; drawHud(ctx,hud,t,cam,(a,off=[0,0,0])=> new THREE.Vector3(...a.point).add(new THREE.Vector3(...off))); return [...commands];};
  const a=draw(2); draw(6); assert.deepEqual(draw(2),a); assert.ok(a.some(c=>c.includes('strokeRect')));
});

test("top captions preserve framing checks and reject overlap with the reserved top band", async () => {
  const { speakerFraming } = await import("./framing");
  const { SETS } = await import("./sets/index");
  const s = JSON.parse(readFileSync("engine/fixtures/two-shots.json", "utf8"));
  const shot = s.shots[0];
  assert.equal(speakerFraming(shot, SETS[shot.set as keyof typeof SETS], shot.actors[0], s.cast), undefined);
  shot.cam = {recipe:"keys", keys:[{t:shot.start, on:[0,0,0],dist:6,h:1,aim:0}]};
  assert.equal(typeof speakerFraming(shot, SETS[shot.set as keyof typeof SETS], shot.actors[0], s.cast, "topo-caixa"), "number");
  s.captionStyle = 'bad'; assert.equal(validateSpec(s).ok, false);
});

test("mover-local anchors follow the actual object transform and missing models stay hidden", async () => {
  const previous = globalThis.document;
  globalThis.document = {createElement: () => ({})} as unknown as Document;
  const { Stage } = await import("./stage");
  globalThis.document = previous;
  const stage = Object.create(Stage.prototype) as InstanceType<typeof Stage>;
  const shot = fixture().shots[0];
  const group = new THREE.Group(); group.position.set(2,3,4); group.rotation.y=Math.PI/2;
  (stage as any).movers = new Map([[shot,[group,null]]]);
  const point = stage.hudPoint(shot,{point:[1,0,0],mover:0})!;
  assert.ok(point.distanceTo(new THREE.Vector3(2,3,3)) < 1e-10);
  assert.deepEqual(stage.hudPoint(shot,{point:[1,2,3]})!.toArray(),[1,2,3]);
  assert.equal(stage.hudPoint(shot,{point:[0,0,0],mover:1}),null);
});
