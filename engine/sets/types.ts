import type { GroundRect, Walkway } from "../space";
import type * as THREE from "three";
import type { SetId } from "./anchors";
import type { Cam, V3 } from "../camera";
import type { Kit } from "../style/build";
import type { WorldLook } from "../style/lights";

/** a place: named camera views and actor spots, plus the geometry built once into its own group */
export type SetDef = {
  id: SetId; sky: boolean; views: Record<string, Cam>; spots: Record<string, V3>;
  blocked(kit: Kit): GroundRect[]; walkways: Record<string, Walkway>;
  build(root: THREE.Group, kit: Kit): void; look?: Partial<WorldLook>;
  /** sun azimuth (deg, from the view direction toward screen right) instead of the light preset's: interiors light
   *  the camera-facing walls from the camera side (the presets backlight them) */
  sunAz?: number;
};
