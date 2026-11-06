# Formatos de roteiro

Valem para todos os formatos:
- **Ritmo:** cerca de 3,2 palavras/s (a voz do Alex), ou seja, cerca de 190 palavras por minuto.
- **Gancho:** a primeira frase é o gancho. Sem intro, sem "olá", sem logo, sem pedir para seguir no início.
- **Tom:** frases faladas, curtas, sem jargão sem explicação. Nunca descreva o que o espectador já está vendo.
- **Números e siglas:** números por extenso ("mil oitocentos e trinta e um"). Siglas como se fala ("i-bê-gê-é") ou
  pelo nome completo. Nada de %, R$, /, + ou links: o `pipeline.voice` recusa.
- **SCRIPT.md:** cada fato do roteiro tem fonte no `SCRIPT.md`.
- **Briefing visual:** depois da aprovação do roteiro, o `SCRIPT.md` ganha a seção "Briefing visual" com o
  cenário e o visual de cada personagem confirmados pelo usuário (`briefing-visual.md`).

## História narrada (50–70 s, cerca de 160–220 palavras)

1. **Gancho:** o fato absurdo numa linha ("Setenta e quatro soldados derrubaram uma ponte só de andar por cima dela.").
2. **Cenário:** ano, lugar, uma pessoa comum com nome, um orgulho ou uma aposta.
3. **Escalada:** 3 ou 4 batidas, cada uma um pouco maior. Diálogos curtos dos personagens servem.
4. **Ruptura:** o momento em que dá errado (ou certo).
5. **Linha dupla seca:** "Por sorte… / Por azar…", com o mesmo fato visto dos dois lados.
6. **Explicação:** uma ideia por analogia do dia a dia ("Acontece que…", "Sabe por quê?").
7. **Consequência:** o que isso mudou, a regra que criou.
8. **Virada final:** fecha retomando o gancho.

**Real ou ficção:**
- A história pode ser ficção. Nesse caso, ponha `"fiction": true` no `video.json` (o vídeo mostra o selo FICÇÃO)
  e marque "FICÇÃO" no topo do `SCRIPT.md`.
- Sem ficção, todos os fatos têm fonte.

## Curiosidade (30–45 s, cerca de 100–140 palavras). Sempre real, com fonte.

1. **Gancho:** o fato surpreendente, dito como afirmação ("O polvo tem três corações.").
2. **Prova ou detalhe concreto:** número, tamanho, quem descobriu.
3. **O porquê:** o mecanismo, com uma analogia.
4. **Fecho rápido:** uma consequência engraçada ou uma pergunta que puxa o próximo vídeo.

## Lista (45–60 s, cerca de 140–190 palavras). Sempre real, com fonte.

1. **Gancho:** o tema da lista e o número ("Cinco animais que dormem de um jeito ridículo.").
2. **Itens do menos para o mais surpreendente.** O melhor fica para o fim. Cada item tem 1–2 frases e uma cena
   própria, e o número do item é dito ("Número três:").
3. **Fecho:** uma frase sobre o último item, sem resumo da lista.

## E se (15–25 s, cerca de 50–80 palavras). `"format": "e-se"`

Um "e se" (um poder, um mundo diferente), narrado em **segunda pessoa, no presente**. Adaptado da fórmula do
what-if-animation (kelano86).
1. **Gancho:** a premissa numa frase ("E se você pudesse copiar e colar qualquer coisa?").
2. **Demonstrações em escada:** 2 ou 3, cada uma numa cena só e legível sem texto: pequena e egoísta, depois útil,
   depois um pouco estranha ("Um biscoito. O dever de casa. O seu melhor amigo.").
3. **A virada:** um fato real, com número e fonte, que mostra o custo ou o problema.
4. **Fecho:** uma pergunta ou uma ameaça, nunca uma solução ("Então, de onde vêm os seus?").

- Frases de 3 a 8 palavras. Cada frase é uma imagem.
- A premissa é hipotética, mas o fato da virada é real e tem fonte. Não leva selo FICÇÃO.

## Série em partes (variação da história, 50–70 s por parte)

A história contada em partes, para puxar a próxima parte e os comentários. Use `"format": "historia"` e
`"slug": "<tema>-parte-<n>"`.
- **Gancho:** um momento acontecendo agora, não uma apresentação ("Uma mão gelada no seu tornozelo."). Da parte 2
  em diante, responde a pergunta da parte anterior com uma virada nos primeiros 10 s.
