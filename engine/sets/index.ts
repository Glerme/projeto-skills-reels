import { SET_IDS, type SetId } from "./anchors";
import type { SetDef } from "./types";
import { palco } from "./palco";
import { rua } from "./rua";

/** sets not built yet: their SetDef throws on build (later tasks replace them and drop them from this list) */
export const PENDING: SetId[] = ["casa", "escritorio", "laboratorio", "natureza"];
const pending = (id: SetId): SetDef => ({
  id, sky: true, views: {}, spots: {},
  build() { throw new Error(`cenário ainda não implementado: ${id}`); },
});

const BUILT: Partial<Record<SetId, SetDef>> = { palco, rua };
export const SETS = Object.fromEntries(SET_IDS.map((id) => [id, BUILT[id] ?? pending(id)])) as Record<SetId, SetDef>;
