// Core data types shared by every engine. Content files, engines and UI all depend on
// these; nothing here depends on React or storage.

export type SubjectId =
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'space'
  | 'techenv'
  | 'indian'
  | 'reasoning'
  | 'maths';

/** Which competition a question is relevant to. GEN = general advanced science (beyond both syllabi). */
export type ExamTag = 'MVPP' | 'VVM' | 'GEN';

/** 1 Foundation · 2 Intermediate · 3 Advanced · 4 Olympiad · 5 Expert Challenge */
export type Difficulty = 1 | 2 | 3 | 4 | 5;

export const DIFFICULTY_NAMES: Record<Difficulty, string> = {
  1: 'Foundation',
  2: 'Intermediate',
  3: 'Advanced',
  4: 'Olympiad',
  5: 'Expert Challenge',
};

/** How the student responds. */
export type ResponseKind = 'single' | 'multi' | 'numeric' | 'order';

/** How the question is presented (the "question format" the analytics track). */
export type Format =
  | 'mcq'
  | 'multi-correct'
  | 'numerical'
  | 'assertion-reason'
  | 'match'
  | 'statements'
  | 'true-false'
  | 'sequence'
  | 'diagram'
  | 'graph'
  | 'experiment'
  | 'case'
  | 'reasoning'
  | 'data';

/**
 * The thinking skill a question exercises. The adaptive engine groups these into
 * "understanding" (recall, concept) and "application" (everything else), so it can tell
 * "knows Newton's laws" apart from "can apply them to unfamiliar situations".
 */
export type Skill = 'recall' | 'concept' | 'application' | 'numerical' | 'reasoning' | 'experimental' | 'unfamiliar' | 'integrated';

/** The kind of error a wrong option represents — powers the "why it went wrong" report. */
export type ErrorKind = 'concept' | 'calculation' | 'misread' | 'formula' | 'unit' | 'recall';

export const ERROR_NAMES: Record<ErrorKind | 'guess' | 'time', string> = {
  concept: 'Conceptual error',
  calculation: 'Calculation error',
  misread: 'Misreading the question',
  formula: 'Wrong formula / misapplied principle',
  unit: 'Unit or conversion error',
  recall: 'Fact not recalled',
  guess: 'Unnecessary guessing (answered far too fast)',
  time: 'Time-management problem (far over the time budget)',
};

export type Answer =
  | { kind: 'single'; index: number }
  | { kind: 'multi'; indices: number[] }
  | { kind: 'numeric'; value: number; tolerance: number; unit?: string }
  | { kind: 'order'; order: number[] };

/** A small data table or chart drawn as SVG for graph/data questions. */
export interface Figure {
  kind: 'svg' | 'line' | 'table';
  /** For svg: raw markup (trusted, bundled content only). */
  svg?: string;
  /** For line charts: series of points. */
  series?: { name: string; points: [number, number][] }[];
  xLabel?: string;
  yLabel?: string;
  /** For tables. */
  head?: string[];
  rows?: (string | number)[][];
  caption?: string;
}

export interface Question {
  id: string;
  subject: SubjectId;
  chapter: string; // chapter id from curriculum
  topic: string;
  subtopic?: string;
  exams: ExamTag[];
  difficulty: Difficulty;
  response: ResponseKind;
  format: Format;
  skill: Skill;
  stem: string; // text; $...$ is KaTeX, $\ce{...}$ chemistry
  options?: string[];
  answer: Answer;
  explanation: string;
  /** One note per option explaining why it is right or wrong. */
  optionNotes?: string[];
  /** Error kind represented by each wrong option (index → kind). */
  traps?: Partial<Record<number, ErrorKind>>;
  concept: string; // the scientific concept tested
  time: number; // estimated solving time, seconds
  source: string; // provenance
  status: 'verified' | 'pending';
  tags: string[];
  hints?: string[]; // progressive hints (practice / Science IQ only)
  figure?: Figure;
  /** Questions in the same family are variants of one idea: never two in one session, counted once. */
  family?: string;
  /** Marks the 30-question flagship review sample. */
  sample?: boolean;
  /** Set for items produced by a generator, with the template id. */
  generated?: string;
  /** Section tag inside an exam (e.g. VVM Section A content). */
  section?: string;
}

// ---------------------------------------------------------------- attempt / progress records

export type Mode =
  | 'practice'
  | 'learn'
  | 'intel'
  | 'iq'
  | 'speed'
  | 'survival'
  | 'boss'
  | 'endless'
  | 'daily'
  | 'weekly'
  | 'duel'
  | 'exam'
  | 'nohint'
  | 'expert'
  | 'revision';

/** One answered (or skipped) question. Append-only; ids make restore/merge idempotent. */
export interface Attempt {
  id: string;
  qid: string;
  at: number; // epoch ms
  mode: Mode;
  correct: boolean;
  skipped?: boolean;
  /** For single: chosen index; multi: indices; numeric: value; order: order. */
  given?: number | number[] | null;
  timeMs: number;
  /** Diagnosed error, when wrong. */
  error?: ErrorKind | 'guess' | 'time';
  hintsUsed?: number;
  sessionId: string;
  // denormalised for fast analytics even if the question is later edited
  subject: SubjectId;
  chapter: string;
  topic: string;
  difficulty: Difficulty;
  format: Format;
  skill: Skill;
  exams: ExamTag[];
}

/** Per-question exposure state (anti-repetition). */
export interface QStat {
  qid: string;
  seen: number;
  correct: number;
  wrong: number;
  correctStreak: number;
  lastSeen: number;
  lastCorrect?: number;
}

/** Spaced-repetition state of a mistaken question. */
export interface Mistake {
  qid: string;
  firstWrong: number;
  lastWrong: number;
  timesWrong: number;
  lastGiven?: number | number[] | null;
  lastTimeMs: number;
  stage: number; // successful spaced revisions so far
  due: number; // epoch ms
  mastered: boolean;
  masteredAt?: number;
  lastReviewed?: number;
  history: { at: number; correct: boolean }[];
}

export interface SessionRecord {
  id: string;
  mode: Mode;
  startedAt: number;
  endedAt: number;
  title: string;
  score: number;
  maxScore?: number;
  correct: number;
  wrong: number;
  skipped: number;
  xp: number;
  meta?: Record<string, unknown>;
}

export interface ExamResult {
  id: string;
  examId: string;
  title: string;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  usedSec: number;
  scoring: { correct: number; wrong: number; unattempted: number };
  score: number;
  maxScore: number;
  questions: ExamItemResult[];
  sections: { name: string; score: number; max: number; count: number }[];
  proportional: boolean;
  notes: string[];
}

export interface ExamItemResult {
  qid: string;
  section: string;
  given: number | number[] | null;
  correct: boolean | null; // null = unattempted
  timeMs: number;
  marked: boolean;
  error?: ErrorKind | 'guess' | 'time';
}
