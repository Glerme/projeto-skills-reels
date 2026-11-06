// Low-poly props the CC0 packs lack, built from primitives (flat colours, metres, centred on x/z, standing on y = 0).
// uso: node scripts/mk-props.mjs <pasta-saída>   depois: zip os .glb e scripts/import-assets.sh <zip> prop
import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

// GLTFExporter reads its Blobs through FileReader, which Node does not have (same shim as obj2glb.mjs).
globalThis.FileReader ??= class {
  readAsArrayBuffer(b) { b.arrayBuffer().then((r) => { this.result = r; this.onloadend?.(); }); }
};

const mat = (c) => new THREE.MeshStandardMaterial({ color: c, flatShading: true });
const WOOD = mat("#9a6a3e"), WOOD_D = mat("#6e4a2a"), ROPE = mat("#cdb07a"), STEEL = mat("#8e979f"), IRON = mat("#33363c");
const mesh = (g, m, [x, y, z] = [0, 0, 0], [rx, ry, rz] = [0, 0, 0]) => {
  const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o;
};

const props = {
  // six logs side by side along x, two cross logs and rope ties on top: 2.4 x 1.8 m
  jangada() {
    const g = new THREE.Group(), r = 0.15;
    for (let i = 0; i < 6; i++) {
      const z = -0.75 + i * 0.3, len = 2.4 - (i % 2) * 0.12;
      g.add(mesh(new THREE.CylinderGeometry(r, r, len, 8), i % 2 ? WOOD_D : WOOD, [0, r, z], [0, 0, Math.PI / 2]));
    }
    for (const x of [-0.85, 0.85]) {
      g.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.9, 7), WOOD_D, [x, 2 * r + 0.07, 0], [Math.PI / 2, 0, 0]));
      g.add(mesh(new THREE.BoxGeometry(0.06, 0.08, 1.85), ROPE, [x + 0.12, 2 * r + 0.02, 0]));
    }
    return g;
  },
  // flat steel plate 2 x 1.2 m, 6 cm thick, with a few rivets so it reads as metal
  chapa() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(2, 0.06, 1.2), STEEL, [0, 0.03, 0]));
    for (const x of [-0.9, 0, 0.9]) for (const z of [-0.5, 0.5]) g.add(mesh(new THREE.SphereGeometry(0.035, 6, 4), IRON, [x, 0.06, z]));
    return g;
  },
  // iron barrel on a wooden carriage with two wheels; muzzle points to +x
  canhao() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(1.0, 0.28, 0.6), WOOD, [-0.1, 0.42, 0]));
    for (const z of [-0.36, 0.36]) {
      g.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 12), WOOD_D, [-0.1, 0.3, z], [Math.PI / 2, 0, 0]));
      g.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 8), IRON, [-0.1, 0.3, z], [Math.PI / 2, 0, 0]));
    }
    g.add(mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.3, 12), IRON, [0.2, 0.72, 0], [0, 0, -Math.PI / 2 + 0.12]));
    g.add(mesh(new THREE.TorusGeometry(0.15, 0.04, 6, 12), IRON, [0.84, 0.8, 0], [0, Math.PI / 2, 0]));
    g.add(mesh(new THREE.SphereGeometry(0.2, 10, 8), IRON, [-0.45, 0.68, 0]));
    return g;
  },
};

const out = process.argv[2];
if (!out) { console.error("uso: node scripts/mk-props.mjs <pasta-saída>"); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
for (const [name, make] of Object.entries(props)) {
  const obj = make(), box = new THREE.Box3().setFromObject(obj), mid = box.getCenter(new THREE.Vector3());
  obj.children.forEach((c) => c.position.sub(new THREE.Vector3(mid.x, box.min.y, mid.z)));
  const glb = await new GLTFExporter().parseAsync(obj, { binary: true });
  fs.writeFileSync(path.join(out, name + ".glb"), Buffer.from(glb));
  const s = box.getSize(new THREE.Vector3());
  console.log(`ok ${name} ${s.x.toFixed(2)} x ${s.y.toFixed(2)} x ${s.z.toFixed(2)} m`);
}
