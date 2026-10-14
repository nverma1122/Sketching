# Quiet Corners Studio

A minimal sketching companion. Choose **how long** you have and a **medium**, and the app shows one reference picture to sketch, with a timer.

- **Lengths:** Quick (5–10 min, one small object) · Short (20–30 min, a small scene) · Long (about 1 hour, a full scene) · Deep (2+ hours, a rich, busy place).
- **Media:** Ink · Pencil · Ink + wash · Watercolour · Gouache (or Any).
- **Another one** picks a different picture, avoiding recent ones. Choosing a medium shows only pictures in that medium (Canva pictures, artworks, and your own pictures saved for it); photos appear only with **Any**.
- **+ Add my own picture** saves a photo or screenshot with a length, medium and name. It stays only in this browser (IndexedDB), is never uploaded and never appears on the public site; **Remove** deletes it.
- Choices are remembered on the device. No account, no tracking. The Canva pictures work offline after the first visit; photos need a connection.

Open it: **https://nverma1122.github.io/Sketching/**

## Pictures

Four sources:

1. **Canva pictures** generated for this app, in `public/pics/` and listed in `src/data/pictures.json` with their length (`level`), `medium`, `title` and size. To add pictures, drop the JPEG into `public/pics/` and add an entry; `npm test` checks every entry has a file.
2. **Artworks** (drawings and paintings) from Openverse, found live by the browser (`src/lib/artworks.ts`). Each search pairs a medium with a subject for the length (`src/data/artQueries.ts`: objects for Quick, doorways and shops for Short, streets and harbours for Long, cities and cathedrals for Deep). Museum collections come first (the Met, Cleveland, Rijksmuseum, SMK, Brooklyn, Cooper Hewitt, Smithsonian American Art, NYPL), then sketchbook uploads on Flickr. Every result's medium is worked out from its catalogue text or tags ("Pen and black ink over graphite" → Ink; "Pen and brown ink, brown wash" → Ink + wash) and it is kept only if that matches the medium searched for. Adult, digital, cartoon, portrait, photo-of-a-drawing and tag-spam results are filtered out.
3. **Photos** from Wikimedia Commons and Openverse (`src/lib/commons.ts`, `src/lib/openverse.ts`), only when the medium is **Any**.
4. **Your own pictures**, kept on your device (`src/lib/mine.ts`).

Each artwork and photo shows its author, licence and a link to its source page. Only search words are sent; results are cached for a week (`src/lib/photoCache.ts`). Openverse allows about 20 anonymous searches a minute and 200 a day; each "Another one" makes at most one search. If nothing can be reached, the app says so and shows the nearest Canva picture — keeping the medium and changing the length first.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # picture list, picking logic, medium classification, Commons + Openverse parsing
npm run build    # production build into dist/
```

Every push to `main` or `claude/quiet-corners-studio-k40mvg` rebuilds and redeploys GitHub Pages.
