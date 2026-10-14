# Quiet Corners Studio

A minimal sketching companion. Choose **how long** you have and a **medium**, and the app shows one reference picture to sketch, with a timer.

- **Lengths:** Quick (5–10 min, one small object) and Long (about 1 hour, a full scene). The app only offers lengths and media that have pictures; Short (20–30 min) and Deep (2+ hours) appear automatically once pictures for them are added.
- **Media:** Ink · Pencil · Ink + wash · Watercolour · Gouache (or Any).
- **Another one** picks a different picture, avoiding recent ones. 
- Choices are remembered on the device. No account, no tracking. Works offline after the first visit.

Open it: **https://nverma1122.github.io/Sketching/**

## Pictures

The reference pictures were generated in Canva for this app and live in `public/pics/`. Each is listed in `src/data/pictures.json` with its length (`level`), `medium`, `title` and size. To add pictures, drop the JPEG into `public/pics/` and add an entry; `npm test` checks every entry has a file.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # picture list + picking logic
npm run build    # production build into dist/
```

Every push to `main` or `claude/quiet-corners-studio-k40mvg` rebuilds and redeploys GitHub Pages.
