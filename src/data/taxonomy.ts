import type { Category, Energy, Level, Medium, TimeKey } from './types';

export const TIMES: { key: TimeKey; label: string; hint: string; minutes: number }[] = [
  { key: '5', label: '5 minutes', hint: 'A focused study of one part of a rich scene.', minutes: 5 },
  { key: '10', label: '10 minutes', hint: 'The main structure and the details that identify it.', minutes: 10 },
  { key: '20', label: '20 minutes', hint: 'The full composition, with hatching and shadow.', minutes: 20 },
  { key: '40', label: '30–45 minutes', hint: 'The complete scene with materials, tone and colour.', minutes: 40 },
  { key: '60', label: '1 hour', hint: 'An unhurried, layered drawing.', minutes: 60 },
  { key: '120', label: '2 hours or more', hint: 'A finished piece, over one or more sittings.', minutes: 120 },
];

export const TIME_ORDER: TimeKey[] = ['5', '10', '20', '40', '60', '120'];

export const timeLabel = (t: TimeKey) => TIMES.find((x) => x.key === t)!.label;
export const timeMinutes = (t: TimeKey) => TIMES.find((x) => x.key === t)!.minutes;

export const CATEGORIES: { key: Category; label: string; short: string }[] = [
  { key: 'urban', label: 'Urban sketching', short: 'Urban' },
  { key: 'shopfronts', label: 'Shopfronts and street corners', short: 'Shopfronts' },
  { key: 'architecture', label: 'Architecture and buildings', short: 'Architecture' },
  { key: 'still-life', label: 'Counters, tables and objects in their setting', short: 'Objects in place' },
  { key: 'windows', label: 'Windows, doors and balconies', short: 'Windows & doors' },
  { key: 'cafes', label: 'Cafés, tea stalls and small shops', short: 'Cafés & stalls' },
  { key: 'nature', label: 'Trees, plants and quiet corners', short: 'Trees & corners' },
];

export const categoryLabel = (c: Category) => CATEGORIES.find((x) => x.key === c)!.label;
export const categoryShort = (c: Category) => CATEGORIES.find((x) => x.key === c)!.short;

/** Categories that are close enough to stand in for one another when broadening. */
export const RELATED_CATEGORIES: Record<Category, Category[]> = {
  urban: ['shopfronts', 'architecture'],
  shopfronts: ['cafes', 'urban', 'windows'],
  architecture: ['urban', 'windows'],
  'still-life': ['cafes'],
  windows: ['architecture', 'shopfronts'],
  cafes: ['shopfronts', 'still-life'],
  nature: ['urban', 'still-life'],
};

export interface MediumInfo {
  key: Medium;
  label: string;
  short: string;
  blurb: string;
  /** Short, medium-specific principles. Scene-specific advice lives on each scene. */
  guidance: string[];
  /** How this medium handles a five-minute study. */
  quick: string;
  /** How this medium finishes a session. */
  finish: string;
}

