// Convert CC0 OBJ(+MTL) models to GLB so scripts/import-assets.sh can register them.
// uso: node scripts/obj2glb.mjs <pasta-saída> [--color #hex] [--scale n] <arquivo.obj> ...
// --color pinta os modelos que vêm sem .mtl (senão ficam com o cinza padrão do OBJLoader).
// --scale leva a unidade do pacote a metros (o dressing usa a altura original do modelo).
import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

// GLTFExporter reads its Blobs through FileReader, which Node does not have.
globalThis.FileReader ??= class {
  readAsArrayBuffer(b) { b.arrayBuffer().then((r) => { this.result = r; this.onloadend?.(); }); }
  readAsDataURL(b) { b.arrayBuffer().then((r) => { this.result = `data:${b.type};base64,` + Buffer.from(r).toString("base64"); this.onloadend?.(); }); }
};

const args = process.argv.slice(2);
const out = args.shift();
let color = null, scale = 1;
while (args[0]?.startsWith("--")) {
  const flag = args.shift(), v = args.shift();
  if (flag === "--color") color = v; else if (flag === "--scale") scale = Number(v); else { console.error("opção desconhecida: " + flag); process.exit(1); }
}
if (!out || !args.length) { console.error("uso: node scripts/obj2glb.mjs <pasta-saída> [--color #hex] [--scale n] <arquivo.obj> ..."); process.exit(1); }
fs.mkdirSync(out, { recursive: true });

for (const file of args) {
  const dir = path.dirname(file), name = path.basename(file, ".obj");
  const text = fs.readFileSync(file, "utf8");
  const loader = new OBJLoader();
  const lib = text.match(/^mtllib\s+(.+)$/m)?.[1].trim();
  const mtlPath = lib && path.join(dir, lib), hasMtl = !!mtlPath && fs.existsSync(mtlPath);
  if (hasMtl) {
    const mats = new MTLLoader().parse(fs.readFileSync(mtlPath, "utf8"), dir + "/");
    mats.preload();
    loader.setMaterials(mats);
  }
  const obj = loader.parse(text);
  obj.traverse((m) => {
    if (!m.isMesh) return;
    const list = Array.isArray(m.material) ? m.material : [m.material];
    // flat colour only: Lambert/Standard with the MTL's diffuse; no textures in these packs
    const conv = list.map((x) => new THREE.MeshStandardMaterial({ name: x.name, color: color && !hasMtl ? new THREE.Color(color) : x.color }));
    m.material = Array.isArray(m.material) ? conv : conv[0];
  });
  // centre on x/z and stand on y = 0: the packs put the origin at a corner, and dressing dx/dz mean the model's centre
  const box = new THREE.Box3().setFromObject(obj), mid = box.getCenter(new THREE.Vector3());
  obj.children.forEach((c) => c.position.sub(new THREE.Vector3(mid.x, box.min.y, mid.z)));
  obj.scale.setScalar(scale);
  const glb = await new GLTFExporter().parseAsync(obj, { binary: true });
  fs.writeFileSync(path.join(out, name + ".glb"), Buffer.from(glb));
  console.log("ok", name);
}
