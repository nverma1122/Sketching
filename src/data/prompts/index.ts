import type { SketchPrompt } from '../types';
import { urbanPrompts } from './urban';
import { shopfrontPrompts } from './shopfronts';
import { stillLifePrompts } from './stillLife';
import { naturePrompts } from './nature';
import { inkPrompts } from './inkStudies';
import { colourPrompts } from './colour';
import { experimentalPrompts } from './experimental';

/**
 * The complete prompt library. To add ideas, append entries to any of the
 * files above (or create a new file and include it here). IDs must be unique;
 * the library test checks this.
 */
export const PROMPTS: SketchPrompt[] = [
  ...urbanPrompts,
  ...shopfrontPrompts,
  ...stillLifePrompts,
  ...naturePrompts,
  ...inkPrompts,
  ...colourPrompts,
  ...experimentalPrompts,
];

const BY_ID = new Map(PROMPTS.map((p) => [p.id, p]));

export const getPrompt = (id: string): SketchPrompt | undefined => BY_ID.get(id);