export const MEDIA: MediumInfo[] = [
  {
    key: 'ink',
    label: 'Black-and-white ink',
    short: 'Ink',
    blurb: 'Confident lines, varied weight and the white of the page.',
    guidance: [
      'Establish the big architectural edges with confident, unhesitating lines — a wobble is fine, a scratchy correction is not.',
      'Keep a clear line-weight hierarchy: structure heaviest, openings and details lighter, distance lightest.',
      'Hatch selectively, only where a shadow helps the form read; let lit planes stay as paper.',
    ],
    quick: 'Commit to the main edges with one confident line each, then add one or two dark accents.',
    finish: 'Add two or three small, very dark accents to anchor the composition, then stop.',
  },
  {
    key: 'ink-wash',
    label: 'Ink with light watercolour washes',
    short: 'Ink & wash',
    blurb: 'Architectural ink structure with a few transparent washes.',
    guidance: [
      'Establish the structure with confident ink lines first, leaving some edges open rather than sealing every shape.',
      'Apply transparent colour in a few purposeful areas — light, material and shadow — not inside every enclosed shape.',
      'Preserve selected areas of white paper, then use a few darker ink or pigment marks to anchor the composition.',
    ],
    quick: 'Ink the key structure, then lay one transparent wash where the shadow or the main colour sits.',
    finish: 'Drop in the darkest accents with ink or a strong mix, keep the brightest whites untouched, and stop.',
  },
  {
    key: 'watercolour',
    label: 'Colour-first watercolour',
    short: 'Watercolour',
    blurb: 'Large colour masses, light and atmosphere before detail.',
    guidance: [
      'Begin with the large colour masses and their value relationships; protect the lightest areas from the first wash.',
      'Decide where the warm and cool areas sit before you mix, and keep to a limited palette so colours stay related.',
      'Add architectural detail last and sparingly, with a fine brush or a few lines — it should stay subordinate.',
    ],
    quick: 'Lay two or three connected colour masses in one wet pass, then one darker accent while it is damp.',
    finish: 'Add the darkest accents and a few crisp edges at the focal point while the rest stays soft.',
  },
  {
    key: 'pencil',
    label: 'Pencil or monochrome drawing',
    short: 'Pencil',
    blurb: 'Proportion, tonal masses and a few clear values.',
    guidance: [
      'Check proportions by sight-size before committing; place the main architectural edges lightly first.',
      'Group the scene into three tonal masses — light, middle and dark — and keep a few clear value differences.',
      'Use the side of the lead for masses and a sharp point only for the edges that matter.',
    ],
    quick: 'Block the light, middle and dark shapes of the study area with the side of the pencil.',
    finish: 'Press harder for the single darkest accent and sharpen one or two edges at the focal point.',
  },
  {
    key: 'hatching',
    label: 'Ink hatching and tonal studies',
    short: 'Hatching',
    blurb: 'Light direction, shadow shapes and controlled marks.',
    guidance: [
      'Decide the light direction before the first mark and keep it consistent across the whole scene.',
      'Draw the shadow shapes as shapes; build tone with evenly spaced strokes and cross-hatch only the darkest areas.',
      'Let lit planes stay bare and prefer fewer, deliberate marks over texture everywhere.',
    ],
    quick: 'Outline the study area lightly, then hatch its main shadow shape in one consistent direction.',
    finish: 'Cross-hatch only the darkest pocket of shadow, then stop.',
  },
];

export const mediumInfo = (m: Medium) => MEDIA.find((x) => x.key === m)!;
export const mediumLabel = (m: Medium) => mediumInfo(m).label;
export const mediumShort = (m: Medium) => mediumInfo(m).short;

export const ENERGIES: { key: Energy; label: string; hint: string }[] = [
  { key: 'low', label: 'Low energy', hint: 'Give me something simple and comforting.' },
  { key: 'explore', label: 'In the mood to explore', hint: 'Give me an achievable challenge.' },
  { key: 'focus', label: 'Ready to concentrate', hint: 'Give me something more involved.' },
];

export const energyLabel = (e: Energy) => ENERGIES.find((x) => x.key === e)!.label;

export const LEVELS: { key: Level; label: string; hint: string }[] = [
  { key: 'relaxed', label: 'Relaxed study', hint: 'A simpler subject, or a focused detail from a rich scene.' },
  { key: 'intermediate', label: 'Intermediate urban sketch', hint: 'A layered composition with architectural character and manageable perspective.' },
  { key: 'detailed', label: 'Detailed exploration', hint: 'Richer façades, more secondary elements, stronger tone and more colour.' },
];

export const LEVEL_SHORT: Record<Level, string> = { relaxed: 'Relaxed', intermediate: 'Intermediate', detailed: 'Detailed' };
export const levelLabel = (l: Level) => LEVELS.find((x) => x.key === l)!.label;

export const RICHNESS_LABELS: { key: keyof import('./types').Richness; label: string }[] = [
  { key: 'composition', label: 'Composition' },
  { key: 'detail', label: 'Architectural detail' },
  { key: 'perspective', label: 'Perspective' },
  { key: 'tone', label: 'Tone' },
  { key: 'colour', label: 'Colour' },
];

export const CLOSING_LINES: string[] = [
  'You are making a sketch, not a blueprint.',
  'Let the drawing keep a little of the looseness of the moment.',
  'A few honest lines are worth more than a careful copy.',
  'Stop when it says what you noticed. That is enough.',
  'The page does not need to be full to be finished.',
  'Leave a little room for the viewer to finish the scene.',
  'Draw what interests you and let the rest fall away.',
  'If it takes longer, it takes longer. There is no clock you have to beat.',
  'This is a conversation with the street, not an exam.',
  'Notice first, draw second, judge never.',
  'White paper is part of the drawing.',
  'One quiet corner, one page. Nothing more is asked.',
];
