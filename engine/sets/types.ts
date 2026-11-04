import type * as THREE from "three";
import type { SetId } from "./anchors";
import type { Cam, V3 } from "../camera";
import type { Kit } from "../style/build";
import type { WorldLook } from "../style/lights";

/** a place: named camera views and actor spots, plus the geometry built once into its own group */
export type SetDef = {
  id: SetId; sky: boolean; views: Record<string, Cam>; spots: Record<string, V3>;
  build(root: THREE.Group, kit: Kit): void; look?: Partial<WorldLook>;
};
