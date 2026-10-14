import data from './pictures.json';

export type Level = 'quick' | 'short' | 'long' | 'deep';
export type Medium = 'ink' | 'pencil' | 'ink-wash' | 'watercolour' | 'gouache';

export interface Picture {
  id: string;
  level: Level;
  medium: Medium;
  title: string;
  w: number;
  h: number;
}

export const LEVELS: {
  key: Level;
  label: string;
  time: string;
  minutes: number;
  hint: string;
}[] = [
  {
    key: 'quick',
    label: 'Quick',
    time: '5–10 min',
    minutes: 10,
    hint: 'One small object',
  },
  {
    key: 'short',
    label: 'Short',
    time: '20–30 min',
    minutes: 30,
    hint: 'A small scene',
  },
  {
    key: 'long',
    label: 'Long',
    time: 'About 1 hour',
    minutes: 60,
    hint: 'A full scene',
  },
  {
    key: 'deep',
    label: 'Deep',
    time: '2+ hours',
    minutes: 120,
    hint: 'A rich, detailed scene',
  },
];

export const MEDIA: { key: Medium; label: string }[] = [
  { key: 'ink', label: 'Ink' },
  { key: 'pencil', label: 'Pencil' },
  { key: 'ink-wash', label: 'Ink + wash' },
  { key: 'watercolour', label: 'Watercolour' },
  { key: 'gouache', label: 'Gouache' },
];

export const levelInfo = (l: Level) => LEVELS.find((x) => x.key === l)!;
export const mediumLabel = (m: Medium) => MEDIA.find((x) => x.key === m)!.label;
export const pictureSrc = (p: Picture) => `pics/${p.id}.jpg`;

/** Reference pictures generated in Canva; files live in public/pics/. */
export const PICTURES = data as Picture[];

/** Anything the app can show: a bundled Canva picture, a found photo, or one of the user's own pictures. */
export interface Item {
  id: string;
  kind: 'canva' | 'art' | 'photo' | 'mine';
  level: Level;
  /** Canva pictures have a medium; photos (and own pictures saved for any medium) suit every medium. */
  medium?: Medium;
  title: string;
  src: string;
  large: string;
  w: number;
  h: number;
  credit?: { artist: string; license: string; licenseUrl?: string; page: string; source: string };
}

export const CANVA: Item[] = PICTURES.map((p) => ({
  id: p.id,
  kind: 'canva',
  level: p.level,
  medium: p.medium,
  title: p.title,
  src: pictureSrc(p),
  large: pictureSrc(p),
  w: p.w,
  h: p.h,
}));
