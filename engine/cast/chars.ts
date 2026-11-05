// Browser-side: draw a CharDef on a Pen. (No fs here; see load-chars.ts for the node loader.)
import { bodyFront, SKINS, type Pen, type FrontOpts } from "../style/toon";
import type { CharDef } from "../spec";

export function drawChar(p: Pen, c: CharDef, pose: FrontOpts): void {
  const ink = p.ink;
  p.ink = c.outfit.ink ?? ink;
  try {
    bodyFront(p, { ...c.outfit, build: c.build, skin: c.outfit.skin ?? SKINS[c.skin % SKINS.length] }, pose);
  } finally { p.ink = ink; }
}
