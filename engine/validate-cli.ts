import { loadLocalKit } from "./kit-node";
import { readFileSync } from "node:fs";
import { validateSpec } from "./spec";

let r: ReturnType<typeof validateSpec>;
try { r = validateSpec(JSON.parse(readFileSync(process.argv[2], "utf8")), await loadLocalKit()); }
catch (e) { r = { ok: false, errors: [`não foi possível ler o arquivo: ${(e as Error).message}`] }; }
console.log(r.ok ? "ok" : r.errors.join("\n"));
process.exit(r.ok ? 0 : 1);
