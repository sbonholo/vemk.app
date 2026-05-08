# Batalha Brasil — Paródia Política

A satirical 1v1 fighting game in the browser. Single-file HTML5 Canvas implementation, no build step, no external dependencies.

> **Disclaimer:** Pure parody and entertainment. This game is **not endorsed** by any candidate, party, or electoral authority. All characters are fictional archetypes. The "Pix paywall" is a non-functional demonstration — no payment is processed and the QR code is not scannable.

---

## Play

Open [`index.html`](./index.html) in any modern browser, or visit the live build at:

**https://sbonholo.github.io/batalha-brasil/**

A `R$ 2,00 via Pix` paywall appears on first load. Click **JÁ PAGUEI — JOGAR** to enter; the unlock is stored in `localStorage` under `batalhaBrasilPaid`. To re-test the paywall, clear the site's local storage in your browser dev tools.

## Controls

| | Action |
|---|---|
| **← →** | Move left / right |
| **↑** | Jump |
| **↓** | Block (when standing still) |
| **A** | Soco — punch |
| **S** | Chute — kick |
| **D** | Especial — special move |
| **⏸ Pausar** | Open the pause menu |
| **Enter** | Confirm / restart from match end |

On phones the d-pad and three action buttons appear automatically as an on-screen overlay. Portrait orientation shows a "rotate device" hint — the game requires landscape.

## Modes

- **1 Jogador vs CPU** — pick from three difficulties:
  - **FÁCIL** — slow reactions, basic attacks, makes mistakes
  - **MÉDIO** — balanced, occasional combos, will sometimes block
  - **DIFÍCIL** — fast, aggressive, full moveset, blocks often, whiff-punishes
- **Character select** — play as either fighter; the CPU plays the other one.
- **2 Jogadores Online** — *Em breve…* (placeholder, not implemented).

## Fighters

Both characters are parody archetypes. Any resemblance to real public figures is satirical.

- **Zé da Esquerda** — short, stocky union worker. PT-red shirt with a white star. Moves: *Soco Sindical*, *Chute Petista*, *Abraço Popular*.
- **Capitão Direita** — tall, lean military reservist. Olive camo, beret with yellow star, three medal ribbons. Moves: *Coronhada*, *Chute Patriota*, *Ordem e Progresso*.

## Stage

The fight takes place on the Esplanada dos Ministérios with a stylized Congresso Nacional in the background (twin towers, Senate dome, Chamber bowl, tiny Brazilian flag). Bobbing crowd silhouettes line the floor. All scenery is canvas primitives — no image assets.

## Tech

- Pure HTML5 Canvas + vanilla JavaScript, all inline in `index.html`
- 60 Hz fixed-timestep engine with body-vs-body collision, hitstop, screen shake
- Vector-style character art rendered with bezier curves and gradients (no raster sprites)
- Comic-book hit effects (`PAU!`, `TCHAU!`, `PORRADA!`, etc.)
- Brazilian-flag-styled HUD: green border / yellow field / red damage / blue ★ indicator
- Touch controls and responsive layout for mobile play
- Roughly 3,600 lines, ~115 KB self-contained file

No build step. No `npm install`. Open `index.html` and it runs.

## Deploy

The repo includes `.github/workflows/pages.yml` which deploys `main` to GitHub Pages on every push. To enable:

1. Go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push any commit (or re-run the latest workflow). The site appears at `https://<owner>.github.io/<repo>/` within ~60 seconds.

Alternatively the file works on any static host — Netlify, Vercel, S3, Firebase Hosting, etc.

## Local development

```bash
git clone https://github.com/sbonholo/batalha-brasil.git
cd batalha-brasil
python3 -m http.server 8000
# open http://localhost:8000
```

Or just double-click `index.html` and it'll load via `file://`.

## License

[MIT](./LICENSE) — do whatever you like.

## Heritage

Originally prototyped in `sbonholo/vemk.app` on branch `claude/brazil-election-game-DW8gp` and split into a standalone repo for clarity. Built collaboratively with [Claude Code](https://claude.com/claude-code).
