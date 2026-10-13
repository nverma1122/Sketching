import type { Category, Energy, Level, Medium, TimeKey } from './types';

export const TIMES: { key: TimeKey; label: string; hint: string; minutes: number }[] = [
  { key: '5', label: '5 minutes', hint: 'Just a little sketch.', minutes: 5 },
  { key: '10', label: '10 minutes', hint: 'A quick drawing session.', minutes: 10 },
  { key: '20', label: '20 minutes', hint: 'Time to explore.', minutes: 20 },
  { key: '40', label: '30–45 minutes', hint: 'Settle into a longer sketch.', minutes: 40 },
  { key: '60', label: '1 hour', hint: 'A full, unhurried drawing.', minutes: 60 },
  { key: '120', label: '2 hours or more', hint: 'A finished piece, over one or more sittings.', minutes: 120 },
];

export const TIME_ORDER: TimeKey[] = ['5', '10', '20', '40', '60', '120'];

export const timeLabel = (t: TimeKey) => TIMES.find((x) => x.key === t)!.label;
export const timeMinutes = (t: TimeKey) => TIMES.find((x) => x.key === t)!.minutes;

export const CATEGORIES: { key: Category; label: string; short: string }[] = [
  { key: 'urban', label: 'Urban sketching', short: 'Urban' },
  { key: 'shopfronts', label: 'Shopfronts and street corners', short: 'Shopfronts' },
  { key: 'architecture', label: 'Architecture and buildings', short: 'Architecture' },
  { key: 'still-life', label: 'Everyday objects and still life', short: 'Still life' },
  { key: 'windows', label: 'Windows, doors and balconies', short: 'Windows & doors' },
  { key: 'cafes', label: 'Cafés, tea stalls and small shops', short: 'Cafés & stalls' },
  { key: 'nature', label: 'Plants, trees and quiet outdoor spaces', short: 'Trees & plants' },
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
  guidance: string[];
  /** Easy constraints used when a suggestion is simplified. */
  easyConstraints: string[];
}

export const MEDIA: MediumInfo[] = [
  {
    key: 'ink',
    label: 'Black-and-white ink',
    short: 'Ink',
    blurb: 'Clear shapes, line variation and the white of the page.',
    guidance: [
      'Look for the big, clear shapes first; let a confident line describe each one.',
      'Vary your line weight: heavier where forms turn away or sit in shadow, lighter for distance.',
      'Use negative space — the sky, a pale wall, an empty table — as an active shape.',
      'Hatch selectively, only where a shadow helps the form read.',
      'Leave some areas unfinished. You do not need to outline every object.',
    ],
    easyConstraints: [
      'Use a single pen and do not stop to correct anything.',
      'Draw only the outer silhouette and one interior detail.',
    ],
  },
  {
    key: 'ink-wash',
    label: 'Ink with light watercolour washes',
    short: 'Ink & wash',
    blurb: 'An ink structure with a few transparent washes.',
    guidance: [
      'Establish the main structure in ink first; keep the lines open rather than sealed.',
      'Choose two or three areas for transparent washes — no more.',
      'Keep a restrained palette and let washes cross the lines a little.',
      'Preserve the white of the paper for the brightest planes.',
      'Avoid painting every enclosed shape; colour is an accent, not a fill.',
    ],
    easyConstraints: [
      'Use one wash colour only, in a single pass.',
      'Ink the subject, then add one pale wash to the shadow side only.',
    ],
  },
  {
    key: 'watercolour',
    label: 'Colour-first watercolour',
    short: 'Watercolour',
    blurb: 'Large colour masses and value before any detail.',
    guidance: [
      'Begin with large colour masses and their value relationships, not outlines.',
      'Decide where the warm areas and the cool areas sit before you mix.',
      'Work from a limited palette so the colours stay related.',
      'Protect your lightest areas from the very first wash.',
      'Keep fine details subordinate — add them last, sparingly, or not at all.',
    ],
    easyConstraints: [
      'Paint in a single wet layer, with no going back in.',
      'Use only two pigments and the white of the paper.',
    ],
  },
  {
    key: 'pencil',
    label: 'Pencil or monochrome drawing',
    short: 'Pencil',
    blurb: 'Proportion, simple tonal masses and a few clear values.',
    guidance: [
      'Check proportions with your pencil held at arm’s length before committing.',
      'Group the scene into three simple tonal masses: light, middle and dark.',
      'Keep a few clear value differences rather than many subtle ones.',
      'Use the side of the lead for masses and the point for the few edges that matter.',
    ],
    easyConstraints: [
      'Use only two values: the paper and one mid-tone.',
      'Draw with the side of the pencil — no sharp lines at all.',
    ],
  },
  {
    key: 'hatching',
    label: 'Ink hatching and tonal studies',
    short: 'Hatching',
    blurb: 'Light direction, shadow shapes and controlled marks.',
    guidance: [
      'Decide the light direction before you make a mark, and keep it consistent.',
      'Find the shadow shapes — cast and form shadows — and draw them as shapes.',
      'Build tone with controlled, evenly spaced marks; cross-hatch only the darkest areas.',
      'Let a light area stay as bare paper rather than describing it.',
      'Prefer fewer, deliberate marks over excessive detail.',
    ],
    easyConstraints: [
      'Hatch in one direction only — no cross-hatching.',
      'Hatch only the single darkest shadow shape.',
    ],
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

export const DIFFICULTY_LABEL: Record<1 | 2 | 3 | 4, string> = {
  1: 'Gentle',
  2: 'Moderate',
  3: 'Involved',
  4: 'Advanced',
};

export const LEVELS: { key: Level; label: string; hint: string }[] = [
  { key: 'developing', label: 'Developing', hint: 'Favour gentle, confidence-building ideas.' },
  { key: 'experienced', label: 'Experienced', hint: 'A balanced mix of quick studies and fuller scenes.' },
  { key: 'advanced', label: 'Advanced', hint: 'Favour complex compositions, perspective and long sittings.' },
];

export const CLOSING_LINES: string[] = [
  'You are making a sketch, not a blueprint.',
  'Let the drawing keep a little of the looseness of the moment.',
  'A few honest lines are worth more than a careful copy.',
  'Stop when it says what you noticed. That is enough.',
  'The page does not need to be full to be finished.',
  'Wobbly lines are still lines that describe something you saw.',
  'Draw what interests you and let the rest fall away.',
  'If it takes longer, it takes longer. There is no clock you have to beat.',
  'Leave a little room for the viewer to finish the scene.',
  'This is a conversation with the subject, not an exam.',
  'Notice first, draw second, judge never.',
  'One quiet corner, one page. Nothing more is asked.',
];

const LOW: Record<TimeKey, string> = { '5': '5 min', '10': '10 min', '20': '20 min', '40': '30 min', '60': '1 h', '120': '2 h' };
const HIGH: Record<TimeKey, string> = { '5': '5 min', '10': '10 min', '20': '20 min', '40': '45 min', '60': '1 h', '120': '2 h+' };

/** Compact label for a prompt's suitable time range, e.g. "10 min–20 min". */
export const rangeLabel = ([a, b]: [TimeKey, TimeKey]) =>
  a === b ? (a === '40' ? '30–45 min' : HIGH[a]) : `${LOW[a]} – ${HIGH[b]}`;
