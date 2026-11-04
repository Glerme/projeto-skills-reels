import { SET_IDS, type SetId } from "./anchors";
import type { SetDef } from "./types";
import { palco } from "./palco";
import { rua } from "./rua";
import { casa } from "./casa";
import { escritorio } from "./escritorio";
import { laboratorio } from "./laboratorio";
import { natureza } from "./natureza";

/** sets not built yet: their SetDef throws on build (later tasks replace them and drop them from this list) */
export const PENDING: SetId[] = [];
const pending = (id: SetId): SetDef => ({
  id, sky: true, views: {}, spots: {},
  build() { throw new Error(`cenário ainda não implementado: ${id}`); },
});

const BUILT: Partial<Record<SetId, SetDef>> = { palco, rua, casa, escritorio, laboratorio, natureza };
export const SETS = Object.fromEntries(SET_IDS.map((id) => [id, BUILT[id] ?? pending(id)])) as Record<SetId, SetDef>;
