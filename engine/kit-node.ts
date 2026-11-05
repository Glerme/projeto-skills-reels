// The same GLTFLoader and kit loading policy as the browser; validation needs geometry, not image decoding.
import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { readKit } from "./kit";

export const loadLocalKit = (directory: string | URL = new URL("../kit/kenney/", import.meta.url)) => readKit(async (name) => {
  const bytes = await readFile(directory instanceof URL ? new URL(`${name}.glb`, directory) : `${directory}/${name}.glb`);
  if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2) throw new Error(`GLB inválido: ${name}`);
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  const binStart = 20 + jsonLength;
  const binary = bytes.subarray(binStart + 8, binStart + 8 + bytes.readUInt32LE(binStart));

  delete gltf.images; delete gltf.textures; delete gltf.materials;
  for (const mesh of gltf.meshes ?? []) for (const primitive of mesh.primitives) delete primitive.material;
  const json = Buffer.from(JSON.stringify(gltf));
  const paddedLength = Math.ceil(json.length / 4) * 4;
  const glb = Buffer.alloc(20 + paddedLength + 8 + binary.length, 0x20);
  glb.writeUInt32LE(0x46546c67, 0); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(paddedLength, 12); glb.writeUInt32LE(0x4e4f534a, 16); json.copy(glb, 20);
  glb.writeUInt32LE(binary.length, 20 + paddedLength); glb.writeUInt32LE(0x004e4942, 24 + paddedLength);
  binary.copy(glb, 28 + paddedLength);
  return (await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), "")).scene;
});
