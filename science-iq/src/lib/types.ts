export type Subject = 'Physics' | 'Chemistry' | 'Biology' | 'Space Science' | 'Environment & Technology' | 'Scientific Reasoning';

export const SUBJECTS: Subject[] = ['Physics', 'Chemistry', 'Biology', 'Space Science', 'Environment & Technology', 'Scientific Reasoning'];

export const SUBJECT_ICON: Record<Subject, string> = {
  Physics: '⚛',
  Chemistry: '⚗',
  Biology: '🧬',
  'Space Science': '🪐',
  'Environment & Technology': '🌱',
  'Scientific Reasoning': '🧩',
};

/** 1 Foundation · 2 Advanced (Grade 9) · 3 Olympiad */
export type Level = 1 | 2 | 3;
export const LEVEL_NAME: Record<Level, string> = { 1: 'Foundation', 2: 'Advanced', 3: 'Olympiad' };

export type QType =
  | 'mcq'
  | 'numerical'
  | 'assertion-reason'
  | 'statement'
  | 'reasoning'
  | 'experiment'
  | 'application'
  | 'data'
  | 'interdisciplinary'
  | 'what-if';

export const TYPE_NAME: Record<QType, string> = {
  mcq: 'Concept MCQ',
  numerical: 'Numerical',
  'assertion-reason': 'Assertion–Reason',
  statement: 'Statement-based',
  reasoning: 'Scientific reasoning',
  experiment: 'Experimental situation',
  application: 'Application',
  data: 'Data interpretation',
  interdisciplinary: 'Interdisciplinary',
  'what-if': 'What-if scenario',
};

export type Track = 'MVPP' | 'VVM' | 'GEN';

export interface Question {
  id: string;
  subject: Subject;
  topic: string;
  level: Level;
  type: QType;
  q: string;
  options: string[];
  answer: number; // index into options
  explanation: string;
  misconception?: string; // why the tempting wrong answer is wrong
  hints: string[]; // progressive
  time: number; // estimated solving time (s)
  tracks: Track[];
  iq: boolean; // Science IQ unfamiliar-situation problem
  table?: { head: string[]; rows: (string | number)[][] };
  verified: true; // only verified questions are ever written to the bank
}
