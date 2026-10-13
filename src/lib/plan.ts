import type { Level, Medium, SketchPrompt, Suggestion, TimeKey } from '../data/types';
import { CLOSING_LINES, mediumInfo } from '../data/taxonomy';
import { regionLabel } from '../data/regions';
import { hashString } from './random';

/**
 * Turns a scene into a plan for the chosen time, medium and sketching level.
 *
 * The scene itself never gets simpler when the time is short. Instead the
 * *approach* changes:
 *   5 min      → a focused study of one meaningful part of the scene
 *   10 min     → the main structure plus the identifying details
 *   20 min     → the full composition with secondary details, hatching, light
 *   30 min +   → the complete scene with materials, tonal depth and colour
 * "Make it simpler" steps down the approach while keeping the time.
 */

export type Approach = 'study' | 'structure' | 'composition' | 'complete';

export const APPROACH_LABEL: Record<Approach, string> = {
  study: 'Focused study',
  structure: 'Main structure',
  composition: 'Full composition',
  complete: 'Complete scene',
};

export interface PlanStep {
  label: string;
  text: string;
}

export interface GuideItem {
  label: string;
  text: string;
}

export interface BuiltSuggestion {
  prompt: SketchPrompt;
  time: TimeKey;
  medium: Medium;
  level: Level;
  simplified: number;
  approach: Approach;
  /** One sentence describing what this session covers of the scene. */
  approachSummary: string;
  /** Region key of the guide to highlight (focused study only). */
  focusRegion?: string;
  focusLabel?: string;
  composition: GuideItem[];
  lineTone: { lines: string; hatch: string[]; shadows: string };
  /** Colour plan; `optional` when the medium does not need it. */
  colour: { palette: string[]; washes: string; optional: boolean };
  unfinished: string;
  plan: PlanStep[];
  mediumGuidance: string[];
  constraint: string;
  closing: string;
}

export const MAX_SIMPLIFY = 2;

/** Minutes each time choice spans; 30–45 is planned to 45. */
const SPAN: Record<TimeKey, number> = { '5': 5, '10': 10, '20': 20, '40': 45, '60': 60, '120': 120 };

const BASE_APPROACH: Record<TimeKey, Approach> = {
  '5': 'study',
  '10': 'structure',
  '20': 'composition',
  '40': 'complete',
  '60': 'complete',
  '120': 'complete',
};

const ORDER: Approach[] = ['study', 'structure', 'composition', 'complete'];

export function approachFor(time: TimeKey, simplified = 0): Approach {
  const base = BASE_APPROACH[time];
  if (simplified >= 2) return 'study';
  if (simplified === 1) return ORDER[Math.max(0, ORDER.indexOf(base) - 1)];
  return base;
}

const WASH_MEDIA: Medium[] = ['ink-wash', 'watercolour'];

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const sentence = (s: string) => {
  const t = cap(s.trim());
  return /[.!?]$/.test(t) ? t : `${t}.`;
};
const firstSentence = (s: string) => {
  const m = s.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : s).trim();
};
const list = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/** How many hatch places and secondary elements each level carries. */
const HATCH_COUNT: Record<Level, number> = { relaxed: 2, intermediate: 3, detailed: 4 };
const SECONDARY_COUNT: Record<Level, number> = { relaxed: 2, intermediate: 3, detailed: 5 };

/** Split `total` minutes at the given fractions and label each part. */
function timeline(total: number, fractions: number[]): string[] {
  const edges = [0, ...fractions.map((f) => Math.round(f * total))];
  edges[edges.length - 1] = total;
  const labels: string[] = [];
  for (let i = 1; i < edges.length; i++) {
    const from = edges[i - 1] + 1;
    const to = Math.max(from, edges[i]);
    if (total >= 120) labels.push(i === edges.length - 1 ? `${edges[i - 1]}–${total}+ min` : `${edges[i - 1]}–${to} min`);
    else labels.push(from === to ? `Minute ${from}` : `Minutes ${from}–${to}`);
  }
  return labels;
}

function steps(total: number, parts: [number, string][]): PlanStep[] {
  const labels = timeline(
    total,
    parts.map(([f]) => f),
  );
  return parts.map(([, text], i) => ({ label: labels[i], text }));
}

