# Estilo visual do explicador 2D

Referência: os vídeos do @inventadesdecero (só para comparar, nunca no vídeo). Desenho vetorial chapado, limpo, sem
contorno preto grosso, com leve sombra e brilho. Uma máquina por vez no centro, montada peça por peça.

## Paleta (fixa)

| Uso | Cor |
|---|---|
| fundo (já no template) | gradiente radial `#1f2c5c` → `#141d42` → `#0b112a` |
| chão / estrada / terra | `#2a3566` (estrada), `#5a3a22`→`#3d2716` (terra), faixa tracejada `#e8ecf5` |
| metal, peças claras | `#c9d1e3`, sombra `#8f9ab5`, borda `#5b6688` |
| líquido / ar / água | `#4aa8ff` (água), `#7fb8e8` com pontilhado (ar comprimido) |
| destaque / força / mola | `#f5b82e` (amarelo-ouro) |
| perigo, "SEM FREIO" | `#ff4d4d` |
| ok, "FUNCIONA" | `#2ee6a0` |
| vermelho de veículo | `#ef4b3c`; janelas `#8fd3ff` |
| prédios à noite | `#1a2350` com janelas `#f2c86b` |

## Peças de interface (todas em SVG, desenhadas por nós)

- **Etiqueta**: texto em caixa alta, 26–30 px, peso 800, `letter-spacing: .12em`, numa pílula `#0d1430` com 70% de
  opacidade, cor da etiqueta conforme o sentido (amarelo destaque, vermelho perigo, verde ok, branco neutro).
  Entra com `scale 0.6 → 1` + fade em 0,25 s, no instante da palavra.
- **Linha de chamada**: linha fina branca (2 px) da etiqueta até a peça, desenhada com `strokeDashoffset`.
- **Manômetro**: arco de 240°, ponteiro que gira; arco verde quando cheio, vermelho quando vazio; "PRESSÃO" embaixo.
- **Seta de fluxo**: seta amarela que desliza na direção do empurrão.
- **Ícone de ideia**: círculo amarelo com "IDEIA" que dá um pop quando o roteiro vira a ideia ("Então você…").
- **Lista final de verbos**: caixa no canto inferior esquerdo com os verbos empilhados; o verbo falado fica amarelo.
- **Cartão final**: engrenagem amarela girando numa caixa de seleção com cantos, "QUE MÁQUINA A GENTE REINVENTA
  AGORA?" e um botão "COMENTA ▼". Sem nome de canal.

## Movimento

- **Sem cortes secos.** Um plano contínuo: a "câmera" é um `<g id="cam">` que envolve o desenho e faz `x`, `y`,
  `scale` suaves (`power2.inOut`, 0,8–1,5 s) para aproximar da peça que a fala cita e afastar para mostrar o todo.
  Troca de assunto grande (ex.: da seringa para o caminhão): o desenho velho sai com fade/escala e o novo entra no
  mesmo lugar (crossfade de 0,4 s) ou a câmera desliza para o lado, onde o próximo desenho já está.
- **Algo muda a cada 1–2 s**, sempre no tempo da palavra: peça entra, líquido corre, ponteiro gira, roda trava,
  etiqueta aparece. Nada fica parado mais de 2 s.
- **Uma imagem nova por frase**, ilustrada ao pé da letra ("aperta um lado" → êmbolo entra; "o líquido escapa" →
  gotas caindo do tubo quebrado).
- Zoom lento contínuo (1,00 → 1,04) nos trechos de explicação, para o quadro nunca congelar.
- Pop sonoro (`pop`, -9 dB) em cada etiqueta importante; `whoosh` nas trocas de desenho; `thud`/`crash` em
  impacto; `tick` em ponteiro; `ding` no "Funciona".

## Composição

- Quadro 1080×1920. Desenho principal entre y 220 e 1250, centrado, ocupando 70–90% da largura.
- A legenda (estilo E, nossa) fica embaixo; não ponha etiqueta abaixo de y 1260.
- Objetos com cantos arredondados, sombra suave `drop-shadow(0 10px 18px rgba(0,0,0,.35))`.
- Detalhes do mundo: nuvens cinza-azuladas `#5d6a99`, cidade à noite ao fundo com janelas acesas, chão de terra com
  pontinhos. Fundo sempre escuro; a peça é o que tem mais contraste.

## Conferir (o coordenador faz depois do render)

```
ffmpeg -i final.mp4 -vf "fps=1/3,scale=270:-1,tile=6x6" -frames:v 1 agentes/nosso.jpg
```
Compare com `agentes/ref/sheet.jpg`: mesmo tipo de desenho em cada momento, mesma densidade de detalhes, nada vazio,
nada cortado, etiquetas legíveis, legenda sem cobrir o desenho.
