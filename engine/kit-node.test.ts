import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as THREE from "three";
import { loadLocalKit } from "./kit-node";

test("local kit loads GLB geometry and node transforms, skips image decoding and absent models", async () => {
  const directory = await mkdtemp(join(tmpdir(), "shorts-kit-"));
  try {
    const data = Buffer.from(new Float32Array([0, 0, 0, 2, 0, 0, 0, 4, 6]).buffer);
    const json = Buffer.from(JSON.stringify({ asset: { version: "2.0" }, scene: 0, scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0, translation: [1, 2, 3] }], meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
      buffers: [{ byteLength: data.length }], bufferViews: [{ buffer: 0, byteLength: data.length }],
      accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [2, 4, 6] }],
      materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }], textures: [{ source: 0 }], images: [{ uri: "absent.png" }],
    }));
    const size = Math.ceil(json.length / 4) * 4;
    const glb = Buffer.alloc(28 + size + data.length, 0x20);
    glb.writeUInt32LE(0x46546c67, 0); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8);
    glb.writeUInt32LE(size, 12); glb.writeUInt32LE(0x4e4f534a, 16); json.copy(glb, 20);
    glb.writeUInt32LE(data.length, 20 + size); glb.writeUInt32LE(0x004e4942, 24 + size); data.copy(glb, 28 + size);
    await writeFile(join(directory, "car-sedan.glb"), glb);
    await writeFile(join(directory, "car-suv.glb"), "invalid");
    const kit = await loadLocalKit(directory);
    assert.deepEqual(Object.keys(kit), ["car-sedan"]);
    const box = new THREE.Box3().setFromObject(kit["car-sedan"]);
    assert.deepEqual(box.min.toArray(), [1, 2, 3]);
    assert.deepEqual(box.max.toArray(), [3, 6, 9]);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
