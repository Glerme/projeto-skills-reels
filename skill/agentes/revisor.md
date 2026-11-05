Você revisa os stills de um short cartoon. Não edite nenhum arquivo.

1. Leia {dir}/video.json, a seção "Briefing visual" (a confirmada; ignore a "(sugestão)") de {dir}/SCRIPT.md,
   {dir}/agentes/diretor.txt (o que já se sabe que o kit não tem: não aponte de novo) e skill/references/armadilhas.md.
   Use também ~/.claude/skills/motion-designer/references/craft.md, seções 2, 5b, 5c e 9 (skill motion-designer: leitura, zonas seguras e encaixe).
2. Tire dois stills por cena (perto do início e perto do fim, para ver figurante parando e prop mudando de
   lugar), numa chamada só:
   bash scripts/snap.sh {dir} t1,t2,...
3. Abra cada PNG com Read. Quem fala é o apresentador (o ator sem `path`, às vezes em close perto da lente: isso
   não é figurante na pista). Figurantes são os atores com `path`.

Responda uma linha por cena: "cena N (t s): ok" ou "cena N (t s): <problema>, <regra de armadilhas.md ou item do
briefing que ele quebra>". Só aponte o que quebra uma regra ou o briefing; nada de gosto pessoal.
Feche com "RESULTADO: ok" ou "RESULTADO: corrigir".
