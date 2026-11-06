# Briefing visual (obrigatório em todo vídeo)

**Quando:** depois do roteiro aprovado e antes de criar figurinos ou peças do kit, escrever o `video.json`
ou renderizar.

**Regra:**
- Nada visual é decidido em silêncio.
- Para cada item abaixo, mostre uma sugestão (default) e peça a confirmação.
- O que o usuário já disse na conversa vale como decidido: recapitule ("já combinado: …") e pergunte só as
  pendências.

## Como perguntar

- Agrupe as perguntas: no máximo 4 por mensagem, com a opção sugerida primeiro. Os itens já decididos aparecem num
  resumo, não como pergunta.
- Cada opção diz o que o kit já tem e o que seria peça nova (no máximo uma peça nova por vídeo; ver `kit.md`).
- Quando houver época histórica ou religiosa, avise que o figurino é estilizado (cartoon) e não afirme precisão
  histórica ou arqueológica que não foi verificada.
- Depois da resposta, grave tudo na seção **"Briefing visual"** do `SCRIPT.md`, separando o que foi confirmado pelo
  usuário do que era default e ele aceitou. Só então siga.

## Checklist

### Cenário

- Lugar: um dos 6 do kit (palco, rua, casa, escritório, laboratório, natureza) ou um cenário novo, que conta como a
  peça nova do vídeo.
- Época e região, se importam (antiga, medieval, atual…).
- Hora e luz: dia ou fim de tarde (`day` ou `golden`).
- Elementos que o roteiro cita e precisam aparecer (ex.: riacho, acampamentos, palácio).

### Cada personagem (uma linha por papel do roteiro)

| Item | O que confirmar |
|---|---|
| aparência | idade e porte (`kid`, `slim`, `adult`, `stout`, `elder`, escala), tom de pele |
| época e estilo | atual, antigo/bíblico, medieval…, e o tom (realista ou caricato) |
| roupa | peças (camisa, túnica, armadura, manto…) e cores |
| cabeça | chapéu, boné, capacete, coroa, lenço/headcloth ou nada |
| cabelo e rosto | cor do cabelo, barba ou bigode |
| calçado | sapato, bota, sandália |
| acessórios | o que leva ou segura: cajado, bolsa, escudo, lança, objetos que a ação exige (ex.: funda e pedras) |
| ações marcantes | gestos ou ações que o roteiro pede e que exigem animação ou objeto específico |

### Fechamento

- Recapitule numa tabela curta (personagem → visual confirmado) e diga qual é a peça nova do vídeo, se houver.
- Siga só depois do "ok".

## Peças de figurino que o motor desenha (`engine/style/toon.ts`, `Outfit`)

**Roupa e corpo:**
- atuais: `jacket`, `pants`, `boots`, `belt`, `buttons`, `sash`, `dress`;
- de época: `tunic`, `girdle` (cinto de pano), `mantle` (manto), `sandals`, `greaves` (caneleiras), `armor` (armadura
  de escamas), `shield` (escudo redondo), `bag` (bolsa de pastor);
- rosto: `beard`, `moustache`, `glasses` (cor do aro) com `glassesStyle`: `square` (padrão), `round` ou `sun` (lentes
  escuras, para agentes e seguranças);
- cientista: `hairStyle: "messy"` (mechas pontudas), `labCoat` (cor; longo, aberto, lapelas, bolso com canetas e átomo),
  `shirt` (cor da camisa com gola), `gloves` (cor das mãos), `skin` e `ink` (cores próprias opcionais).
- jovem: `hairStyle: "ponytail"` (rabo de cavalo alto, com `hat: "hair"`; o elástico usa a cor do fone),
  `headphones` (cor; fone grande sobre as orelhas, com o arco por cima do cabelo), `hoodie: true` (moletom: bolso canguru e cordões no lugar dos botões).

**Cabeça (`hat`):** `hair`, `cap`, `helmet` (com `crest`), `crown`, `headcloth`, `tophat`, `bonnet`, `shako`.

**Objetos de mão (animação):** `stone`, `staff`, `spear`, `helmet`, `sling`.

Uma peça que não está aqui é peça nova: avise no briefing antes de prometer.
