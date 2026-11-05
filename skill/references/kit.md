# Kit: personagens e cenários reutilizáveis

## Personagens (`kit/characters/<id>.json`)

O acervo atual tem 8 personagens: `homem`, `mulher`, `crianca`, `idoso`, `cientista`, `executivo`, `operario` e
`medico`.

Formato: `{ "id", "label", "build": "adult|stout|kid|elder|slim", "outfit": {...}, "skin": 0-3 }`.

O `outfit` usa os campos de `engine/style/toon.ts` (`Outfit`). A lista completa, incluindo as peças de época, está
em `briefing-visual.md`. `scale` (0,5–2) muda o tamanho, por exemplo de um gigante.

**Antes de montar o elenco:** o visual de cada personagem vem do briefing visual confirmado (`briefing-visual.md`).
Não escolha roupa, cabelo ou acessório sem essa confirmação.

**Personagem novo:**
1. Copie o mais parecido.
2. Mude as cores e os acessórios.
3. Salve com um id genérico (`bombeiro`, `chef`), nunca com o nome do vídeo.

**Regras de cor:** cores médias e apagadas; nunca amarelo-limão nem lavanda.

**Para a peça entrar no acervo:** ela precisa servir para outro assunto. Um "chef" serve; o "chef Antoine de 1890" é
só deste vídeo, então use um chef do acervo no `cast` e mude só a expressão e a ação.

## Cenários (`engine/sets/<id>.ts`)

Cada cenário é um `SetDef`:
- `{ id, sky, views, spots, build(root, kit), look?, sunAz? }`;
- registrado em `engine/sets/index.ts`;
- com os nomes em `engine/sets/anchors.ts` (o validador usa essa lista).

Para começar um cenário novo:
- **Cômodo:** use `buildRoom` + `block` / `legs4` / `picture` / `pendant` (`room.ts`), `ROOM_VIEWS` / `ROOM_SPOTS` e
  `sunAz: 130`.
- **Externo:** veja `rua.ts` ou `natureza.ts`, com `house()` e `prop()` de `engine/style/build.ts` e os modelos
  Kenney em `kit/kenney/`.

Regras:
- Não mude números de `engine/style/` (o visual do perfil mora ali).
- Rode `npm test`: o teste de âncoras exige que spots e views batam com `anchors.ts`.
- Monte um vídeo de teste com `bash scripts/mk-test-video.sh <spec> videos/_teste-x` e confira os stills contra
  `armadilhas.md`.

**Limite por vídeo:** no máximo uma peça nova (personagem ou cenário). Precisar de mais é sinal de que o kit está
pequeno: anote isso para o usuário em vez de construir.
