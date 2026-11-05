export const SET_IDS = ["palco", "rua", "paris", "casa", "escritorio", "laboratorio", "natureza", "vale"] as const;
export type SetId = (typeof SET_IDS)[number];

const spots = ["centro", "esquerda", "direita", "fundo"];
const views = ["aberto", "medio", "close", "baixo"];

export const ANCHORS: Record<SetId, { spots: string[]; views: string[] }> = {
  palco: { spots, views },
  rua: { spots: [...spots, "esquina"], views: [...views, "aereo"] },
  paris: { spots: [...spots, "esquina"], views: [...views, "aereo"] },
  casa: { spots, views },
  escritorio: { spots, views },
  laboratorio: { spots, views },
  natureza: { spots, views },
  vale: { spots: [...spots, "riacho", "duelo_a", "duelo_b"], views: [...views, "duelo", "riacho", "queda"] },
};

export const SKY_SETS: readonly SetId[] = ["palco", "rua", "paris", "natureza", "vale"];
