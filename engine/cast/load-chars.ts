// Node-only (tests). Reads every kit/characters/*.json into a cast record.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CharDef } from "../spec";

export function loadCharacters(dir: string): Record<string, CharDef> {
  const out: Record<string, CharDef> = {};
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".json")).sort()) {
    const c = JSON.parse(readFileSync(join(dir, f), "utf8")) as CharDef;
    out[c.id] = c;
  }
  return out;
}
