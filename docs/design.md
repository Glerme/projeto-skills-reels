# Skill de shorts animados genéricos (cartoon 3D, pt-BR, HyperFrames): design

Data: 2026-11-04. Status: aguardando aprovação.

Neste texto, caminhos relativos como `SKILL.md`, `templates/` e `references/` são do repositório
`~/Documentos/projetos/claude-animated-shorts`. O protótipo validado está copiado em `prototipo-hyperframes/`.

## Intenção e o porquê

O usuário quer crescer um perfil de shorts animados no Instagram, TikTok e YouTube Shorts até ele poder ser monetizado.
O sucesso é a pessoa assistir um vídeo, emendar no próximo e seguir o perfil. Para isso:
- o perfil precisa de **volume e constância**: 3 a 5 vídeos por semana;
- o usuário gasta **pouco tempo** em cada vídeo;
- os vídeos têm uma **identidade reconhecível**: o mesmo estilo visual, a mesma voz e a mesma legenda.

O nicho ainda não foi decidido, então a skill é **genérica de assunto**.

A base é a skill da ponte deste repositório (`SKILL.md`, `templates/`): personagens 2D "cabeça de feijão" num mundo 3D
colorido com contorno de tinta, renderizado com three.js. Aquela skill faz **um** vídeo sob medida, depois de várias
rodadas de ajuste. A skill nova reaproveita o **estilo e o motor**, mas troca o trabalho sob medida por um **kit
reutilizável** e um fluxo quase todo automático.

## Objetivos

1. A partir de um pedido curto ("faz um vídeo sobre X", com formato opcional), entregar um short vertical pronto para
   postar, com só **duas aprovações do usuário: o roteiro e o vídeo final**. Entre uma e outra, nada pede decisão dele.
2. Três formatos:
   - **história narrada:** a fórmula da ponte. Gancho absurdo → cenário → escalada → ruptura → linha dupla seca
     ("Por sorte… / Por azar…") → explicação por analogia → consequência → virada final;
   - **curiosidade:** fato surpreendente → porquê → fecho rápido;
   - **lista:** "N coisas que…", cada item uma cena curta, o melhor guardado para o fim.
3. O mesmo visual da ponte em todos os vídeos: personagens cabeça de feijão, mundo 3D com contorno, lens blur, câmeras
   deslizando, grade de cor. Os valores calibrados estão na seção "Final look values" do `SKILL.md`.
4. **Legenda sempre ligada**, no estilo escolhido (ver Restrições).
5. **Voz gerada**, sempre a mesma: Kokoro `pm_alex`, pt-BR.
6. **Kit reutilizável que cresce:** o elenco muda conforme o assunto, mas é montado a partir de peças genéricas, e
   cenários e personagens novos ficam guardados para os próximos vídeos. Nada é refeito do zero.
7. Usar as skills que o usuário já tem para cada parte do trabalho, em vez de reimplementar.

## Fora do escopo (não-objetivos)

- Publicar nas redes, agendar posts ou escrever descrição e hashtags.
- Um mascote ou apresentador fixo. Pode vir depois, mas agora o elenco muda com o assunto.
- Editar vídeo gravado pelo usuário. Isso já é o `diretor-de-edicao`.
- Outros estilos visuais.
- Escolher o nicho.

## Anti-objetivos (falha mesmo que funcione)

- **Conteúdo de terceiros no vídeo publicado.** Os frames em `references/frames/` e `references/sheets/` são prints de
  outro canal: servem só como guia para comparar o visual e nunca aparecem num vídeo. Conteúdo reaproveitado faz as
  plataformas cortarem a monetização, que é justamente o objetivo do usuário. Música e efeitos também precisam ser
  originais ou livres para uso comercial.
- **Modelar cenário ou personagem do zero a cada vídeo**, ou rodar o loop pesado de verificação da ponte (5 sandboxes,
  4 rodadas de Opus max) em todo vídeo. Isso mata o ritmo de 3 a 5 por semana.
- **Custo recorrente obrigatório.** A voz é Kokoro local (gratuita) por escolha do usuário. O resto também deve ter
  caminho grátis.
- Parar no meio para fazer perguntas ao usuário fora das duas aprovações.
- Legenda que destaca a palavra falada, ou com faixa escura atrás. O usuário rejeitou as duas coisas.

## Restrições

**Máquina:** Linux (CachyOS), GPU NVIDIA RTX 4060, Node, Python 3.14, ffmpeg, `espeak-ng` instalado no sistema.

**Render: HyperFrames**, plugin 0.9.9 do Claude Code. Rode o CLI pelo launcher do plugin, como em
`skills/hyperframes/references/plugin-installation.md`: `node <PLUGIN_ROOT>/skills/hyperframes/scripts/plugin-cli.mjs <comando>`.
O usuário já usa o HyperFrames e o app desktop dele para editar.

**Motor 3D:** já portado para o HyperFrames e validado nesta sessão.
- `templates/bridge/main.ts` substitui o `Bridge.tsx` do Remotion. É three.js + `postprocessing` puros, desenhados no
  evento `hf-seek`, com `window.__hf.buildReady` esperando o kit carregar. Dois canvas fazem os crossfades e uma div
  faz o flash.
