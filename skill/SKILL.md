---
name: shorts-cartoon
description: Use quando o usuário pedir um short, reel ou vídeo animado vertical de curiosidade, lista ou história em português ("faz um short sobre…", "vídeo de curiosidade sobre…", "faz um reel de lista…", "conta a história de…") no estilo cartoon 3D do perfil (personagens cabeça de feijão num mundo 3D com contorno), ou disser "usa a skill de shorts cartoon".
---

# Shorts cartoon (pt-BR, HyperFrames)

Projeto: `~/Documentos/projetos/projeto-reels` (chamado de `$P` abaixo). Cada vídeo é uma pasta `videos/<slug>/`.

O usuário passa por **três pontos de decisão: aprova o roteiro, confirma o briefing visual e aprova o vídeo final**.
Fora desses três, não pergunte nada: decida e anote.

## Fluxo de um vídeo

Todo vídeo usa também as skills `diretor-de-edicao` (roteiro, retenção, ritmo de edição) e `motion-designer`
(`references/craft.md`: composição, movimento, zonas seguras). Em ritmo, roteiro, edição e movimento, essas duas skills mandam;
o motor só limita o que existe tecnicamente (ações, peças, cenários).

1. **Tema e formato.**
   - Formatos: história, curiosidade ou lista.
   - Sem tema, proponha 3 em uma linha cada.
   - Regras de cada formato, durações e o limite real/ficção: `references/formatos.md`.
2. **Pesquisa e roteiro.**
   - Para o gancho e a retenção, use a skill `diretor-de-edicao` (`references/roteiro.md`, `retencao.md` e
     `narracao.md` dela). A transcrição dela usa mlx-whisper, que não roda aqui; use o passo 4.
   - Escreva `videos/<slug>/SCRIPT.md` com os fatos e as fontes, e `roteiro.txt` só com o texto falado.
     Números vão por extenso.
3. **Aprovação 1:** mostre o roteiro e espere o "ok".
4. **Briefing visual (OBRIGATÓRIO, antes de qualquer asset, figurino, plano de cenas ou render).**
   - Siga o checklist de `references/briefing-visual.md`: o cenário e, para cada personagem, aparência, época e
     estilo, roupas, cabeça (chapéu, capacete, coroa, lenço), cabelo e barba, calçado e acessórios.
   - Para cada item, mostre uma sugestão (default) tirada do kit e do roteiro, para o usuário só confirmar ou trocar.
   - **Não decida em silêncio.** Pergunte o que estiver em aberto e espere a confirmação.
   - O que o usuário já disse na conversa entra como decidido: recapitule e pergunte só as pendências.
   - Grave as escolhas confirmadas na seção "Briefing visual" do `SCRIPT.md`. O plano de cenas e os figurinos seguem
     essa seção.
5. **Voz e palavras.**
   - `python3 -m pipeline.voice videos/<slug>/roteiro.txt videos/<slug>/assets/voice.wav` (Kokoro, voz Alex). Ele
     recusa dígitos e símbolos.
   - `~/.venvs/shorts/bin/python -m pipeline.words videos/<slug>/assets/voice.wav videos/<slug>/roteiro.txt videos/<slug>/words.json`
6. **Plano de cenas.** Escreva `videos/<slug>/video.json` com os tempos de `words.json` e os figurinos do briefing.
   - Formato, cenários, câmeras e ações: `references/cenas.md`.
   - Personagens e cenários do kit, e como criar uma peça nova: `references/kit.md`.
   - Crie no máximo uma peça nova por vídeo.
7. **Render e checagem:** `bash scripts/render.sh videos/<slug>`. Esse único comando faz:
   - build do motor;
   - mix (trilha do clima + efeitos de `sfx`);
   - legendas no estilo E;
   - `hyperframes check`;
   - render 1080x1920;
   - QA frame a frame.
   Corrija o que o check ou o QA apontarem e rode de novo.
8. **Revisão visual.**
   - Tire stills com `bash scripts/snap.sh videos/<slug> <t1,t2,…>`, um por cena.
   - Confira cada um contra `references/armadilhas.md` e contra o briefing visual confirmado.
   - Use no máximo um agente revisor de stills por vídeo.
9. **Aprovação 2.** Entregue o caminho de `videos/<slug>/final.mp4` e ofereça o preview do HyperFrames
   (`npx hyperframes preview` dentro da pasta) para ajustes.

## Modo orquestrado

Para gastar menos, delegue a escrita a workers (Codex e Claude Haiku) e fique só com as aprovações:
`references/orquestrado.md`. Use esse modo por padrão quando estiver dentro do Orca.

## Quando o usuário pede mudança no vídeo final

| Mudou | Refaça a partir de |
|---|---|
| roteiro, fala | passo 5 (voz) |
| visual de cenário ou personagem (roupa, cabelo, acessórios) | passo 4 (confirme o briefing de novo) e depois o 6 |
| cena, câmera, animação | passo 6 (video.json) e depois o 7 |
| só som ou só legenda | passo 7 |

Antes de regerar, rode `npx hyperframes history --since mine` na pasta do vídeo. Se o usuário editou algo no app
desktop, avise: regerar sobrescreve.

## Ambiente

- Venv do pipeline: `bash scripts/setup_venv.sh`.
- Motor: `npm install` e `npm test` em `$P`.
- Os modelos Kenney ficam em `kit/kenney/`.
- Testes do pipeline: `~/.venvs/shorts/bin/python -m unittest discover pipeline/tests`.
