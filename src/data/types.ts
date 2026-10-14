// Core domain types for Quiet Corners Studio.
//
// The library is made of *scenes*: rich, specific urban subjects. Session
// length never decides how rich a scene is — instead every scene carries
// approaches for different amounts of time (a focused 5-minute study, a
// 10-minute structure, a 20-minute composition, a longer exploration).

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

/** The persistent "Sketching level" preference. Independent of session length. */
export type Level = 'relaxed' | 'intermediate' | 'detailed';

/** Each dimension is scored 1 (light) to 3 (demanding). */
export interface Richness {
  /** Number and relationship of meaningful visual elements. */
  composition: 1 | 2 | 3;
  /** Doors, windows, signs, awnings, façade pattern, plants, textures. */
  detail: 1 | 2 | 3;
  /** 1 frontal · 2 angled · 3 street corner / lane. */
  perspective: 1 | 2 | 3;
  /** Number and arrangement of important light and shadow shapes. */
  tone: 1 | 2 | 3;
  /** Palette, layering, temperature variation, washes. */
  colour: 1 | 2 | 3;
}

// ---------------------------------------------------------------------------
// Composition guides: schematic drawings generated from a small spec.

export type GuideTemplate =
  | 'shopfront'
  | 'corner'
  | 'lane'
  | 'facade'
  | 'stall'
  | 'doorway'
  | 'street'
  | 'cafe'
  | 'waterfront'
  | 'riverside'
  | 'vista'
  | 'house'
  | 'steps';

export interface GuideSpec {
  t: GuideTemplate;
  /** Upper floors above the ground floor (0–4). */
  floors?: number;
  /** Window bays across the façade (2–5). */
  bays?: number;
  awning?: 'striped' | 'plain' | 'corrugated' | 'noren' | 'tiled' | 'none';
  sign?: 'fascia' | 'projecting' | 'both' | 'layered' | 'none';
  door?: 'left' | 'centre' | 'right';
  recessed?: boolean;
  plants?: number;
  shutters?: boolean;
  balcony?: boolean;
  cables?: boolean;
  tree?: 'left' | 'right';
  wet?: boolean;
  roof?: 'flat' | 'pitched' | 'tiled';
  brick?: boolean;
  books?: boolean;
  chairs?: boolean;
  bench?: boolean;
  lamp?: boolean;
  arch?: boolean;
  tiles?: boolean;
  figure?: boolean;
  /** Utility pole with tangled wires on this side. */
  pole?: 'left' | 'right';
  /** Script used on signs, drawn as glyph shapes. */
  script?: 'kanji' | 'devanagari' | 'latin';
  /** Sandwich board on the pavement. */
  aframe?: boolean;
  bicycle?: boolean;
  /** Small delivery truck parked in front. */
  truck?: boolean;
  /** House: outside stair to the upper door. */
  stair?: boolean;
  /** House: number of stacked roof tiers (Kerala style). */
  tiers?: number;
  palms?: boolean;
  /** Riverside / waterfront: a church spire or tower. */
  spire?: boolean;
}

// ---------------------------------------------------------------------------

export interface SketchPrompt {
  id: string;
  title: string;
  /** Two or three sentences describing the scene. */
  scene: string;
  /** The specific reason this scene is worth drawing. */
  why: string;
  categories: Category[];
  /** Media this scene suits. The first is the suggested medium. */
  media: Medium[];
  richness: Richness;
  /** Derived from richness (see levelOf). */
  level: Level;
  /** Roughly how long the complete scene takes for an intermediate sketcher. */
  fullTime: TimeKey;

  // Composition
  view: string;
  structure: string;
  focal: string;
  secondary: string[];
  perspective: string;
  negative: string;

  // Line and tone
  lines: string;
  /** Three or four places where selective hatching adds depth. */
  hatch: string[];
  shadows: string;

  // Colour
  palette: string[];
  washes: string;

  /** What can deliberately stay unfinished. */
  unfinished: string;

  // Time-based approaches (all of the same scene)
  /** 5 minutes: one meaningful part of the scene. */
  study: { region: string; text: string };
  /** 10 minutes: main structure plus these identifying details. */
  ten: string;
  /** 20 minutes: what the full composition adds. */
  twenty: string;
  /** 30–45 minutes and longer: materials, layering, tonal depth, colour. */
  long: string;

  constraint: string;
  guide: GuideSpec;
  /** Title words for Wikimedia Commons reference photos, most specific first. */
  photo: string[];
  tags: string[];
}

/** What the user asked for in the finder. `undefined` means "surprise me" / skipped. */
export interface Criteria {
  time?: TimeKey;
  category?: Category;
  medium?: Medium;
  energy?: Energy;
  /** Overrides the saved sketching level for this request (e.g. "something easy"). */
  level?: Level;
}

/** A concrete suggestion as shown on the suggestion screen. */
export interface Suggestion {
  promptId: string;
  time: TimeKey;
  medium: Medium;
  /** 0 = full approach for the time, 1 = structure only, 2 = the focused study. */
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