- `templates/hyperframes/index.html` é a composição raiz.
- `world.ts` não usa mais o `staticFile` do Remotion: os modelos ficam em `assets/kenney/`.
- Teste feito: three 0.187, postprocessing 6.39.6 e bundle com esbuild. O `tsc` passou sem erros, o
  `hyperframes check` só reclamou dos `.glb` Kenney, que não estavam no projeto de teste, e os snapshots em 3 s,
  40 s e 67 s saíram iguais ao visual da ponte.
- `Bridge.tsx`, `templates/sandbox_index_example.tsx` e `templates/scripts/bridge-stills.mjs` ainda dependem do
  Remotion e ficam obsoletos.

**Voz:** Kokoro-82M com a voz `pm_alex`, `lang="pt-br"`, velocidade 1.0.
- O `hyperframes tts` **falha nesta máquina**: o `espeakng_loader` que vem com o `kokoro-onnx` procura o `phontab` num
  caminho de CI que não existe, e nem `ESPEAK_DATA_PATH` nem o `data_path` do próprio loader resolvem.
- O que funcionou foi chamar o `kokoro_onnx` direto, com
  `EspeakConfig(lib_path="/usr/lib/libespeak-ng.so.1", data_path="/usr/share/espeak-ng-data")` e os modelos que o
  HyperFrames já baixou em `~/.cache/hyperframes/tts/{models/kokoro-v1.0.onnx,voices/voices-v1.0.bin}`, rodando num
  venv com `kokoro-onnx soundfile`.
- Ritmo medido: cerca de 3,2 palavras/s, ou seja, cerca de 190 palavras por minuto de vídeo.
- Números devem ir escritos por extenso no texto falado.

**Tempos das palavras:** `hyperframes transcribe <voz.wav> --model small --language pt --engine whisper --json`.
- Nunca use um modelo `.en`: ele traduz para inglês.
- Na amostra de teste, o Whisper transcreveu a voz do Alex sem erro.
- Ele escreve `assets/transcript.json` e sobrescreve o arquivo a cada execução.

**Legenda (escolhida pelo usuário, opção "E"):**
- Uma frase curta por vez, toda em MAIÚSCULAS.
- Branca, fonte bem grossa (no mockup foi Arial Black 900), contorno preto grosso (`-webkit-text-stroke` com
  `paint-order: stroke fill`).
- **Sem** faixa ou fundo e **sem** destacar a palavra falada.
- Troca quando a frase muda, não a cada palavra.
- Centralizada, um pouco abaixo do meio da tela e sempre acima dos 20% de baixo, onde as redes põem o nome do perfil e
  a descrição.
- Siga `skills/hyperframes/references/captions.md`: um host `data-track-kind="captions"`, grupos com tempos vindos da
  transcrição, `fitTextFontSize`, hard kill no fim de cada grupo, primeiro grupo começando 0,1–0,3 s depois do início.
- As legendas são clips HTML do HyperFrames, não desenhadas no canvas 3D, para o usuário poder editar no app desktop.

**Idioma:** pt-BR, na narração, nas legendas e na conversa com o usuário.

**Estrutura dos roteiros:** as regras da seção "Pipeline", passo 2, do `SKILL.md` (já em português) valem para o formato
história. Curiosidade e lista ganham regras próprias.

**Skills do usuário a usar:**
- `diretor-de-edicao` (`~/.claude/skills/diretor-de-edicao`) para roteiro, gancho e retenção. As referências
  `roteiro.md`, `retencao.md` e `narracao.md` dele se aplicam.
  - Atenção: o passo de transcrição dele usa `mlx-whisper`, que é só para Apple Silicon. Aqui, use o
    `hyperframes transcribe`.
- `media-use` (HyperFrames) para música e efeitos.
- `hyperframes`, `hyperframes-cli` e `hyperframes-registry` para montagem, legenda, check, snapshot e render.

## O fluxo de um vídeo (decidido com o usuário)

1. O usuário pede um tema, com formato opcional. Sem tema, a skill sugere alguns.
2. Pesquisa dos fatos, com fontes, e roteiro no formato.
   - **Real ou ficção (decidido pelo usuário):** curiosidades e listas são sempre fatos reais, com fonte no roteiro.
   - A história narrada pode ser ficção, mas aí isso fica claro: o roteiro marca "ficção" e o próprio vídeo deixa
     claro, seja na narração ou numa legenda de abertura. A forma exata fica com quem constrói.
   - Na história real, os fatos precisam de fonte.
3. **Aprovação 1: roteiro.**
4. Voz (Kokoro `pm_alex`) → transcrição → tempo de cada palavra.
5. Plano de cenas automático:
   - escolhe cenários e personagens do kit;
   - define câmeras, cortes e reações sincronizadas com as palavras (as reações caem 0-3 frames antes da palavra,
     como na ponte);
   - cria peças novas só se o assunto exigir e as salva no kit.
