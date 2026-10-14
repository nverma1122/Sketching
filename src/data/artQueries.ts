import type { Level, Medium } from './pictures';

/**
 * Subjects for artwork searches, by length. Openverse matches every word of a
 * query, so each subject is a single short word or phrase.
 */
export const ART_SUBJECTS: Record<Level, string[]> = {
  quick: ['teapot', 'cup', 'chair', 'boat', 'lamp', 'tree', 'vase', 'bicycle', 'door', 'still life'],
  short: ['doorway', 'window', 'house', 'cottage', 'shop', 'cafe', 'gate', 'courtyard', 'well', 'barn'],
  long: ['street', 'market', 'village', 'harbour', 'bridge', 'church', 'square', 'farm', 'mill'],
  deep: ['city', 'cathedral', 'canal', 'town', 'port', 'panorama', 'palace', 'temple', 'view of'],
};

/** Museum collections on Openverse: every item is an artwork with a recorded medium. */
export const MUSEUMS = [
  'met',
  'clevelandmuseum',
  'rijksmuseum',
  'smk',
  'brooklynmuseum',
  'smithsonian_cooper_hewitt_museum',
  'smithsonian_american_art_museum',
  'nypl',
];

/** Medium words for museum searches (catalogue wording) and sketchbook searches (Flickr tags). */
export const MEDIUM_WORDS: Record<Medium, { museum: string; sketchbook: string }> = {
  ink: { museum: 'pen ink', sketchbook: 'ink sketch' },
  pencil: { museum: 'graphite', sketchbook: 'pencil sketch' },
  'ink-wash': { museum: 'pen wash', sketchbook: 'ink watercolor' },
  watercolour: { museum: 'watercolor', sketchbook: 'watercolor sketch' },
  gouache: { museum: 'gouache', sketchbook: 'gouache' },
};
