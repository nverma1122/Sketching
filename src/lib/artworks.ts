// Artworks (drawings and paintings) from Openverse, sorted by their real
// medium. Museum collections record the medium precisely ("Pen and black ink
// over graphite"); sketchbook uploads on Flickr carry it in their tags. Each
// result is classified from its title and tags, and kept only when the medium
// matches what was searched for, so Watercolour shows watercolours and Ink
// shows ink drawings.

import { MEDIUM_WORDS, MUSEUMS } from '../data/artQueries';
import type { Item, Level, Medium } from '../data/pictures';
import { API, PAGE_SIZE, licenseName, providerName, type Result } from './openverse';
import { cached, remember } from './photoCache';

interface Tag {
  name: string;
  unstable__provider?: string;
}
type ArtResult = Result & { tags?: Tag[]; category?: string | null };

const MUSEUM_NAMES: Record<string, string> = {
  met: 'The Met',
  clevelandmuseum: 'Cleveland Museum of Art',
  rijksmuseum: 'Rijksmuseum',
  smk: 'SMK',
  brooklynmuseum: 'Brooklyn Museum',
  smithsonian_cooper_hewitt_museum: 'Cooper Hewitt',
  smithsonian_american_art_museum: 'Smithsonian American Art Museum',
  nypl: 'New York Public Library',
};

/** Words that rule a result out anywhere: adult content, digital art, cartoons, portraits. */
const BLOCK =
  /\b(nudes?|naked|erotic|sexy?|bdsm|boobs?|babe|lingerie|pin-?up|portraits?|selfie|anime|manga|chibi|cartoons?|comics?|caricature|digital|digitalart|photoshop|akvis|topaz|photomanipulation|collage|fashion|meme|abstract|ai art|midjourney)\b/i;
/** Extra words that rule out a Flickr upload: people-focused or children's pictures, tag spammers. */
const BLOCK_SKETCHBOOK = /\b(akab|man|men|male|girls?|woman|women|lady|tatt?oos?|kids?|child)\b/i;
/** Camera words: a photo of something, not a drawing of it. */
const PHOTO =
  /\b(canon\w*|nikon\w*|sony|fuji\w*|leica\w*|olympus|camera|lens|photography|photographer|photo|photos|candid|streetphotography|availablelight|hdr|bokeh|iphoneography|\d+mm)\b/i;
/** Museum objects that are designs or decoration rather than scenes. */
const NOT_SCENE = /\b(design for|elevation|ornament\w*|wallpaper|textile|furniture|jewel\w*|costume|pattern)\b/i;
/** Signs, besides the medium itself, that a Flickr upload is a hand-made sketch or painting. */
const ART = /(sketch|drawing|drawn|croquis|dessin|dibujo|painting|painted|urbansketch|\busk\b|carnet|plein ?air|moleskine|illustration|artwork)/i;

/** Media this app doesn't offer (oil, prints, pastel…). */
const OTHER_MEDIUM = /\b(oil|acrylic|pastel|charcoal|crayons?|kredki|etching|engraving|lithograph|woodcut|print|photograph)\b/i;

/** Work out the medium from catalogue text or tags; undefined when unclear or another medium. */
export function classifyMedium(text: string): Medium | undefined {
  const t = text.toLowerCase();
  const gouache = /gouache|bodycolou?r/.test(t);
  const watercolour = /watercolou?r|aquarel|acuarel|acquerell/.test(t);
  const ink = /\b(ink|inks|pen|fineliner|encre|tinta|india ?ink|indiaink|penandink)\b/.test(t);
  const wash = /\bwash(ed)?\b|lavis/.test(t);
  const pencil = /\b(pencil|graphite|lead)\b/.test(t);
  const other = OTHER_MEDIUM.test(t);
  if (gouache) return 'gouache';
  if (ink && (watercolour || wash)) return 'ink-wash';
  if (watercolour) return 'watercolour';
  if (ink) return 'ink';
  if (pencil && !other) return 'pencil';
  return undefined;
}

