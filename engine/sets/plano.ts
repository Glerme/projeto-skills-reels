import type { SetDef } from "./types";

/** Illustration plane: front-facing views, no floor or scenery. */
export const plano: SetDef = {
  id: "plano", sky: false, walkways: {}, blocked: () => [], build() {},
  spots: { centro: [0, 0, 0], esquerda: [-1.6, 0, 0], direita: [1.6, 0, 0], fundo: [0, 0, 0] },
  views: Object.fromEntries([["aberto", 12], ["medio", 8], ["close", 4], ["baixo", 8]].map(([name, dist]) =>
    [name, { pos: [0, 1.35, Number(dist)], look: [0, 1.35, 0], fov: 34, roll: 0 }])),
};
