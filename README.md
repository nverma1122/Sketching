# Quiet Corners Studio

A minimal sketching companion. Choose **how long** you have and a **medium**, and the app shows one reference picture to sketch, with a timer.

- **Lengths:** Quick (5–10 min, one small object) · Short (20–30 min, a small scene) · Long (about 1 hour, a full scene) · Deep (2+ hours, a rich, busy place).
- **Media:** Ink · Pencil · Ink + wash · Watercolour · Gouache (or Any).
- **Another one** picks a different picture, avoiding recent ones. Canva pictures and Wikimedia photos come up about equally often.
- Choices are remembered on the device. No account, no tracking. The Canva pictures work offline after the first visit; photos need a connection.

Open it: **https://nverma1122.github.io/Sketching/**

## Pictures

Two sources:

1. **Canva pictures** generated for this app, in `public/pics/` and listed in `src/data/pictures.json` with their length (`level`), `medium`, `title` and size. Quick has all five media; Long has ink + wash and watercolour. To add pictures, drop the JPEG into `public/pics/` and add an entry; `npm test` checks every entry has a file.
2. **Wikimedia Commons photos**, found live by the browser for every length (`src/lib/commons.ts`) using the search words in `src/data/photoQueries.ts` — single objects for Quick, small scenes for Short, street scenes for Long, famous busy places for Deep. Photos suit any medium. Maps, logos, small files and similar are filtered out, and each photo shows its author, licence and a link to its Commons page. Only the search words are sent to Wikimedia; results are cached for a week. If Commons can't be reached, the app says so and shows the nearest Canva picture.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # picture list, picking logic, Commons parsing
npm run build    # production build into dist/
```

Every push to `main` or `claude/quiet-corners-studio-k40mvg` rebuilds and redeploys GitHub Pages.
