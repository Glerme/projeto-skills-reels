import { test } from "node:test";
import assert from "node:assert/strict";
import { drawChar } from "./chars";
import { loadCharacters } from "./load-chars";
import { Pen, INK, SKINS, type Expr } from "../style/toon";

function recordingPen() {
  const calls: { method: string; args: any[]; ink: string }[] = [];
  const p = new Pen({} as CanvasRenderingContext2D);
  for (const method of ["poly", "ell", "stroke", "dot", "line", "band", "arc", "shadedFill", "gradFill", "inkRing"] as const) {
    (p[method] as any) = (...args: any[]) => calls.push({ method, args, ink: p.ink });
  }
  p.clip = (_pts, fn) => fn();
  return { p, calls };
}
const cast = loadCharacters("kit/characters");

test("scientist draws optional pieces and all mockup expressions with its palette", () => {
  for (const expr of ["neutral", "shock", "thoughtful", "smile_closed", "skeptical", "excited"] as Expr[]) {
    const { p, calls } = recordingPen();
    drawChar(p, cast.cientista, { mode: "stand", expr });
    assert.equal(p.ink, INK);
    assert.ok(calls.every(c => c.ink === "#1A0F2F"));
    for (const color of ["#F7E4D6", "#FFFFFF", "#2563eb", "#ef4444", "#f97316", "#8B5CF6", "#E5E7EB"])
      assert.ok(calls.some(c => c.args.includes(color)), color);
    if (expr === "excited") assert.equal(calls.filter(c => c.args.includes("#fbbf24")).length, 2);
  }
});

test("optional scientist pieces leave other cast on their existing palette", () => {
  const { p, calls } = recordingPen();
  drawChar(p, cast.homem, { mode: "stand" });
  assert.ok(calls.every(c => c.ink === INK));
  assert.ok(calls.some(c => c.args.includes(SKINS[cast.homem.skin])));
  assert.ok(!calls.some(c => c.args.includes("#8B5CF6")));
});

test("new expressions each draw a distinct face and blink safely", () => {
  const signatures = new Set<string>();
  for (const expr of ["neutral", "thoughtful", "skeptical", "excited"] as Expr[]) {
    const { p, calls } = recordingPen();
    drawChar(p, cast.cientista, { mode: "stand", expr });
    signatures.add(JSON.stringify(calls));
    drawChar(recordingPen().p, cast.cientista, { mode: "stand", expr, blink: true, facing: 1 });
  }
  assert.equal(signatures.size, 4);
});

test("all three scientist pens have exposed coloured strokes without overlapping ink halos", () => {
  const { p, calls } = recordingPen();
  drawChar(p, cast.cientista, { mode: "stand" });
  const pens = ["#2563eb", "#ef4444", "#f97316"].map(color => calls.find(c => c.method === "line" && c.args[1] === color)!);
  const pocket = calls.find(c => c.method === "poly" && c.args[1] === "#FFFFFF" && c.args[0].length > 4 &&
    pens.every(pen => c.args[0].some((pt: number[]) => pt[1] === pen.args[0][0][1])))!;
  assert.ok(pocket);
  for (const pen of pens) {
    assert.equal(pen.args[3], false);
    assert.ok(pen.args[0][1][1] < pen.args[0][0][1]);
  }
  for (let i = 1; i < pens.length; i++) {
    assert.ok(pens[i].args[0][0][0] - pens[i - 1].args[0][0][0] > (pens[i].args[2] + pens[i - 1].args[2]) / 2);
  }
});
