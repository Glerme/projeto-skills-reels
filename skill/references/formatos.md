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