- **Meio:** um dilema em que toda escolha custa algo, e uma virada (o que achávamos se inverte).
- **Perda:** algo se perde e continua perdido.
- **Fim:** um alívio falso e depois um cliffhanger numa imagem ou fala. Sem resolver, sem "tchau" ou "segue".
- **Pergunta final:** uma escolha que divide os comentários meio a meio, com custo dos dois lados ("Você abre a porta
  ou deixa ele bater?"). A última fala anuncia a próxima parte ("Parte dois amanhã.").
- O `SCRIPT.md` da parte guarda o que já foi revelado e a pergunta que ficou em aberto. A parte seguinte parte daí,
  com o mesmo elenco e o mesmo briefing visual.

## E se — série (45–60 s, cerca de 140–180 palavras por parte). `"format": "e-se-serie"`

Nunca passe de 1 minuto por parte (o usuário achou 1 min 20 s longo demais). Para caber: um teste por parte, a física
em duas frases, a escalada com um só "Aí deu ruim." O resto vai para a parte seguinte.

O formato padrão para poderes e hipóteses. Estudo de um perfil de referência (séries de 530 mil a 1,5 milhão de views;
o vídeo do mesmo perfil explicando um fato em 3ª pessoa, sem personagem, ficou em 55 mil). A premissa é para o
espectador ("você"), mas quem vive a história é **um personagem nosso, com nome, fixo na série inteira**.
Voz **neutra**: "você", sem gíria regional e sem palavrão. Referências de games e animes são bem-vindas, desde que
só citadas, sem mostrar personagem nem logo.

1. **Gancho (1 frase):** "E se você acordasse amanhã podendo [poder]?" Na frase seguinte já entra o personagem:
   "O Téo acordou assim." Da parte 2 em diante, o gancho é o problema que a parte anterior deixou ("O Téo quase…").
2. **Origem boba (2–3 frases):** como ganhou o poder, com um detalhe banal e engraçado ("Estava jogando às três da
   manhã, caiu a internet, foi dormir irritado.").
3. **Primeiro uso banal que já dá errado:** algo do dia a dia (geladeira, despertador, um ovo) e um efeito colateral
   inesperado (um estouro, um frio, ficar cego).
4. **"E isso é física."** O porquê do efeito, com **um número concreto** e **uma analogia do dia a dia**. Fonte no
   `SCRIPT.md`.
5. **Teste e regra:** o personagem testa ("Teste um…"; o "Teste dois" fica para outra parte) e cria uma regra ("Regra número um: …"). O
   espectador aprende o sistema do poder; cada teste é uma cena.
6. **Escalada com risco:** cada batida maior que a anterior (vizinho → lei → governo). Antes de cada virada, um
   marcador curto e fixo da série: **"Aí deu ruim."** Use de 1 a 2 vezes por parte.
7. **"Só que tem um detalhe…"** e a virada numa frase curta, com um fato real ("A Terra gira.").
8. **Chamada presa ao cliffhanger:** "Segue aí pra ver [o que está em aberto] na parte [n]." Nunca "siga para
   mais" genérico: a chamada só funciona quando promete o desfecho da virada.

- **Ritmo:** frases de 3 a 10 palavras, uma imagem nova a cada 1–2 s (`direcao.md`). Os números aparecem escritos na
  tela como plaquinha (`"70 L"`, `"0,2 s"`).
- **Série:** 3 a 4 partes por poder. As partes se citam ("Lembra do frio no sol?"), e um detalhe de uma série pode
  virar pista de outra (o universo é compartilhado). O `SCRIPT.md` guarda o personagem, as regras já criadas e o que
  ficou em aberto.
- **Comentários:** uma parte pode nascer de um comentário ("Vocês pediram: e se ele tentasse…").
- **Real ou ficção:** o personagem e a história são inventados, mas todo fato de física é real e tem fonte. Não leva
  selo FICÇÃO (`"fiction": false`), como o "e se".
- **Erros que derrubam:** gastar o começo explicando a referência ("Stand é tipo…"), ritmo acima de 200 palavras/min,
  e uma virada final que não é de física.
