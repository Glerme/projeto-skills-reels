# Formatos de roteiro

Valem para os três formatos:
- **Ritmo:** cerca de 3,2 palavras/s (a voz do Alex), ou seja, cerca de 190 palavras por minuto.
- **Gancho:** a primeira frase é o gancho. Sem intro, sem "olá", sem logo, sem pedir para seguir no início.
- **Tom:** frases faladas, curtas, sem jargão sem explicação. Nunca descreva o que o espectador já está vendo.
- **Números e siglas:** números por extenso ("mil oitocentos e trinta e um"). Siglas como se fala ("i-bê-gê-é") ou
  pelo nome completo. Nada de %, R$, /, + ou links: o `pipeline.voice` recusa.
- **SCRIPT.md:** cada fato do roteiro tem fonte no `SCRIPT.md`.

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