function colourStep(p: SketchPrompt, medium: Medium, level: Level): string {
  if (medium === 'ink-wash')
    return `Washes: ${sentence(p.washes)} Keep to ${list(p.palette.slice(0, level === 'relaxed' ? 2 : 3))}; let the ink do the drawing and the colour do the light.`;
  if (medium === 'watercolour') return `Colour masses: ${sentence(p.washes)} Work with ${list(p.palette.slice(0, 4))}, lightest first.`;
  if (medium === 'pencil') return `Tonal masses instead of colour: group ${p.palette.length ? 'the colour areas' : 'the scene'} into light, middle and dark. ${sentence(firstSentence(p.shadows))}`;
  return `Tone instead of colour: ${sentence(firstSentence(p.shadows))} Keep the lit planes as bare paper.`;
}

export function buildPlan(p: SketchPrompt, time: TimeKey, medium: Medium, simplified = 0, level: Level = 'intermediate'): PlanStep[] {
  const info = mediumInfo(medium);
  const approach = approachFor(time, simplified);
  const total = SPAN[time];
  const hatch = p.hatch.slice(0, HATCH_COUNT[level]);
  const secondary = p.secondary.slice(0, SECONDARY_COUNT[level]);
  const wash = WASH_MEDIA.includes(medium);
  const colourFirst = medium === 'watercolour';
  const focusLabel = regionLabel(p.guide.t, p.study.region);

  if (approach === 'study') {
    const parts: [number, string][] = [
      [0.2, `Look at the full scene, then frame only ${focusLabel} (the highlighted area of the guide). Place its two or three biggest edges inside a small rectangle.`],
      [0.6, sentence(p.study.text)],
      [0.85, `Line weight: ${sentence(firstSentence(p.lines))} ${info.quick}`],
      [1, info.finish],
    ];
    if (total >= 20) {
      parts.splice(2, 0, [0.7, `Shadows inside the study: ${sentence(firstSentence(p.shadows))} Hatch ${hatch[0]}.`]);
      parts[1][0] = 0.5;
    }
    return steps(total, parts);
  }

  if (approach === 'structure') {
    const parts: [number, string][] = [
      [0.2, `${sentence(p.view)} ${sentence(p.structure)}`],
      [0.6, `${colourFirst ? 'Lay the big colour masses, protecting the lights, then draw ' : 'Draw '}${p.ten}.`],
      [
        0.85,
        wash
          ? `One wash only: ${sentence(firstSentence(p.washes))}`
          : `Main shadow: ${sentence(firstSentence(p.shadows))} A few strokes ${hatch[0]}.`,
      ],
      [1, info.finish],
    ];
    if (total >= 20) parts.splice(1, 0, [0.3, `Perspective: ${sentence(p.perspective)}`]);
    return steps(total, parts);
  }

  if (approach === 'composition') {
    return steps(total, [
      [0.15, `${sentence(p.view)} ${sentence(p.structure)} ${sentence(p.perspective)}`],
      [0.4, `${colourFirst ? 'First wash over the large masses, then block in ' : 'Block in '}${p.ten}.`],
      [0.65, `Now add ${p.twenty}. Keep the focus on ${p.focal.replace(/\.$/, '').toLowerCase()}; ${list(secondary)} stay lighter.`],
      [0.85, `${wash ? colourStep(p, medium, level) : `Selective hatching: ${list(hatch)}.`} ${sentence(firstSentence(p.shadows))}`],
      [1, `${sentence(p.unfinished)} ${info.finish}`],
    ]);
  }

  // complete
  const parts: [number, string][] = [
    [
      0.1,
      `${sentence(p.view)} ${total >= 60 ? 'Make two thumb-sized value sketches and choose one.' : 'If it helps, make one small value thumbnail.'} Negative space: ${sentence(p.negative)}`,
    ],
    [0.25, `${sentence(p.structure)} ${sentence(p.perspective)} Then block in ${p.ten}.`],
    [0.45, `Add ${p.twenty}. Focal point: ${sentence(p.focal)} Secondary: ${list(secondary)}.`],
    [0.62, `${sentence(p.lines)} Hatch ${list(hatch)}. ${sentence(p.shadows)}`],
    [0.8, `Materials and depth: ${p.long}.`],
    [0.93, colourStep(p, medium, level)],
    [1, `${sentence(p.unfinished)} ${info.finish}`],
  ];
  if (colourFirst) {
    // Colour-first: masses go in before the detailed drawing.
    const colour = parts.splice(5, 1)[0];
    parts.splice(2, 0, [0.35, colour[1]]);
    parts.forEach((x, i) => (x[0] = [0.1, 0.22, 0.35, 0.5, 0.65, 0.85, 1][i]));
  }
  if (total >= 120) {
    parts.splice(2, 0, [0.3, 'Pause. Look at the drawing from a distance (or upside down) and correct proportions and perspective now, while it is still cheap to change.']);
    parts.forEach((x, i) => (x[0] = [0.12, 0.28, 0.32, 0.48, 0.62, 0.78, 0.92, 1][i]));
  }
  return steps(total, parts);
}

