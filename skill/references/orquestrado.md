# Modo orquestrado (Orca + vários agentes)

A sessão principal (Claude) só coordena: as três aprovações, o briefing e os comandos. Quem escreve é worker.
Os agentes trocam arquivos, não conversa. Cada worker começa do zero e lê só as referências do seu papel.
Todo vídeo usa as skills diretor-de-edicao e motion-designer: os prompts em `skill/agentes/` apontam a parte de cada uma
que o papel precisa (o Codex não carrega skills, então lê os arquivos).
Em conflito, essas skills mandam; o motor só limita o que existe tecnicamente.

| Passo | Quem | Como |
|---|---|---|
| 1–2 roteiro | Claude Opus 5.5 (roteirista) | `worker.sh roteirista videos/<slug> "tema: …; formato: …"` |
| 3 aprovação do roteiro | coordenador + usuário | mostre `agentes/roteirista.txt` |
| 4 briefing visual | coordenador + usuário | parta da "Briefing visual (sugestão)" do `SCRIPT.md`; grave a versão confirmada como "Briefing visual" |
| peça nova (se o briefing pedir) | Codex (cenógrafo) e depois Claude Haiku (revisor) | `worker.sh cenografo videos/<slug> "id: …; descrição"`, depois `worker.sh revisor videos/_teste-<id> "revise o cenário novo; o plano está em spec.json"`; roda junto com a voz |
| mudança no motor (recurso novo) | Codex (motor) | escreva o pedido num arquivo e rode `worker.sh motor videos/<slug> "Pedido em <arquivo>"`; confira com `npm test` |
| 5 voz e palavras | script | os dois comandos do passo 5 do SKILL.md |
| 6 `video.json` | Codex (diretor) | `worker.sh diretor videos/<slug>` |
| 7 render | script | `bash scripts/render.sh videos/<slug> > videos/<slug>/agentes/render.log 2>&1` |
| 7b se o render falhar | Codex (corretor) | `worker.sh corretor videos/<slug>` e renderize de novo (no máximo 3 voltas) |
| 8 revisão | Claude Haiku (revisor) | `worker.sh revisor videos/<slug>`; se "RESULTADO: corrigir", mande a lista ao diretor como nota |
| 8b nota de retenção | coordenador | `references/nota.md`, lendo só `qa/report.md`, `roteiro.txt` e `SCRIPT.md` |
| 9 aprovação final | coordenador + usuário | `final.mp4` |

O coordenador não lê `engine/`, não abre stills e não reescreve o que o worker fez: lê só o `.txt` de saída.
Se o diretor errar o mesmo ponto duas vezes, rode esse passo com Claude Opus no lugar do Codex.

## Rodando cada worker numa aba do Orca

Assim o usuário acompanha cada worker numa aba. Abra a aba, espere ela fechar e leia a saída:

```
orca terminal create --worktree active --title "<slug>:<papel>" \
  --command 'bash scripts/worker.sh <papel> videos/<slug> "<nota>"; exit' --json
orca terminal wait --terminal <handle> --for exit --timeout-ms 1800000 --json
cat videos/<slug>/agentes/<papel>.txt
```

Sem o Orca, rode `bash scripts/worker.sh …` direto.
Vários vídeos podem andar ao mesmo tempo (cada um na sua pasta), mas só um render por vez, porque ele pesa na máquina.
Os workers Codex rodam em sandbox e não abrem o Chrome: render e stills ficam com o script ou com o revisor.
Peça nova mexe em `engine/`: com um vídeo só, roda no mesmo checkout; com vários vídeos em paralelo, faça a peça
numa worktree própria.

## Lições do primeiro teste (torre-eiffel-verao, 2026-11-05)

- O Haiku revisor é bom para regras (cor proibida, borda, câmera trocada), mas fraco para "isto parece o que deveria?".
  Ele não percebeu que a torre parecia uma antena. Para peça nova, o coordenador olha uma vez uma folha de stills
  lado a lado (`ffmpeg … hstack`, cerca de 270 px cada), que é barata, antes de aprovar.
- O revisor acha um problema novo a cada volta. Pare em 3 voltas por peça e decida.
- O Codex acertou o `video.json` e o render de primeira. O corretor não foi usado.
- Assets novos: o usuário baixa o pacote (a Kenney bloqueia download automático) e `scripts/import-assets.sh <zip> <prefixo>`
  registra tudo; o diretor usa em `props` sem mexer no motor.
