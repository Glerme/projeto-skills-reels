# Kit: personagens e cenários reutilizáveis

## Personagens (`kit/characters/<id>.json`)

O acervo atual tem 11 personagens (os 8 abaixo, mais `gigante`, `estudante` e `pirata`): `homem`, `mulher`, `crianca`, `idoso`, `cientista`, `executivo`, `operario` e
`medico`.

Formato: `{ "id", "label", "build": "adult|stout|kid|elder|slim", "outfit": {...}, "skin": 0-3 }`.

O `outfit` usa os campos de `engine/style/toon.ts` (`Outfit`). A lista completa, incluindo as peças de época, está
em `briefing-visual.md`. `scale` (0,5–2) muda o tamanho, por exemplo de um gigante.

**Antes de montar o elenco:** o visual de cada personagem vem do briefing visual confirmado (`briefing-visual.md`).
Não escolha roupa, cabelo ou acessório sem essa confirmação.

O `cientista` segue o mockup confirmado: cabelo bagunçado, óculos, jaleco longo, camisa escura e três canetas visíveis no bolso (azul, vermelha e laranja).
Use `neutral`, `shock`, `thoughtful` (olhar de lado), `smile_closed`, `skeptical` (uma sobrancelha) ou
`excited` (olhos de estrela) em `actors[].expr`. As peças são opcionais; veja `briefing-visual.md`.

A `estudante` (15–20 anos, rabo de cavalo castanho, fone grande na cabeça, moletom terracota, jeans e tênis branco) é a
Nina da série `e-se-super-audicao`: o fone é a marca dela, presente em todas as partes.

**Personagem novo:**
1. Copie o mais parecido.
2. Mude as cores e os acessórios.
3. Salve com um id genérico (`bombeiro`, `chef`), nunca com o nome do vídeo.

**Regras de cor:** cores médias e apagadas; nunca amarelo-limão nem lavanda.

**Para a peça entrar no acervo:** ela precisa servir para outro assunto. Um "chef" serve; o "chef Antoine de 1890" é
só deste vídeo, então use um chef do acervo no `cast` e mude só a expressão e a ação.

## Cenários (`engine/sets/<id>.ts`)

Cada cenário é um `SetDef`:
- `{ id, sky, views, spots, blocked(kit), walkways, build(root, kit), look?, sunAz? }`;
- registrado em `engine/sets/index.ts`;
- com os nomes em `engine/sets/anchors.ts` (o validador usa essa lista).

Para começar um cenário novo:
- **Cômodo:** use `buildRoom` + `block` / `legs4` / `picture` / `pendant` (`room.ts`), `ROOM_VIEWS` / `ROOM_SPOTS` e
  `sunAz: 130`.
- **Externo:** veja `rua.ts` ou `natureza.ts`, com `house()` e `prop()` de `engine/style/build.ts` e os modelos
  Kenney em `kit/kenney/`.

Regras:
- Declare `blocked(kit)`: retângulos `{name, x, z, width, depth, turn}` em metros/graus de todos os sólidos;
  derive da geometria e do kit. Partes do mesmo móvel formam um bloco. Terreno não é obstáculo.
- Declare `walkways`: nome → `{from: [x,y,z], to: [x,y,z], width}`; sem passagem, use `{}`.
  Nas ruas, uma por calçada em cada sentido, pontas fora das views. Não cruze sólidos nem spots com sólidos.
  Percurso fechado pode ter `via` (vértices entre `from` e `to`, que coincidem): anda a 1,2 m/s sem teleporte.
  A reserva de espaço inclui todo o retângulo do percurso. Paris usa isso em `praca_perto`, atrás do apresentador;
  o catálogo desenha todos os trechos. O percurso cabe em `aberto` e `medio`; close prioriza rosto e peito.
- Reaproveite `Layout` (`engine/sets/layout.ts`): o mesmo plano mede e desenha props/prédios, descartando
  peças opcionais que não cabem. `propBounds()` mede também a vegetação cartoon sem criar texturas.
- Em Paris, a praça continua pavimentada até a neblina, no tom da calçada; fachadas, árvores e postes fecham as bordas.
  A torre fica livre, com folga de 0,6 m dos sólidos.
