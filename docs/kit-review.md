# Revisão do kit (Tarefa 9)

Folha do kit: `docs/kit/kit-v1.jpg`. Ela tem os 6 cenários, a luz de dia e a de fim de tarde nos cenários externos, e
os 8 personagens juntos no palco.

## Como foi avaliado

Comparei o kit lado a lado com frames da referência (`claude-animated-shorts/references/frames`), usando
`sbs_sheet.py`. Também medi a luminosidade (luma) de cada still.

O plano pedia um verificador Opus separado. Os disparos de subagente foram bloqueados pelo modo automático, então eu
mesmo fiz a avaliação. Isso vale menos do que um olhar de fora.

## Notas (de 0 a 10)

| Área | Início | Agora | Meta (final da ponte) |
|---|---|---|---|
| Cor de dia | 5 | 6 | 7 |
| Fim de tarde | 5 | 6 | 5–6 |
| Iluminação | 4 | 5 | 5–6 |
| Contorno | 6 | 6 | 6 |
| Texturas | 4 | 5 | 5–6 |
| Personagens | 7 | 7 | 7 |
| Profundidade | 6 | 6 | 6–7 |
| Composição | 4 | 5 | 6–7 |

Luminosidade mediana (referência: cerca de 0,57 de dia):

| Cenário | Mediana |
|---|---|
| Palco | 0,59 |
| Rua | 0,55 |
| Natureza | 0,61 |
| Casa | 0,70 |
| Escritório | 0,73 |
| Laboratório | 0,73 |

O p5 fora do contorno fica entre 0,18 e 0,50, ou seja, sem pretos esmagados.

## O que mudou nesta rodada

- **Cômodos:** o plano aberto ficou mais fechado (fov 64 → 54) e os pontos laterais foram para ±0,95, então os
  personagens ocupam mais o quadro.
- **Peças novas do kit em `room.ts`:**
  - `picture()`: quadro pintado com arte abstrata;
  - `pendant()`: luminária pendente com lâmpada que brilha.
- **Decoração:** a casa, o escritório e o laboratório ganharam quadros, luminárias, mural de recados, planta e
  armários.
- **Chão:** o piso do palco e a cerâmica ficaram mais escuros, para a imagem não ficar lavada.
- **Paredes e teto:** as paredes dos interiores ficaram em tons médios e o teto passou a ser 82 % da cor da parede.

## O que ainda falta para chegar na referência

1. **Composição.** A referência é bem mais cheia: muitos objetos no quadro, planos médios e closes dominando.
   - Isso é, em parte, trabalho de cada vídeo: escolher a câmera e os objetos da cena.
   - O kit ainda tem poucos objetos de cena.
2. **Cor.** A referência usa cores mais profundas e saturadas, com contraste de luz. Os interiores ainda estão claros
   demais (mediana 0,70–0,73).
3. **Texturas.** Paredes lisas, sem pintura à mão como na referência.

## Primeiro vídeo: Davi e Golias (Tarefa 16)

Roteiro aprovado. Render de 63,7 s em cerca de 58 s; QA limpo (−14,3 LUFS).

O que o fluxo deixou a desejar e foi corrigido no caminho:

- **Escala de personagem.** Não existia, e um gigante não tinha como ser maior. Entrou `scale` (0,5–2) no CharDef.
  `kit/characters/gigante.json` é a peça nova do acervo.
- **Tempos de `expr`.** São absolutos do vídeo, e a skill não dizia isso (eu usei 0 como início da cena). O
  `cenas.md` foi corrigido.
- **Spots laterais da natureza.** Em ±1,6 eles saíam do quadro vertical, principalmente com `push`. Agora estão em
  ±1,1.
- **Personagem baixo no close.** Davi como `kid` ficava com o rosto embaixo da legenda. A saída foi usar `slim` com
  escala 0,9 e trocar os closes de Davi por `medio` + `push`.
  - Regra para a skill: close só para personagem de altura adulta.
- **QA.** Ele apontava as tremidas (kicks) como "pulos". Agora as tremidas contam como mudança planejada.

Limites que ficam:

- Não há cenário nem figurino de época: o vale é o cenário de natureza, e as túnicas são roupas do kit.
- Não há animação da pedra voando: o corte, o som e a tremida fazem esse papel.
- O close da armadura (cena 5) fica abstrato.
- A luz de fim de tarde na natureza fica azulada.
