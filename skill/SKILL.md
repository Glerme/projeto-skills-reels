---
name: shorts-cartoon
description: Use quando o usuário pedir um short, reel ou vídeo animado vertical de curiosidade, lista ou história em português ("faz um short sobre…", "vídeo de curiosidade sobre…", "faz um reel de lista…", "conta a história de…") no estilo cartoon 3D do perfil (personagens cabeça de feijão num mundo 3D com contorno), ou disser "usa a skill de shorts cartoon".
---

# Shorts cartoon (pt-BR, HyperFrames)

Projeto: `~/Documentos/projetos/projeto-reels` (chamado de `$P` abaixo). Cada vídeo é uma pasta `videos/<slug>/`.

O usuário só aprova **duas coisas: o roteiro e o vídeo final**. Entre uma e outra, não pergunte nada: decida e anote.

## Fluxo de um vídeo

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
4. **Voz e palavras.**
   - `python3 -m pipeline.voice videos/<slug>/roteiro.txt videos/<slug>/assets/voice.wav` (Kokoro, voz Alex). Ele
     recusa dígitos e símbolos.
   - `~/.venvs/shorts/bin/python -m pipeline.words videos/<slug>/assets/voice.wav videos/<slug>/roteiro.txt videos/<slug>/words.json`
5. **Plano de cenas.** Escreva `videos/<slug>/video.json` com os tempos de `words.json`.
   - Formato, cenários, câmeras e ações: `references/cenas.md`.
   - Personagens e cenários do kit, e como criar uma peça nova: `references/kit.md`.
   - Crie no máximo uma peça nova por vídeo.
6. **Render e checagem:** `bash scripts/render.sh videos/<slug>`. Esse único comando faz:
   - build do motor;
   - mix (trilha do clima + efeitos de `sfx`);
   - legendas no estilo E;
   - `hyperframes check`;
   - render 1080x1920;
   - QA frame a frame.
   Corrija o que o check ou o QA apontarem e rode de novo.
7. **Revisão visual.**
   - Tire stills com `bash scripts/snap.sh videos/<slug> <t1,t2,…>`, um por cena.
   - Confira cada um contra `references/armadilhas.md`.
   - Use no máximo um agente revisor de stills por vídeo.
8. **Aprovação 2.** Entregue o caminho de `videos/<slug>/final.mp4` e ofereça o preview do HyperFrames
   (`npx hyperframes preview` dentro da pasta) para ajustes.

## Quando o usuário pede mudança no vídeo final

| Mudou | Refaça a partir de |
|---|---|
| roteiro, fala | passo 4 (voz) |
| cena, câmera, personagem | passo 5 (video.json) e depois o 6 |
| só som ou só legenda | passo 6 |

Antes de regerar, rode `npx hyperframes history --since mine` na pasta do vídeo. Se o usuário editou algo no app
desktop, avise: regerar sobrescreve.

## Ambiente

- Venv do pipeline: `bash scripts/setup_venv.sh`.
- Motor: `npm install` e `npm test` em `$P`.
- Os modelos Kenney ficam em `kit/kenney/`.
- Testes do pipeline: `~/.venvs/shorts/bin/python -m unittest discover pipeline/tests`.
