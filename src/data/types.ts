// Core domain types for Quiet Corners Studio.
// The prompt library (src/data/prompts) is plain typed data; the UI and the
// selection logic only depend on these types, so ideas can be added or edited
// without touching any component.

export type TimeKey = '5' | '10' | '20' | '40' | '60' | '120';

export type Medium = 'ink' | 'ink-wash' | 'watercolour' | 'pencil' | 'hatching';

export type Category =
  | 'urban'
  | 'shopfronts'
  | 'architecture'
  | 'still-life'
  | 'windows'
  | 'cafes'
  | 'nature';

export type Energy = 'low' | 'explore' | 'focus';

export type Difficulty = 1 | 2 | 3 | 4;

/** The artist's own level, set in Settings. Biases which ideas are suggested. */
export type Level = 'developing' | 'experienced' | 'advanced';

/** Identifier of an original schematic illustration in src/components/references. */
export type ReferenceId =
  | 'shopfront'
  | 'street-corner'
  | 'balcony'
  | 'door'
  | 'tea-stall'
  | 'cafe-table'
  | 'tree-bench'
  | 'tree-wall'
  | 'cup'
  | 'books'
  | 'bottles'
  | 'plant-window'
  | 'rooftops'
  | 'arch'
  | 'stairs'
  | 'lamp-post'
  | 'bicycle'
  | 'kettle'
  | 'chair'
  | 'grille-shadow'
  | 'old-building'
  | 'colour-masses';

export interface DrawingBrief {
  /** Main geometric shapes to look for. */
  shapes: string;
  /** Dominant perspective / viewpoint. */
  perspective: string;
  /** Where the major shadow areas fall. */
  shadows: string;
  /** Details that can be added or skipped. */
  optional: string;
}

export interface SketchPrompt {
  id: string;
  title: string;
  /** A few inviting sentences describing the scene. */
  description: string;
  categories: Category[];
  /** Media this idea suits. The first entry is the suggested medium. */
  media: Medium[];
  /** Suitable time range, inclusive: [shortest, longest]. */
  time: [TimeKey, TimeKey];
  difficulty: Difficulty;
  energy: Energy;
  /** Composition guidance specific to this subject. */
  composition: string[];
  /**
   * Subject-specific drawing actions, ordered from biggest to smallest.
   * The plan builder spreads these across the chosen session length.
   */
  steps: string[];
  /** Optional notes that only apply to a particular medium. */
  mediumNotes?: Partial<Record<Medium, string>>;
  /** One artistic constraint that makes the exercise easier or more interesting. */
  constraint: string;
  /** A short instruction used when the user asks to make the idea simpler. */
  simpler: string;
  /** Optional restrained colour palette (pigment names). */
  palette?: string[];
  reference: ReferenceId;
  brief: DrawingBrief;
  tags: string[];
}

/** What the user asked for in the finder. `undefined` means "surprise me" / skipped. */
export interface Criteria {
  time?: TimeKey;
  category?: Category;
  medium?: Medium;
  energy?: Energy;
}

/** A concrete suggestion as shown on the suggestion screen. */
export interface Suggestion {
  promptId: string;
  time: TimeKey;
  medium: Medium;
  /** 0 = as written, 1+ = progressively simpler. */
  simplified: number;
  criteria: Criteria;
  /** Human-readable notes about which filters were broadened, if any. */
  broadened: string[];
  createdAt: number;
}

export type Outcome = 'completed' | 'partial' | 'explored';

export interface SessionRecord {
  id: string;
  promptId: string;
  title: string;
  medium: Medium;
  plannedTime: TimeKey;
  /** Seconds actually timed; 0 when the timer was not used. */
  timedSeconds: number;
  startedAt: number;
  endedAt: number;
  outcome: Outcome;
  note: string;
}

export interface ArtworkRecord {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  medium?: Medium;
  tags: string[];
  note: string;
  promptId?: string;
  fileName: string;
  mimeType: string;
  createdAt: number;
}

export interface ArtworkWithImage extends ArtworkRecord {
  image: Blob;
  thumb?: Blob;
}
