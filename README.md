# Quiet Corners Studio

*Your personal sketching companion.* Less time deciding, more time drawing.

A calm, mobile-first web app for an urban sketcher. Open it, say how long you have and what you feel like, and it gives you **one** rich urban scene. Each scene comes with composition, line, hatching, shadow and colour guidance, a plan that adapts the approach to your time, advice for your medium, one useful constraint and a reference. It then keeps a quiet record of what you drew.

Everything runs in the browser. There is no account, no server, no analytics and no paid API. The only outside requests are searches for real reference photos on Wikimedia Commons, which you can switch off in Settings.

## Open it

Online (once GitHub Pages is switched on): **https://nverma1122.github.io/Sketching/**

Every push to `main` or `claude/quiet-corners-studio-k40mvg` runs the tests, builds the app and redeploys it (`.github/workflows/deploy-pages.yml`). To switch it on the first time, go to *Settings → Pages → Build and deployment → Source* and choose **GitHub Actions**.

## Run it locally

Requires Node.js 18+ (tested with Node 22).

```bash
npm install
npm run dev        # development server on http://localhost:5173
```

Other scripts:

```bash
npm test           # unit tests: scene library integrity + selection logic + plans
npm run examples   # regenerate docs/examples.md from the real library
npm run build      # type-check and production build into dist/
npm run preview    # serve the production build on http://localhost:4173
```

## Use it on your phone

**Same Wi-Fi (quickest):** run `npm run dev` (or `npm run build && npm run preview`). Vite prints a `Network:` address such as `http://192.168.1.20:5173`. Open that address on your phone.

**Install it like an app:** host the `dist/` folder on any static host with HTTPS, such as GitHub Pages, Netlify or Cloudflare Pages. The build uses relative paths and hash routing, so it works from a sub-folder with no server configuration. Open it on your phone and choose *Add to Home Screen* (Safari) or *Install app* (Chrome). After one visit the app shell is cached by a service worker, so it opens offline. Installation and offline caching need HTTPS. They do not work over the plain-HTTP LAN address.

Your data stays in the browser where you created it. A phone and a laptop each keep their own sketchbook. Use *Settings → Export* to keep a copy.

## What's inside

