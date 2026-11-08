# Pedido: logo do perfil "Objetologia"

Faça a logo do perfil **Objetologia** (shorts que explicam como funcionam os objetos do dia a dia).
O símbolo é uma **lâmpada**, no mesmo estilo 2D dos nossos vídeos explicadores
(leia `~/.claude/skills/explicador-2d/references/estilo.md`: paleta, sombra, cantos arredondados).

## Estilo (obrigatório)
- Desenho vetorial chapado, limpo, SEM contorno preto grosso; leve sombra e um brilho, como as peças dos vídeos.
- Fundo: gradiente radial `#1f2c5c` → `#141d42` → `#0b112a`.
- Vidro da lâmpada em amarelo-ouro `#f5b82e` (acesa) ou claro; rosca e base metálicas `#c9d1e3`, sombra `#8f9ab5`, borda `#5b6688`.
- Detalhes possíveis: filamento visível, raios de luz curtos, um parafuso ou uma engrenagem pequena dentro do vidro
  (lembra "por dentro dos objetos"). Simples: tem de ser legível a 110 px (foto de perfil do TikTok/Instagram).
- Sem texto dentro do símbolo. Nada copiado de outro canal ou marca.

## O que entregar (em `marca/objetologia/`)
1. Quatro variações do símbolo, cada uma em SVG 1080×1080 (`logo-a.svg` … `logo-d.svg`), diferentes entre si, por ex.:
   a) lâmpada acesa com raios; b) lâmpada com engrenagem no lugar do filamento;
   c) lâmpada em "vista explodida" (vidro, filamento e rosca um pouco separados); d) a sua melhor ideia.
2. Uma versão com o nome, 1080×1080 (`logo-<melhor>-nome.svg`): símbolo em cima, "OBJETOLOGIA" embaixo em caixa
   alta, peso 800, `letter-spacing: .12em`, branco `#e8ecf5`. Use uma fonte do sistema (ex.: sans-serif); não baixe fonte.
3. PNG de cada SVG com `rsvg-convert -w 1080 <svg> -o <png>`.
4. Uma folha de comparação `folha.png` com as quatro lado a lado (`magick montage` ou `convert +append`), e também
   cada símbolo reduzido para 110 px numa segunda linha, para ver a leitura em tamanho de perfil.
5. Os símbolos devem caber num círculo (o TikTok e o Instagram cortam a foto de perfil em círculo): deixe margem.

Não mexa em nada fora de `marca/objetologia/`. Não faça commit.
Última mensagem: uma linha por variação (o que ela mostra) e qual você recomenda.
