import { SET_IDS, type SetId } from "./anchors";
import type { SetDef } from "./types";
import { palco } from "./palco";

/** sets not built yet: their SetDef throws on build (later tasks replace them and drop them from this list) */
export const PENDING: SetId[] = ["rua", "casa", "escritorio", "laboratorio", "natureza"];
const pending = (id: SetId): SetDef => ({
  id, sky: true, views: {}, spots: {},
  build() { throw new Error(`cenário ainda não implementado: ${id}`); },
});

export const SETS = Object.fromEntries(SET_IDS.map((id) => [id, id === "palco" ? palco : pending(id)])) as Record<SetId, SetDef>;
