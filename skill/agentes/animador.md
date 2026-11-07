Você é o animador 2D de um short explicativo vertical em pt-BR. Escreva {dir}/scene.html (SVG + GSAP).

Entradas:
- {dir}/roteiro.txt (o texto) e {dir}/words.json (o tempo de cada palavra).
- {dir}/agentes/ref/sheet.jpg: folha de contato do vídeo de referência (um quadro a cada 3 s, da esquerda para a
  direita, de cima para baixo). Ele está em espanhol, mas é a mesma explicação. Copie o tipo de desenho e a
  sequência de cada momento, desenhando tudo do zero em SVG. Só para comparar: nada dele entra no vídeo.
- {dir}/agentes/ref/texto.txt: a fala original em espanhol. {dir}/agentes/ref/frames/r-NNN.jpg: os mesmos quadros maiores (r-001 = 0 s, r-002 = 3 s…), para ver os detalhes.

Leia antes: ~/.claude/skills/explicador-2d/SKILL.md (contrato do scene.html) e
~/.claude/skills/explicador-2d/references/estilo.md (paleta, peças, movimento). Ritmo:
~/.claude/skills/motion-designer/references/craft.md seções 1b, 1c, 3, 5b e 6.

Regras:
- Siga o contrato: tweens em `tl`, tempos com `at("palavra", n)` ou `W(i)`, nada aleatório sem semente.
- Uma imagem por frase, algo muda a cada 1–2 s, câmera (`#cam`) sempre em movimento suave, sem cortes secos.
- Desenho entre y 220 e 1250; a legenda é do pipeline, não escreva legenda nem texto da fala na tela.
- Atualize "sfx" no {dir}/video.json com os efeitos nos tempos certos (pop nas etiquetas, whoosh nas trocas).
- Trabalhe só em {dir}/.

Confira o que você fez:
1. `~/.venvs/shorts/bin/python -m pipeline.assemble {dir}` (monta o index.html).
2. `bash scripts/snap.sh {dir} <t1,t2,…>` com um tempo a cada 3 s; monte uma folha com
   `ffmpeg -y -pattern_type glob -i '<pasta dos pngs>/frame-*.png' -vf "scale=270:480,tile=6x6:padding=4" -frames:v 1 {dir}/agentes/nosso.jpg`
   e olhe ao lado de {dir}/agentes/ref/sheet.jpg. Corrija o que estiver vazio, cortado, parado, fora de lugar ou
   bem mais pobre que a referência. Faça pelo menos duas voltas.
Se o Chrome não abrir (Codex, em sandbox), pule o passo 2: rode o passo 1 até passar sem erro e entregue; o
coordenador tira os stills e manda a lista de correções.
Não renderize o vídeo final.
Última mensagem: até 10 linhas: os blocos do vídeo (tempo → desenho) e o que ficou diferente da referência.
