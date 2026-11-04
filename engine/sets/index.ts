import { SET_IDS, type SetId } from "./anchors";
import type { SetDef } from "./types";
import { palco } from "./palco";
import { rua } from "./rua";
import { casa } from "./casa";
import { escritorio } from "./escritorio";

/** sets not built yet: their SetDef throws on build (later tasks replace them and drop them from this list) */
export const PENDING: SetId[] = ["laboratorio", "natureza"];
const pending = (id: SetId): SetDef => ({
  id, sky: true, views: {}, spots: {},
  build() { throw new Error(`cenário ainda não implementado: ${id}`); },
});

const BUILT: Partial<Record<SetId, SetDef>> = { palco, rua, casa, escritorio };
export const SETS = Object.fromEntries(SET_IDS.map((id) => [id, BUILT[id] ?? pending(id)])) as Record<SetId, SetDef>;
