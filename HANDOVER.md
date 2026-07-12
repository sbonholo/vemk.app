# HANDOVER — Batalha Brasil / DUELO BR (duelobr.com)

Jogo de luta 2D de paródia política (Zé da Esquerda/Lula vs Capitão
Direita/Bolsonaro). Single-file HTML5 canvas, tudo em `index.html`.

## Arquitetura e deploy

- **Desenvolvimento**: `sbonholo/vemk.app`, branch `export-batalha-brasil`.
  ÚNICO repo acessível pelo sandbox do Claude (o proxy git nega qualquer outro).
- **Produção**: `sbonholo/batalha-brasil@main` → GitHub Pages → **duelobr.com**
  (CNAME `www.duelobr.com`).
- **Deploy automático**: `.github/workflows/sync-to-batalha.yml` copia
  `index.html` + `CNAME` para o repo de produção a cada push que os toque
  (secret `BATALHA_DEPLOY_TOKEN`, PAT fine-grained do usuário).
- `index.html` tem ~800 KB: inclui 4 assets base64 (bg da luta JPEG, key art
  do título JPEG, 2 atlases de sprites PNG8) + 2 retratos hero JPEG.
- **Cache do iOS é agressivo** — muitos "bugs" reportados eram builds velhos.
  Sempre conferir `curl raw.githubusercontent.com/sbonholo/batalha-brasil/main/index.html`
  antes de debugar.

## Estado do jogo (tudo deployado até `95ddcdd`)

- **Sprites pixel-art** dos dois lutadores (sheets gerados pelo usuário em
  fundo magenta). Atlas embutidos: `ZE_SPRITE` (74×108/célula, 23 células),
  `CAP_SPRITE` (109×115, 26 células, tem frame de KO deitado — `koLying`).
  Renderer: `drawSprite()`; roteamento em `drawZe()`/`drawCapitao()` com
  fallback vetorial (`drawZeVector`/`drawCapitaoVector`) até decodificar.
- **Alturas normalizadas por célula** (classe de pose): em pé Zé=92px /
  Cap=86px exatos no atlas; braços erguidos 104/98; gap dos pés = 1px em
  todas. Na tela ~135px ambos (`scalePx`: Zé default 158, Cap 181).
  Scripts de auditoria/normalização: ver histórico da conversa (python/PIL
  inline; medem content-height e gapBottom por célula direto do HTML).
- **Cel pipeline** sobre os sprites: outline 4-direções, rim light por round,
  form shadow, squash & stretch, sombra de contato radial (buffers 260×190).
- **Background da luta**: ilustração da Praça dos Três Poderes (base64) com
  wash de iluminação por round (dia/pôr-do-sol/noite) + fallback procedural
  completo (Congresso, catedral, lago) que segue no código.
- **Título/seleção**: key art "DUELO BR" (base64, botão fake cortado do asset),
  fade inferior, badge de streak "🔥 N vitórias seguidas!". Cards de seleção
  usam os sprites (não os heros 3D). Heros 3D ficam só no título (fallback).
- **Gameplay**: 3 golpes + bloqueio + pulo; super meter (enche com dano,
  D com barra cheia = SUPER 34 dmg + flash dourado); combo counter
  ("N HITS!"); CPU 3 dificuldades; sidekicks (Haddad/Edu) no round 3 com
  reações (cheer/slump) — AINDA VETORIAIS; celebrações com falas rotativas
  (7 por personagem, frases famosas de Lula/Bolsonaro em
  `ZE_WIN_QUOTES`/`CAP_WIN_QUOTES`); faixa presidencial no campeão da
  PARTIDA durante a celebração final (overlay no drawSprite via
  `f.wearSash`); VITÓRIA/DERROTA na tela final + stats (maior combo) +
  streak persistida (`localStorage batalhaBrasilStreak`).
- **Mobile**: joga em landscape E portrait (canvas 16:9 no topo, controles
  embaixo; `body.in-menus` esconde controles nos menus/fim de partida).
  Touch: container pointer-events none, só botões auto. Modais com
  click+touchend dedupe (bug clássico iOS resolvido 2x — pause e end).
- **Áudio**: WebAudio sintetizado (música título/luta, SFX). Para em aba
  oculta. Mute persistido.
- **Analytics**: GoatCounter (`batalhabrasil.goatcounter.com`).
- **Props vetoriais das celebrações** (vara de pesca, garrafa, braço
  apontando) foram REMOVIDOS — desalinhavam com sprites (vara parecia
  fálica — reporte do usuário).

## Pendências / próximos passos sugeridos

1. **VERIFICAR VISUALMENTE a faixa presidencial** (`95ddcdd`): implementada
   no `drawSprite` (banda diagonal verde+amarela, `contentRatio` por sprite)
   mas a validação visual falhou (imagens rejeitadas pela API no fim da
   sessão). Ganhar uma partida e conferir o overlay (posição/ângulo).
2. Sidekicks do round 3 ainda são bonecos vetoriais — destoam dos sprites.
   Pedir sheets magenta ao usuário ou estilizar.
3. Testes Playwright vivem em /tmp (morrem com o container) — commitar em
   `tests/` + CI. Suítes úteis da sessão: e2e-audit (22 checks), deep-dive
   (11 checks + FPS), feet-check (zoom pés), iphone-feet (view 844×390).
4. Celebrações usam frames victory dos sprites; skits (pesca/golpe) hoje
   diferem só na fala/estrelas — dá pra enriquecer.
5. Multiplayer online: infra PeerJS existe mas botão foi removido do menu.
6. FPS headless ~55-58 desktop / ~47 portrait. Se precisar mais: cachear
   rim/outline quando parado, ou pular form-shadow em mobile.

## Convenções

- Sempre: editar `index.html` → `node --check` no JS extraído → teste
  Playwright local (server: `python3 -m http.server 8080`; playwright
  global em /opt/node22, symlink `/tmp/node_modules`) → commit descritivo
  → push (workflow deploya sozinho).
- Commits SEM menção a modelo/IA além do rodapé padrão da sessão.
- Responder ao usuário em português, CURTO (preferência explícita).
- Assets novos: embutir base64 via placeholder + python replace (nunca
  colar b64 gigante em Edit).