| Area | Where |
| --- | --- |
| Scene library: 162 urban-sketching scenes with full per-scene guidance (plain typed data) | `src/data/prompts/*.ts` |
| Illustrated references (the artist's sketches and collection) and the scenes they suit | `public/refs/`, `src/data/illustrated.ts` |
| Personal reference library: matching and storage | `src/lib/library.ts`, `src/lib/store.tsx` |
| Worked examples generated from the real library (`npm run examples`) | `docs/examples.md` |
| Wikimedia Commons photo search, with credits and caching | `src/lib/commons.ts` |
| Subjects, media, times, sketching levels, medium guidance, closing lines | `src/data/taxonomy.ts` |
| Scene selection and anti-repetition | `src/lib/selector.ts` |
| Time-based approaches (study → structure → composition → complete scene) | `src/lib/plan.ts` |
| Composition guides in an ink-sketch style (13 templates), with focus regions | `src/components/SceneGuide.tsx`, `src/data/regions.ts` |
| Storage: localStorage (small state) and IndexedDB (sessions, images) | `src/lib/storage/` |
| App state and actions | `src/lib/store.tsx` |
| Export (JSON, or ZIP with photos; dependency-free ZIP writer) | `src/lib/exportData.ts`, `src/lib/zip.ts` |
| Views | `src/views/` |
| Design tokens (colours, type, spacing, light and low-light themes) | `src/styles/tokens.css` |

### The scene model

Every entry is a rich, specific scene — shopfronts, cafés, bookshops, old façades, windows and balconies, lanes, tea stalls, quiet corners — with several meaningful elements. Instead of a single difficulty, each scene is scored 1–3 on five dimensions:

- **composition** (number and relationship of elements), **detail** (doors, windows, signs, awnings, textures), **perspective** (1 frontal, 2 angled, 3 corner or lane), **tone** (light and shadow shapes) and **colour** (palette, layering, temperature).

The sketching level is derived from the total (≤8 relaxed study, 9–11 intermediate urban sketch, ≥12 detailed exploration), and `fullTime` says roughly how long the complete scene takes.

Each scene carries: `scene`, `why`, viewpoint (`view`), geometric `structure`, `focal` point and `secondary` elements, `perspective` cues, `negative` space, line-weight hierarchy (`lines`), three or four places to `hatch`, main `shadows`, an optional `palette` and where the `washes` go, what to leave `unfinished`, and the time-based approaches: `study` (5-minute focused study of one guide region), `ten`, `twenty` and `long`. It also has a `guide` spec for its schematic composition guide and `photo` title words for Wikimedia Commons.

### Adding or editing scenes

Add an entry with `scene({...})` (imported as `s`) in any file in `src/data/prompts/`. Write `rich: [composition, detail, perspective, tone, colour]`; the level is computed. `study.region` must be one of the regions of the guide template (see `src/data/regions.ts`). `npm test` checks unique IDs and titles, that every guidance field is substantial, that there are 3–4 hatch places and at least three secondary elements, that study regions are valid, and that every scene has photo search words.

### Time never lowers the ambition

Session length is not used to pick the scene. It changes the approach to the same scene:

| Time | Approach |
| --- | --- |
| 5 minutes | **Focused study** of one meaningful part (the guide shows the full scene with that part framed) |
| 10 minutes | **Main structure** plus the details that identify the scene |
| 20 minutes | **Full composition** with secondary details, selective hatching and the main light and shadow |
| 30–45 minutes and longer | **Complete scene** with materials, tonal depth and colour, and deliberate unfinished areas |

*Make it simpler* keeps the scene and the time and steps the approach down (e.g. 20 min → structure → focused study).

### Sketching level

*Settings → Sketching level* (also on the finder) is saved on the device: **Relaxed study**, **Intermediate urban sketch** (default) or **Detailed exploration**. It chooses which scenes you are offered and how much guidance each plan carries (two hatch places for relaxed, all of them and extra medium strategy for detailed). It is independent of session length. Older saved levels are migrated (Advanced/Experienced → Intermediate, Developing → Relaxed).

### How suggestions are chosen

1. The scene on screen is always excluded, and so are the last 40 scenes you saw (kept in localStorage).
2. Among matching scenes, one is picked at random, weighted. Scenes you attempted in the last three weeks or have saved are less likely; scenes whose suggested medium is yours are more likely. Energy only shades the choice within your level.
3. Level is the most important filter, then medium, then subject. If nothing fresh matches, the subject is relaxed first (related subjects, then any), then older history is allowed (oldest first, never the last six), and only then a neighbouring level, any level and finally any medium. The suggestion screen says exactly what was relaxed.

### References, in order of preference

1. **My photo** — a photo you attach to one scene.
2. **Illustrations** — 32 illustrated references bundled with the app: ten of your own sketches (harbour, riverside, hill street, bougainvillea door, 書店 bookshop, corner coffee house, किराना स्टोर, narrow timber house, Kerala house, blue stair house) and illustrations from your collection, cropped from the grids. Each is paired with the scenes it suits in `src/data/illustrated.ts`; your sketches come first. They are part of the public site.
3. **My library** — your own inspiration images, added under *My Sketchbook → Reference library* with tags. They appear on scenes whose title or tags share words with the image's title or tags, or that you link from the scene (*Link images from my library*). They stay in this browser's IndexedDB and are included in the ZIP export.
4. **Photos** — freely licensed Wikimedia Commons photos (below).
5. **Composition guide** — the schematic drawing, always available offline.

### Vignettes and signs

Every plan includes vignette framing for its kind of scene (hero building or view in the middle, neighbours lighter, washes stopping short of the page edges). Scenes whose signs carry kanji or Devanagari get advice on lettering them; the guides draw those scripts as glyph shapes.

### Reference photos and composition guides

Each scene searches Wikimedia Commons for freely licensed photos whose titles contain its search words, e.g. `intitle:tea intitle:stall`, trying the most specific words first. Maps, logos, drawings and small images are filtered out; each photo shows the photographer, the licence and a link to its Commons page. Results are cached for a week. When nothing suitable is found the app says so — it never pretends a reference exists.

The **composition guide** is a schematic drawing generated from the scene's `guide` spec (floors, bays, awning, signs and their script, balconies, cables, utility poles, A-frame boards, bicycles, trucks, plants, trees, wet pavement…), drawn in an ink-sketch manner with selective hatching, scalloped foliage and vignetted washes. Templates: shopfront, corner, lane, façade, stall, doorway, street, café, waterfront, riverside, hill-street view, village/Kerala house and stair alley. It is always labelled *Composition guide (schematic)* and is not a photograph. For a focused study it frames the part of the scene to draw. Your own photos can be added per scene and always take priority.

### Image generation (future)

The core app never needs an image API. To add generated references later, put a small backend endpoint in front of the provider and keep the API key on the server, never in this frontend. Then add an option to `ReferencePanel` that calls it. User photos are stored locally per idea (IndexedDB `references` store) and are never uploaded.

## Privacy

- Data lives only in this browser: preferences and history in localStorage; sessions, artwork and photos in IndexedDB.
- No network requests are made apart from loading the app itself and (if enabled) Wikimedia Commons photo searches, which send only the scene's search words. Fonts are bundled.
- Export: *Settings → Export everything (.zip)*. The ZIP contains `data.json`, your artwork files and your reference photos.
- Erase: *Settings → Erase all my data* (asks you to confirm first).
- Browser storage doesn't sync between devices and can be lost if site data is cleared. The app can ask the browser to protect it from automatic clean-up.