const SUMMARY: Record<Approach, (p: SketchPrompt, focus: string) => string> = {
  study: (_p, focus) => `A focused study of ${focus} — one part of the full scene, drawn properly.`,
  structure: (p) => `The main structure of the scene and the details that identify it: ${p.ten}.`,
  composition: () => 'The full composition, with secondary details, selective hatching and the main light and shadow.',
  complete: () => 'The complete scene, with materials, tonal depth and colour — and a few areas deliberately left open.',
};

const LEVEL_GUIDANCE: Record<Level, Partial<Record<Medium, string>>> = {
  relaxed: {
    ink: 'Keep it relaxed: fewer, longer lines and only two places of hatching.',
    'ink-wash': 'Keep it relaxed: two washes at most, and leave plenty of white.',
    watercolour: 'Keep it relaxed: two passes, big brush, no detail until the end.',
    pencil: 'Keep it relaxed: three values only, no fine detail.',
    hatching: 'Keep it relaxed: one direction of hatching, two shadow shapes.',
  },
  intermediate: {},
  detailed: {
    ink: 'Use three deliberate line weights — structure, openings, texture — and let texture appear only in two or three patches.',
    'ink-wash': 'Build depth with a second, darker glaze in the shadow side, and keep colour temperature consistent: warm light, cool shadow.',
    watercolour: 'Plan three passes — big light wash, mid-value glaze, darks — and design soft and hard edges around the focal point.',
    pencil: 'Work a full value range, but keep the darkest darks and brightest lights together at the focal point.',
    hatching: 'Map tonal zones before hatching; each zone gets a consistent density, cross-hatch only the darkest.',
  },
};

export function buildSuggestion(
  prompt: SketchPrompt,
  sug: Pick<Suggestion, 'time' | 'medium' | 'simplified' | 'createdAt'>,
  level: Level = 'intermediate',
): BuiltSuggestion {
  const { medium, simplified, time } = sug;
  const approach = approachFor(time, simplified);
  const info = mediumInfo(medium);
  const focusLabel = regionLabel(prompt.guide.t, prompt.study.region);
  const closing = CLOSING_LINES[hashString(prompt.id + sug.createdAt) % CLOSING_LINES.length];
  const secondary = prompt.secondary.slice(0, SECONDARY_COUNT[level]);
  const extra = LEVEL_GUIDANCE[level][medium];

  const composition: GuideItem[] = [
    { label: 'Viewpoint', text: prompt.view },
    { label: 'Structure', text: prompt.structure },
    { label: 'Focal point', text: prompt.focal },
    { label: 'Secondary', text: cap(list(secondary)) + '.' },
    { label: 'Perspective', text: prompt.perspective },
    { label: 'Negative space', text: prompt.negative },
  ];

  return {
    prompt,
    time,
    medium,
    level,
    simplified,
    approach,
    approachSummary: SUMMARY[approach](prompt, focusLabel),
    focusRegion: approach === 'study' ? prompt.study.region : undefined,
    focusLabel: approach === 'study' ? focusLabel : undefined,
    composition: approach === 'study' ? composition.filter((c) => c.label === 'Viewpoint' || c.label === 'Focal point') : composition,
    lineTone: { lines: prompt.lines, hatch: prompt.hatch.slice(0, HATCH_COUNT[level]), shadows: prompt.shadows },
    colour: { palette: prompt.palette, washes: prompt.washes, optional: !WASH_MEDIA.includes(medium) },
    unfinished: prompt.unfinished,
    plan: buildPlan(prompt, time, medium, simplified, level),
    mediumGuidance: extra ? [...info.guidance, extra] : info.guidance,
    constraint: prompt.constraint,
    closing,
  };
}
