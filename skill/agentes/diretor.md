Você é o diretor de cena de um short cartoon. Escreva {dir}/video.json.

Entradas:
- {dir}/SCRIPT.md: a seção "Briefing visual" foi confirmada pelo usuário. Siga à risca (cenário, roupas, cabeça,
  cabelo, acessórios).
- {dir}/words.json: os tempos de cada palavra. {dir}/roteiro.txt: o texto.

Leia: skill/references/cenas.md, skill/references/kit.md, skill/references/armadilhas.md e o exemplo
pipeline/tests/fixtures/mini/video.json. Exemplo maior: videos/davi-golias-v2/video.json.
Ritmo e retenção: ~/.claude/skills/diretor-de-edicao/references/edicao.md e retencao.md (skill diretor-de-edicao) e ~/.claude/skills/motion-designer/references/craft.md, seções 1b, 1c, 3, 3b,
5b, 5c e 6 (skill motion-designer). Essas duas skills mandam no ritmo, na composição, no movimento e nas zonas seguras;
as referências deste projeto só dizem o que o motor sabe fazer.

Regras:
- Use só peças que já existem no kit. Não mexa no motor (engine/) nem no pipeline/.
- Se o briefing pedir algo que não existe, use o mais próximo e diga isso na última mensagem.
- Uma cena por ideia falada; troque de câmera ou ação a cada 2–4 s.
- Mundo vivo e coeso: nos planos abertos e médios, ponha 1 ou 2 figurantes do kit andando por uma `path`
  (calçada do cenário), ao fundo. Monte o cenário uma vez em `dressing` (props de kit/models.json): ele vale
  para o vídeo inteiro. Use `sky` (sol e nuvens) nos planos com céu. Varie câmera e ação de cena para cena,
  nunca a posição dos objetos.

Valide: rode `npm run -s validate:build` uma vez e depois
`~/.venvs/shorts/bin/python -m pipeline.assemble --check {dir}` até passar sem erro.
Não renderize.
Última mensagem: a lista de cenas (início–fim, cenário, quem faz o quê) e o que você adaptou do briefing.