/** Display-size and full-size URLs; museum originals can be very large. */
export function imageUrls(r: { url: string; source?: string }): { src: string; large: string } {
  if (r.url.includes('images.metmuseum.org/') && r.url.includes('/original/')) {
    // Originals can be tens of megabytes; web-large is plenty on screen (the museum page has full size).
    const web = r.url.replace('/original/', '/web-large/');
    return { src: web, large: web };
  }
  if (r.url.includes('ids.si.edu/ids/deliveryService')) {
    return { src: `${r.url}&max=1400`, large: `${r.url}&max=3000` };
  }
  return { src: r.url, large: r.url };
}

/** Parse an Openverse response into artwork items of the wanted medium (exported for tests). */
export function parseArtworks(data: unknown, level: Level, want: Medium): Item[] {
  const results = ((data as { results?: ArtResult[] })?.results ?? []) as ArtResult[];
  const out: Item[] = [];
  const seen = new Set<string>(); // museums often list several photos of one artwork
  for (const r of results) {
    if (!r?.url || r.mature || r.unstable__sensitivity?.length) continue;
    const page = r.foreign_landing_url || `https://openverse.org/image/${r.id}`;
    if (seen.has(page)) continue;
    const source = r.source ?? r.provider ?? '';
    const museum = MUSEUMS.includes(source);
    const tags = (r.tags ?? []).filter((t) => t.unstable__provider !== 'clarifai').map((t) => t.name);
    const title = (r.title ?? '').trim();
    const text = `${title} | ${tags.join(' | ')}`;
    if (BLOCK.test(text)) continue;
    if (museum && NOT_SCENE.test(text)) continue;
    if (!museum) {
      if (PHOTO.test(text) || BLOCK_SKETCHBOOK.test(text)) continue;
      if (tags.length > 35) continue; // tag-spam accounts
      if (!ART.test(text)) continue;
      const w = r.width ?? 0;
      const h = r.height ?? 0;
      if (Math.max(w, h) < 700 || Math.min(w, h) < 400) continue;
    }
    // Sketchbook uploads must name the medium. Museum searches already matched
    // the medium in the catalogue description, so accept those unless the
    // title or tags name a different medium.
    const got = classifyMedium(text);
    if (got ? got !== want : !museum || OTHER_MEDIUM.test(text)) continue;
    seen.add(page);
    const { src, large } = imageUrls(r);
    const name = title || 'Untitled';
    out.push({
      id: `a${r.id}`,
      kind: 'art',
      level,
      medium: want,
      title: name[0].toUpperCase() + name.slice(1),
      src,
      large,
      w: r.width ?? 0,
      h: r.height ?? 0,
      credit: {
        artist: (r.creator ?? '').trim().slice(0, 100) || 'Unknown artist',
        license: licenseName(r),
        licenseUrl: r.license_url ?? undefined,
        page,
        source: `${MUSEUM_NAMES[source] ?? providerName(source)} via Openverse`,
      },
    });
  }
  return out;
}

export type ArtPlace = 'museum' | 'sketchbook';

export const artSearchUrl = (place: ArtPlace, medium: Medium, subject: string) => {
  const words = MEDIUM_WORDS[medium][place];
  const params = new URLSearchParams({ q: `${words} ${subject}`, page_size: String(PAGE_SIZE), mature: 'false' });
  params.set('source', place === 'museum' ? MUSEUMS.join(',') : 'flickr');
  return `${API}?${params}`;
};

/** Artworks of one medium and subject (cached for a week). */
export async function searchArtworks(place: ArtPlace, medium: Medium, subject: string, level: Level, signal?: AbortSignal): Promise<Item[]> {
  const key = `art:${place}:${medium}:${level}:${subject}`;
  const hit = cached(key);
  if (hit) return hit;
  const res = await fetch(artSearchUrl(place, medium, subject), { signal });
  if (!res.ok) throw new Error(`Openverse responded ${res.status}`);
  const items = parseArtworks(await res.json(), level, medium);
  remember(key, items);
  return items;
}