6. Som: música e efeitos, mixados sob a voz.
7. Legendas, montagem e áudio no HyperFrames.
8. Checagem automática leve, sem perguntar nada ao usuário: `hyperframes check`, snapshots das cenas, revisão das
   "armadilhas de leitura" da seção do mesmo nome no `SKILL.md`, e `short_qa.py` no mp4 (frames pretos, congelados,
   pulos, loudness). Corrige o que achar.
9. Render.
10. **Aprovação 2: vídeo final**, aberto no preview do HyperFrames ou no app desktop, onde o usuário pode ajustar.

## O kit reutilizável (decidido: elenco muda com o assunto e reaproveita peças)

**Personagens:**
- O corpo cabeça de feijão do `toon.ts`, com variações de proporção: criança, adulto, idoso, magro, gordo.
- As 14 expressões existentes e tons de pele.
- Roupas e acessórios trocáveis.
- Poses e ações prontas: andar, apontar, susto, comemorar, cair.
- Um personagem montado para um vídeo vira uma entrada nomeada do acervo e pode ser reusado.

**Cenários:**
- **A v1 começa com 6 cenários (decidido pelo usuário):** rua de cidade, interior de casa, escritório, laboratório,
  natureza, e um palco neutro de fundo colorido para listas e curiosidades.
- O acervo cresce a cada vídeo.
- **Uma aprovação única do visual do kit (decidido pelo usuário).** Acontece antes de os vídeos automáticos serem
  liberados.
  - O usuário vê stills de cada cenário e de alguns personagens montados.
  - Nessa construção única, pode ser usado o loop pesado de comparação com as referências, descrito na seção
    "Look-match loop" do `SKILL.md`.
  - Depois disso, só valem as duas aprovações por vídeo.

**Motor:** os módulos de estilo (`lights`, `shade`, `paint`, `ink`, `lensblur`, `grade`, `cardshade`, `toon`) já são
genéricos. As partes específicas da ponte ficam em `world.ts` (geometria da ponte e do rio), `build.ts` (layout da
cidade), `story.ts` (planos da ponte) e `cast.ts` (papéis dos soldados). Elas precisam ser separadas em "motor" e
"conteúdo do vídeo", para que um vídeo novo seja dado (roteiro + tempos + escolhas do kit), e não código novo.

**Modelos Kenney (CC0):** precisam ser baixados de kenney.nl, porque não estão no repositório. São livres para uso
comercial.

## Deixado para quem constrói (decisões minhas, não do usuário)

- **Onde a skill mora (pedido do usuário):** `~/Documentos/projetos/projeto-reels/`, onde fica tudo deste projeto:
  documentos, assets e protótipos.
  - O repositório `claude-animated-shorts` (o fork da skill da ponte) continua sendo a fonte do motor e das referências
    de estilo.
  - O nome da skill fica a critério de quem constrói.
- **Resolução de saída:** 1080x1920, o padrão das três plataformas e o preset `portrait` do HyperFrames.
  - O 2K (1440x2560) da skill original era regra do autor original, não do usuário.
  - O `--resolution` do HyperFrames só escala por inteiro: 4K custa 4 vezes mais pixels.
- **Duração por formato:** palpite de história 50–70 s, curiosidade 30–45 s, lista 45–60 s.
- **Música e efeitos:**
  - Os geradores sintetizados de `templates/audio/` (Python, originais) podem virar uma biblioteca genérica de efeitos.
  - A música pode vir do `media-use` por um caminho grátis ou ser sintetizada.
  - Sempre original ou livre para uso comercial.
  - Mix-base herdado: música +3 dB e efeitos −6 dB em relação ao padrão, voz sem alteração, cerca de −14 LUFS.
- **Formato do kit:** módulos TS, dados JSON, convenção de nomes, e como o plano de cenas escolhe as peças.
- **O quanto de "direção de câmera" é automático** e o quanto vem de receitas prontas por tipo de batida.
- **O que fazer com o repositório atual.** Ele tem mudanças sem commit: SKILL.md em pt-BR/Linux, README, os scripts
  `bridge_merge.py` e `bridge-stills.mjs`, e o porte para HyperFrames (`main.ts`, `world.ts`,
  `templates/hyperframes/index.html`).
- **Script de voz:** ele precisa contornar a falha do `hyperframes tts` e criar o venv do Kokoro se não existir.
- **"Não" na aprovação 2 e edições no app desktop:**
  - O usuário diz no chat o que mudar, e a skill refaz só a parte afetada: roteiro → tudo, cena → render, legenda ou
    som → montagem.
  - O projeto de cada vídeo é gerado a partir de dados (roteiro, tempos, escolhas do kit), e regerar sobrescreve.
  - Antes de regerar, a skill confere com `hyperframes history --since mine` se o usuário editou algo no app desktop e
    avisa antes de sobrescrever.
  - No app, só legendas, áudio e tempos são editáveis: o 3D sai do código.
- **Custo de máquina e de Claude por vídeo:**
  - Sem teto fixo. O alvo é cerca de 1 h de máquina por vídeo, sem acompanhamento do usuário.
  - No máximo um agente revisor por vídeo, que só revisa stills.
  - Criar uma peça nova de kit por vídeo é aceitável. Mais do que isso indica que o kit está pequeno.
