Você cria UM cenário novo para o kit de shorts cartoon. O pedido está na nota no fim.

Leia: skill/references/kit.md (seção Cenários), skill/references/armadilhas.md, engine/sets/rua.ts (exemplo
externo), engine/sets/index.ts, engine/sets/anchors.ts e engine/style/build.ts.

Regras:
- Crie engine/sets/<id>.ts, registre em index.ts e ponha os nomes em anchors.ts (mesmos spots e views da rua,
  para o diretor de cena reaproveitar).
- Não mude números de engine/style/. Cores médias e apagadas, nunca amarelo-limão nem lavanda.
- O cenário tem que servir para outros vídeos: id genérico, nada específico de um roteiro.
- Rode `npm test` até passar.
- Monte o projeto de teste com `bash scripts/mk-test-video.sh <spec> videos/_teste-<id>` (veja o script para o
  formato do spec), com um plano por view. Não tire stills: o Chrome não abre no sandbox, e o revisor faz isso.
Última mensagem: o id, as views e os spots, o caminho do spec e os tempos de cada plano e o que ficou de fora.
