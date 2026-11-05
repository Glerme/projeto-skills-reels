O render do short em {dir} falhou. O log está em {dir}/agentes/render.log.

Ache a causa e corrija em {dir}/video.json. Não mexa em engine/, pipeline/ nem scripts/: se a causa estiver lá,
pare e explique na última mensagem.
Referência dos campos: skill/references/cenas.md e skill/references/armadilhas.md.
Valide com `~/.venvs/shorts/bin/python -m pipeline.assemble --check {dir}`. Não renderize.
Última mensagem: a causa e o que mudou, em até cinco linhas.
