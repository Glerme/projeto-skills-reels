# Direção: como fazer o vídeo parecer vivo

Estudo de um short de referência (cartoon 3D vertical, mesmo estilo de cartões com contorno) e do prompt usado para
gerá-lo. A diferença para os nossos vídeos antigos não está no desenho: está na câmera e na atuação. Exemplo aplicado:
`videos/torre-eiffel-verao-v11/video.json` (compare com `videos/torre-eiffel-verao/video.json`, que ficou parado).

## O que a referência faz e a gente não fazia

| Referência | Nossos vídeos antigos |
|---|---|
| Câmera sempre em movimento: afasta do rosto até o plano geral, sobe como grua, sobrevoa, acompanha quem anda | `hold`/`push` no mesmo enquadramento por 30 s |
| Cada frase tem uma imagem nova e literal (a frase cita metralhadoras, aparecem metralhadoras) | O apresentador fala a mesma pose o vídeo todo |
| O personagem troca de ação no meio da cena (continência → aponta → ri) | Uma ação por cena |
| Coisas e pessoas surgem com "pop" (escala com overshoot + poeira), uma por item citado | Todos parados desde o primeiro quadro |
| Grupos andam, correm, se espalham | Só um figurante em loop na calçada |
| A luz conta o tempo: dia → dourado (declínio) → fim de tarde (explicação, final) | Sempre `day` |
| O twist: música para, empurrão lento com roll, a piada cai na última palavra | Igual ao resto |

## Regras de direção

1. **Nada parado por mais de 4 quadros.** Sempre algo se move: a câmera (no mínimo o creep do `keys`), um
   personagem trocando de beat, alguém entrando.
2. **Uma imagem por frase, ilustrada ao pé da letra.** Se a narração fala "fila", aparece uma fila. Se fala "os
   visitantes", aparecem visitantes. Os props e os figurantes carregam as piadas.
3. **O narrador não precisa estar em cena falando.** Os personagens *atuam* a narração (apontam, se assustam,
   comemoram), como na referência. Use `talk` só quando o personagem é mesmo quem fala.
4. **Um movimento contínuo vale mais que um corte.** Prefira uma cena com 3–5 chaves de câmera a três cenas
   paradas. Corte seco só para mudar de lugar ou de tempo (com `xfade` 0,2–0,3 ou `flash`).
5. **Ação a cada 1–2 s** em quem está no quadro (`beats`), e reação 0–3 quadros antes da palavra
   (`t = start da palavra − 0,05`).
6. **Pop para cada item listado:** `enter` escalonado (0,15–0,2 s entre um e outro) + `pop` no `sfx`.
7. **O twist** (última frase): `music.stop` + `sting`, empurrão lento até o close, `roll` de 2–4°, `kick` e a troca
   de expressão na última palavra.

## Ordem típica das cenas (curiosidade ou história de 30–40 s)

1. **Quadro 0:** close médio (MCU) do herói já em ação. Nada de abertura vazia.
2. **Na palavra de impacto da frase 1:** afastamento (pull-back) que revela o lugar (`ease: "out"`).
3. **Estabelecimento:** grua/sobrevoo até o plano geral, com o herói ainda no quadro, pequeno.
4. **Explicação:** outro lugar real (laboratório, rua, natureza; nunca o palco de cor chapada) mostrando o fenômeno
   em si, sem pessoas posando de onda: anéis de som (`effects` `sound`), fogo, água, um carro ou avião (`movers`). Pessoas
   só quando a analogia é mesmo de gente (uma fila). Também valem objetos que
   surgem.
5. **Analogia:** uma fila/lineup com pops e travelling lateral (a câmera desliza de pessoa em pessoa).
6. **Salto de tempo:** `flash` e troca de luz (`golden`).
7. **Reação:** close com troca de expressão.
8. **Twist:** a regra 7.

## Receitas de câmera com `keys`

Planos (cartão de 2,25 m, ver `cenas.md`):
- **MCU** (rosto e peito, legenda abaixo do queixo): `dist 3.5, fov 32, aim 1.2, h 1.3`.
- **Médio** (corpo inteiro acima da legenda): `dist 7.2, fov 40, aim 0.6, h 1.4`. Com `aim 0.9` os pés entram na
  faixa da legenda; a 6 m o corpo passa de 45% e não é nem médio nem close.
