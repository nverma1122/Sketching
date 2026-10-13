import type { SketchPrompt } from '../types';
import { bookshopScenes } from './bookshops';
import { shopfrontScenes } from './shopfronts';
import { cornerScenes } from './corners';
import { facadeScenes } from './facades';
import { laneScenes } from './lanes';
import { stallScenes } from './stalls';

/**
 * The complete scene library. To add a scene, append an entry to any of the
 * files above (or add a new file and include it here). IDs must be unique;
 * the library tests check this and the quality of every field.
 */
export const PROMPTS: SketchPrompt[] = [
  ...bookshopScenes,
  ...shopfrontScenes,
  ...cornerScenes,
  ...facadeScenes,
  ...laneScenes,
  ...stallScenes,
];

const BY_ID = new Map(PROMPTS.map((p) => [p.id, p]));

export const getPrompt = (id: string): SketchPrompt | undefined => BY_ID.get(id);
