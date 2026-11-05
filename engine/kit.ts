// Kenney models (CC0, kit/kenney/, gitignored) loaded once from assets/kenney/<name>.glb. A missing model is
// skipped: sets that ask for it through kitClone/prop just leave it out.
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type * as THREE from "three";
import type { Kit } from "./style/build";

import models from "../kit/models.json";
export const KENNEY = models;

export const readKit = (load: (name: string) => Promise<THREE.Object3D>): Promise<Kit> =>
  Promise.all(KENNEY.map((n) => load(n).then((s) => [n, s] as const).catch(() => [n, null] as const)))
    .then((list) => Object.fromEntries(list.filter((e) => e[1]).map(([n, s]) => [n, s!])));

let kitP: Promise<Kit> | null = null;
export const loadKit = () => {
  if (!kitP) {
    const loader = new GLTFLoader();
    kitP = readKit(async (name) => (await loader.loadAsync(`assets/kenney/${name}.glb`)).scene);
  }
  return kitP;
};