- Nada entre o close e o médio parado: com 50–64% de altura, o corpo não cabe acima da legenda. Em movimento entre os
  dois vale a regra do rosto, então a passagem pode ser contínua (não ponha uma chave parada no meio).
- **Aberto:** `dist 10–18, fov 42–48, aim 0.8, h 1.5–3`.
- **Contra-plongée (heroico, torre atrás):** `dist 6, h 0.6, aim 2.1, fov 46`.
- **Aéreo:** `h 10–14, aim 0` sobre um spot.

Movimentos:
- **Pull-back revelação:** MCU → aberto em 1–1,5 s, `ease: "out"`.
- **Grua:** suba `h` e mantenha o alvo; para um marco distante, use `on: [x, y, z]` e mire `aim` na altura dele.
  Mantenha o herói no quadro (alvo perto do eixo dele, `yaw 0`).
- **Zoom em vez de avanço** quando a câmera passaria pelo personagem: mantenha `dist` e feche o `fov`.
- **Travelling lateral:** chaves com `on` em pessoas diferentes da fila; o alvo desliza entre elas.
- **Órbita:** varie `yaw` 10–20° numa cena; mais que isso parece câmera perdida.
- **Inclinação dramática:** `roll` −4 a −7 com `ease: "back"` na palavra (ex.: "a torre se inclina").
- **Push do twist:** de médio até MCU nos últimos 2–3 s, `roll` 2–3.

## Cuidados que apareceram no teste

Do retorno do usuário sobre a série (2026-11-06):
- **Explicar sem gente:** as ondas sonoras são anéis (`effects` `sound`), não pessoas paradas como "cristas". Uma cena
  só com o fenômeno e a câmera em movimento basta; o QA não reprova cena sem ator se algo se mexe.
- **Sem palco:** todo plano num ambiente de verdade.

Da série `e-se-super-audicao` (partes 1 a 3):
- **Quem não fala também é `focus`**: sem `focus`, o validador não protege o corpo da protagonista da legenda (no
  contra-plongée da rua a legenda caiu em cima dela). Ponha `focus` nela em toda cena em que aparece.
- **Salas:** o piso acaba na parede da frente. Com a câmera a mais de ~7,5 m de um spot do meio, aparece uma faixa
  preta embaixo. Ponha quem precisa de plano aberto no `fundo` (perto da parede do fundo).
- **Mire em quem é `focus`**, não num ponto entre duas pessoas: com o alvo entre elas, quem está mais perto da câmera
  sai do quadro. Para mostrar duas pessoas, separe-as em profundidade e gire o `yaw`.
- **Profundidade esconde:** alguém atrás da protagonista na mesma linha da câmera some. Um passo de lado (`toDx`) ou
  10–15° de `yaw` resolve; confira no still.
- **Sentado:** o validador mede o cartão de pé; quem está sentado tem a cabeça mais baixa. Use médio para quem senta
  (o close deixa o rosto na faixa da legenda).
- **Na rua**, deslocamento entre spots só ao longo da mesma calçada; correr pelo meio da rua é `toDz` sem `to`.
- **QA de pulos:** uma arrancada rápida logo depois de uma chave parada é lida como pulo de imagem. Encadeie o
  movimento (chegue e já saia) ou dê ≥ 1 s para a volta; `ease: "out"` só depois de movimento, não de parada.

- Câmera mirando alto demais mostra só céu: marcos de cenário são mais baixos do que parecem (a torre de Paris cabe
  com `on: [-0.8, 0, -40], dist 50, aim 10–11`).
- No quadro vertical, metade da largura a 10 m com `fov 45` é só ~2,3 m: quem divide um spot já fica a 0,9 m um do
  outro, então o `dx` soma a esse espaçamento.
- Palco vazio no começo da cena parece congelado (o QA reprova): ponha o primeiro `enter` no início da cena.
- Mudança grande entre chaves vizinhas: a curva já fica limitada a cada trecho, mas confira o still no meio do
  movimento.
