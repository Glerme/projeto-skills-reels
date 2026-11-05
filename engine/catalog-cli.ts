import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { catalogSheets, catalogSpec } from "./catalog";
import { loadCharacters } from "./cast/load-chars";
import { loadLocalKit } from "./kit-node";

const root = resolve(process.argv[2] ?? ".");
const kit = await loadLocalKit(`${root}/kit/kenney`);
for (const sheet of catalogSheets(loadCharacters(`${root}/kit/characters`))) {
  const dir = `${root}/videos/_catalogo-${sheet.name}`;
  mkdirSync(dir, { recursive: true });
  const spec = catalogSpec(sheet.items, kit);
  writeFileSync(`${dir}/video.json`, JSON.stringify(spec, null, 2));
  // mk-test-video supplies the ordinary template; this fragment enables only catalog pages.
  writeFileSync(`${dir}/catalog-script.html`, `<script type="application/json" id="catalog-spec">${JSON.stringify(sheet.items).replaceAll("<", "\\u003c")}</script>`);
  writeFileSync(`${dir}/frames.tsv`, sheet.items.map((item, i) => `${i}\t${i * 2 + 1}\t${item.name}`).join("\n") + "\n");
  console.log(sheet.name);
}
