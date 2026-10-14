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

export const LEVELS: { key: Level; label: string; time: string; minutes: number; hint: string }[] = [
  { key: 'quick', label: 'Quick', time: '5–10 min', minutes: 10, hint: 'One small object' },
  { key: 'short', label: 'Short', time: '20–30 min', minutes: 30, hint: 'A small scene' },
  { key: 'long', label: 'Long', time: 'About 1 hour', minutes: 60, hint: 'A full scene' },
  { key: 'deep', label: 'Deep', time: '2+ hours', minutes: 120, hint: 'A rich, detailed scene' },
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
