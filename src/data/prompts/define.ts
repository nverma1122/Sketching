import type { Level, Richness, SketchPrompt } from '../types';

/**
 * Sketching level is derived from the five richness dimensions (each 1–3,
 * total 5–15), so it can never drift out of step with the scene itself.
 *   relaxed      ≤ 8   — a simpler subject, still a real urban scene
 *   intermediate 9–11  — layered composition, manageable perspective
 *   detailed     ≥ 12  — richer façades, stronger tone, more colour
 */
export function levelOf(r: Richness): Level {
  const total = r.composition + r.detail + r.perspective + r.tone + r.colour;
  return total <= 8 ? 'relaxed' : total <= 11 ? 'intermediate' : 'detailed';
}

export const richnessTotal = (r: Richness) => r.composition + r.detail + r.perspective + r.tone + r.colour;

type R = 1 | 2 | 3;

/** Terse authoring: `rich: [composition, detail, perspective, tone, colour]`. */
export function scene(p: Omit<SketchPrompt, 'level' | 'richness'> & { rich: [R, R, R, R, R] }): SketchPrompt {
  const { rich, ...rest } = p;
  const richness: Richness = { composition: rich[0], detail: rich[1], perspective: rich[2], tone: rich[3], colour: rich[4] };
  return { ...rest, richness, level: levelOf(richness) };
}