- Enquadre pelas posições/alvos em `views`: `medio` com 35–45% de altura, `aberto`/`baixo` ≥18%,
  `close` ≥65% da silhueta antes do corte (rosto e peito). Pés ou queixo ficam acima de 676 px do fundo.
  O motor desloca o eixo até o spot do apresentador; teste cada cenário/view nos três spots principais.
- Não mude números de `engine/style/` (o visual do perfil mora ali).
- Rode `npm test`: o teste de âncoras exige que spots e views batam com `anchors.ts`.
- Monte um vídeo de teste com `bash scripts/mk-test-video.sh <spec> videos/_teste-x` e confira os stills contra
  `armadilhas.md`.

**Limite por vídeo:** no máximo uma peça nova (personagem ou cenário). Precisar de mais é sinal de que o kit está
pequeno: anote isso para o usuário em vez de construir.

## Modelos (`kit/models.json`)

Só pacotes **CC0** (Kenney, Quaternius), low-poly de cor chapada.
- `scripts/import-assets.sh <zip> <prefixo> [modelo ...]`: importa todos ou só os nomes escolhidos, sem `.glb`.
- Exemplo: `scripts/import-assets.sh ~/Downloads/kenney_car-kit.zip car sedan taxi` registra `car-sedan` e `car-taxi`.
- Os `.glb` ficam em `kit/kenney/` (fora do git); texturas externas viram `Textures/colormap-<prefixo>.png`.
- Recusa sobrescrever `.glb` ou textura diferente; nomes no JSON não se repetem.
- Depois, rode `npm run build` e `npm run validate:build`. Use o nome registrado em `dressing.<setId>[]`.

Pacotes que já estão no kit (todos CC0), para baixar de novo numa máquina nova:
- **Carros** (`car-`): Kenney Car Kit (kenney.nl, download manual). Além de sedan/taxi/van/suv: `car-police`,
  `car-ambulance`, `car-firetruck`, `car-truck`, `car-garbage-truck`, `car-cone`, `car-box`.
- **Barcos** (`water-`): Kenney Watercraft Kit, em opengameart.org/content/watercraft-kit (link direto do zip):
  `water-boat-row-small`, `water-boat-sail-a`, `water-boat-speed-a`, `water-boat-fishing-small`,
  `water-ship-ocean-liner-small`, `water-ship-cargo-a`, `water-buoy`, `water-cargo-container-a`.
- **Móveis** (`furniture-`): Kenney Furniture Kit, em opengameart.org/content/furniture-kit (só OBJ). Mesas
  (`furniture-table`, `-table-round`, `-table-coffee`, `-table-cloth`, `-table-glass`, `-desk`, `-side-table`), cadeiras
  (`-chair`, `-chair-desk`, `-chair-cushion`, `-stool-bar`), cozinha (`-kitchen-fridge`, `-stove`, `-sink`, `-cabinet`),
  sala (`-lounge-sofa`, `-bookcase-open`, `-television-modern`, `-lamp-round-floor`, `-potted-plant`), `-bed-single`,
  `-laptop`, `-computer-screen`, `-radio`, `-speaker`, `-trashcan`, `-cardboard-box-closed`.
- **Avião** (`plane-jetliner`): "Jumbo jet (wide body)", opengameart.org/content/jumbo-jetwide-body (OBJ sem material).
- OBJ vira GLB com `node scripts/obj2glb.mjs <saída> --scale <s> [--color #hex] <arquivos.obj>` (móveis: `--scale 0.21`;
  jato: `--scale 2 --color "#eef0f4"`). O script centraliza o modelo em x/z e o apoia em y = 0 (os pacotes põem a
  origem num canto, e aí o `dx`/`dz` do dressing erra o lugar). Depois zipe os `.glb` e use `import-assets.sh`.
- Fogo, água e ondas não são modelos: são `effects` da cena (`cenas.md`). Veículos andando e aviões voando são `movers`.

- **Peças geradas** (`prop-`): `node scripts/mk-props.mjs <pasta>` gera `prop-jangada`, `prop-chapa` (chapa de aço) e
  `prop-canhao` (boca para +x) com primitivas; zipe e importe com `import-assets.sh <zip> prop`. Para uma peça simples
  que nenhum pacote CC0 tem, acrescente-a ali.
- **Pirata** (`kit/characters/pirata.json`): bandana, barba, faixa e tapa-olho (`eyepatch`).

Catálogo visual: regenere com `bash scripts/catalogo.sh` e veja as folhas em `docs/kit/catalogo/*.jpg`.
