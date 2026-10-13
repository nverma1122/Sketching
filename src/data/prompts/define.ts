import type { Energy, SketchPrompt } from '../types';

type PromptInput = Omit<SketchPrompt, 'energy'> & { energy?: Energy };

const ENERGY_FOR_DIFFICULTY: Record<1 | 2 | 3, Energy> = { 1: 'low', 2: 'explore', 3: 'focus' };

/**
 * Small helper so library entries stay terse. Energy defaults from difficulty,
 * but an entry can override it (e.g. a gentle subject that still needs focus).
 */
export function definePrompt(p: PromptInput): SketchPrompt {
  return { ...p, energy: p.energy ?? ENERGY_FOR_DIFFICULTY[p.difficulty] };
}
