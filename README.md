# Quiet Corners Studio

*Your personal sketching companion.* Less time deciding, more time drawing.

A calm, mobile-first web app for an urban sketcher. Open it, say how long you have and what you feel like, and it gives you **one** specific idea. Each idea comes with a composition guide, a drawing plan sized to your time, advice for your medium, one useful constraint and a reference. It then keeps a quiet record of what you drew.

Everything runs in the browser. There is no account, no server, no analytics and no paid API.

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
npm test           # unit tests: prompt library integrity + selection logic + plans
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
| Prompt library (135 ideas, plain typed data) | `src/data/prompts/*.ts` |
| Subjects, media, times, guidance text, closing lines | `src/data/taxonomy.ts` |
| Prompt selection and anti-repetition | `src/lib/selector.ts` |
| Time-boxed plans, simplification, medium guidance | `src/lib/plan.ts` |
| Storage: localStorage (small state) and IndexedDB (sessions, images) | `src/lib/storage/` |
| App state and actions | `src/lib/store.tsx` |
| Export (JSON, or ZIP with photos; dependency-free ZIP writer) | `src/lib/exportData.ts`, `src/lib/zip.ts` |
| Original schematic reference illustrations (inline SVG) | `src/components/Illustration.tsx` |
| Views | `src/views/` |
| Design tokens (colours, type, spacing, light and low-light themes) | `src/styles/tokens.css` |

### Adding or editing ideas

Open any file in `src/data/prompts/` and add an entry with `definePrompt({...})`. Every field is typed. Your editor will tell you if something is missing, and `npm test` checks that IDs are unique, every field is filled in, the reference illustration exists, and every time/medium pair still has ideas. You don't need to touch any component.

- `media`: the media the idea suits. The first one is the suggested medium.
- `time`: the suitable range, e.g. `['10', '20']`. `'40'` means 30–45 minutes.
- `steps`: subject-specific actions from biggest to smallest. The plan builder spreads them across 5, 10, 20 or 30–45 minutes and adds medium-specific stages.
- `simpler`: one sentence used by *Make it simpler*.
- `reference`: one of the illustration IDs in `src/data/referenceIds.ts`.

### How suggestions are chosen

1. The idea on screen is always excluded, and so are the last 40 ideas you saw. This history is kept in localStorage, so a refresh doesn't bring them back.
2. Among the ideas that match, one is picked at random, weighted. Ideas you attempted in the last three weeks or have saved are less likely. Ideas whose main medium and energy level fit yours are more likely.
3. If nothing fresh matches, filters are relaxed one at a time, least important first: **energy → time (neighbouring lengths) → subject (related subjects)**. The suggestion screen says exactly what was broadened.
4. Before dropping your subject or medium altogether, it will re-show ideas you saw a while ago (oldest first, never the last six). Only after that does it widen to any subject, and finally any medium.

Selection is synchronous, so there is no loading state.

### Image generation (future)

The core app never needs an image API. To add generated references later, put a small backend endpoint in front of the provider and keep the API key on the server, never in this frontend. Then add an option to `ReferencePanel` that calls it. User photos are stored locally per idea (IndexedDB `references` store) and are never uploaded.

## Privacy

- Data lives only in this browser: preferences and history in localStorage; sessions, artwork and photos in IndexedDB.
- No network requests are made apart from loading the app itself. Fonts are bundled.
- Export: *Settings → Export everything (.zip)*. The ZIP contains `data.json`, your artwork files and your reference photos.
- Erase: *Settings → Erase all my data* (asks you to confirm first).
- Browser storage doesn't sync between devices and can be lost if site data is cleared. The app can ask the browser to protect it from automatic clean-up.
