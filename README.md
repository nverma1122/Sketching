# Quiet Corners Studio

A minimal sketching companion. Choose **how long** you have and a **medium**, and the app shows one reference picture to sketch, with a timer.

- **Lengths:** Quick (5–10 min, one small object) · Short (20–30 min, a small scene) · Long (about 1 hour, a full scene) · Deep (2+ hours, a rich, busy place).
- **Media:** Ink · Pencil · Ink + wash · Watercolour · Gouache (or Any).
- **Another one** picks a different picture, avoiding recent ones. Canva pictures, photos and your own pictures come up about equally often.
- **+ Add my own picture** saves a photo or screenshot with a length, medium and name. It stays only in this browser (IndexedDB), is never uploaded and never appears on the public site; **Remove** deletes it.
- Choices are remembered on the device. No account, no tracking. The Canva pictures work offline after the first visit; photos need a connection.

Open it: **https://nverma1122.github.io/Sketching/**

## Pictures

Three sources:

1. **Canva pictures** generated for this app, in `public/pics/` and listed in `src/data/pictures.json` with their length (`level`), `medium`, `title` and size. Quick has all five media; Long has ink + wash and watercolour. To add pictures, drop the JPEG into `public/pics/` and add an entry; `npm test` checks every entry has a file.
2. **Photos from Wikimedia Commons and Openverse**, found live by the browser for every length using the search words in `src/data/photoQueries.ts` — single objects for Quick, small scenes for Short, street scenes for Long, famous busy places for Deep. Each search alternates between Commons (`src/lib/commons.ts`) and Openverse (`src/lib/openverse.ts`, Flickr and other Creative Commons collections; anonymous use, about 20 searches a minute / 200 a day). Photos suit any medium. Maps, logos, small files and mature or sensitive results are filtered out, and each photo shows its author, licence and a link to its source page. Only the search words are sent; results are cached for a week (`src/lib/photoCache.ts`). If neither library can be reached, the app says so and shows the nearest Canva picture.
3. **Your own pictures**, kept on your device (`src/lib/mine.ts`).

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # picture list, picking logic, Commons + Openverse parsing
npm run build    # production build into dist/
```

Every push to `main` or `claude/quiet-corners-studio-k40mvg` rebuilds and redeploys GitHub Pages.
