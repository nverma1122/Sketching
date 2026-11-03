import type { Difficulty, ExamTag, SubjectId } from '../engine/types';

// Exam configurations. `verified: true` means the structure (number of questions, time, marking)
// is taken from an official source listed in sourceIds. Content splits that the official sources
// do NOT give are marked `splitOfficial: false` and labelled in the UI as a preparation recommendation.

export interface ExamPick {
  label: string;
  count: number;
  subjects?: SubjectId[];
  chapters?: string[];
  topics?: string[];
  exams?: ExamTag[];
  minDifficulty?: Difficulty;
  maxDifficulty?: Difficulty;
}

export interface ExamSection {
  name: string;
  minutes: number;
  marks: { correct: number; wrong: number };
  picks: ExamPick[];
}

export interface ExamConfig {
  id: string;
  track: 'MVPP' | 'VVM' | 'GEN';
  title: string;
  subtitle: string;
  verified: boolean; // structure from an official source
  splitOfficial: boolean; // per-subject split from an official source
  sectionTimed: boolean; // each section has its own clock (VVM)
  sections: ExamSection[];
  sourceIds: string[];
  notes: string[];
  /** Optional rule evaluated in the report. */
  qualifying?: { section: number; minPercent: number; text: string };
  custom?: boolean;
}

const VVM_NOTES = [
  'Structure from the official VVM pages (S3): 100 MCQs in 90 minutes; Section A — 30 min, 40 questions (20 Indian Contributions to Science + 20 life story); Section B — 60 min, 60 questions (12 each: Physics, Chemistry, Mathematics, Biology, Logic & Reasoning).',
  'Class IX life story for 2026-27 is Asima Chatterjee (S2). The real Section A is set from VVM study material that is not reproduced here; this simulation uses original questions on independently verifiable facts — read the official booklets too.',
  'The two official VVM pages disagree on marking (S3: 4 marks each, −1 per wrong in Section B; S3b: 1 mark each). Choose the scheme before starting.',
];

export const EXAMS: ExamConfig[] = [
  // ------------------------------------------------------------------ VVM
  {
    id: 'vvm-level1',
    track: 'VVM',
    title: 'VVM Level-I Full Simulation',
    subtitle: '100 MCQs · 90 min · Section A then Section B',
    verified: true,
    splitOfficial: true,
    sectionTimed: true,
    sourceIds: ['S2', 'S3', 'S3b'],
    notes: VVM_NOTES,
    qualifying: { section: 0, minPercent: 50, text: 'VVM evaluates Section B only if Section A ≥ 50%.' },
    sections: [
      {
        name: 'Section A',
        minutes: 30,
        marks: { correct: 4, wrong: 0 },
        picks: [
          { label: 'Indian Contributions to Science', count: 20, chapters: ['ics'] },
          { label: 'Life story (Asima Chatterjee & scientists)', count: 20, chapters: ['scientists'] },
        ],
      },
      {
        name: 'Section B',
        minutes: 60,
        marks: { correct: 4, wrong: -1 },
        picks: [
          { label: 'Physics', count: 12, subjects: ['physics'], exams: ['VVM'] },
          { label: 'Chemistry', count: 12, subjects: ['chemistry'], exams: ['VVM'] },
          { label: 'Mathematics', count: 12, subjects: ['maths'] },
          { label: 'Biology', count: 12, subjects: ['biology'], exams: ['VVM'] },
          { label: 'Logic & Reasoning', count: 12, chapters: ['logic', 'sci-reasoning'] },
        ],
      },
    ],
  },
  {
    id: 'vvm-section-b',
    track: 'VVM',
    title: 'VVM Section B Drill',
    subtitle: '60 MCQs · 60 min · syllabus + reasoning',
    verified: true,
    splitOfficial: true,
    sectionTimed: false,
    sourceIds: ['S3'],
    notes: ['Section B alone, as in the official pattern (S3).'],
    sections: [
      {
        name: 'Section B',
        minutes: 60,
        marks: { correct: 4, wrong: -1 },
        picks: [
          { label: 'Physics', count: 12, subjects: ['physics'], exams: ['VVM'] },
          { label: 'Chemistry', count: 12, subjects: ['chemistry'], exams: ['VVM'] },
          { label: 'Mathematics', count: 12, subjects: ['maths'] },
          { label: 'Biology', count: 12, subjects: ['biology'], exams: ['VVM'] },
          { label: 'Logic & Reasoning', count: 12, chapters: ['logic', 'sci-reasoning'] },
        ],
      },
    ],
  },
  {
    id: 'vvm-section-a',
    track: 'VVM',
    title: 'VVM Section A Drill',
    subtitle: '40 MCQs · 30 min · Indian science & life story',
    verified: true,
    splitOfficial: true,
    sectionTimed: false,
    sourceIds: ['S2', 'S3'],
    notes: [VVM_NOTES[1]],
    sections: [
      {
        name: 'Section A',
        minutes: 30,
        marks: { correct: 4, wrong: 0 },
        picks: [
          { label: 'Indian Contributions to Science', count: 20, chapters: ['ics'] },
          { label: 'Life story & scientists', count: 20, chapters: ['scientists'] },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ MVPP
  {
    id: 'mvpp-mat',
    track: 'MVPP',
    title: 'MVPP Paper I — Mental Ability Test',
    subtitle: '100 MCQs · 100 min · no negative marking',
    verified: true,
    splitOfficial: false,
    sectionTimed: false,
    sourceIds: ['S1', 'S1b'],
    notes: [
      'Official (S1): 100 questions, 100 marks, 100 minutes, no negative marking.',
      'The circulars name the content (verbal & non-verbal reasoning, quantitative aptitude, data interpretation — S1b) but give no split. The 60/25/15 split used here is a preparation recommendation, not an official distribution.',
    ],
    sections: [
      {
        name: 'MAT',
        minutes: 100,
        marks: { correct: 1, wrong: 0 },
        picks: [
          { label: 'Verbal & non-verbal reasoning', count: 60, chapters: ['logic'] },
          { label: 'Quantitative aptitude', count: 25, subjects: ['maths'] },
          { label: 'Data interpretation & scientific reasoning', count: 15, chapters: ['sci-reasoning'] },
        ],
      },
    ],
  },
  {
    id: 'mvpp-sat',
    track: 'MVPP',
    title: 'MVPP Paper II — SAT (Science & Maths portion)',
    subtitle: '80 MCQs · 80 min · no negative marking',
    verified: true,
    splitOfficial: false,
    sectionTimed: false,
    sourceIds: ['S1', 'S1b'],
    notes: [
      'Official (S1): the real SAT has 100 questions in 100 minutes with no negative marking.',
      'Official SAT subjects (S1b) include Civics, History, Economics and Geography as well as Physics, Chemistry, Biology and Mathematics. This science app covers the science & maths portion only: 80 questions at the official pace of 1 minute per question. Practise social science separately.',
      'The equal 20/20/20/20 split is a preparation recommendation — no official subject split has been published.',
    ],
    sections: [
      {
        name: 'SAT',
        minutes: 80,
        marks: { correct: 1, wrong: 0 },
        picks: [
          { label: 'Physics', count: 20, subjects: ['physics'], exams: ['MVPP'] },
          { label: 'Chemistry', count: 20, subjects: ['chemistry'], exams: ['MVPP'] },
          { label: 'Biology', count: 20, subjects: ['biology'], exams: ['MVPP'] },
          { label: 'Mathematics', count: 20, subjects: ['maths'] },
        ],
      },
    ],
  },
  {
    id: 'mvpp-sectional-science',
    track: 'MVPP',
    title: 'MVPP Sectional — Science (30 min)',
    subtitle: '30 MCQs · 30 min · Physics, Chemistry, Biology',
    verified: false,
    splitOfficial: false,
    sectionTimed: false,
    sourceIds: ['S1'],
    notes: ['A practice sectional at the official MVPP pace (1 question per minute). Not an official format.'],
    sections: [
      {
        name: 'Science',
        minutes: 30,
        marks: { correct: 1, wrong: 0 },
        picks: [
          { label: 'Physics', count: 10, subjects: ['physics'], exams: ['MVPP'] },
          { label: 'Chemistry', count: 10, subjects: ['chemistry'], exams: ['MVPP'] },
          { label: 'Biology', count: 10, subjects: ['biology'], exams: ['MVPP'] },
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ GENERAL
  {
    id: 'olympiad',
    track: 'GEN',
    title: 'General Science Olympiad Challenge',
    subtitle: '40 MCQs · 60 min · +4 / −1 · Advanced and above',
    verified: false,
    splitOfficial: false,
    sectionTimed: false,
    sourceIds: [],
    notes: ['A practice format for advanced preparation. Not modelled on an official paper.'],
    sections: [
      {
        name: 'Olympiad',
        minutes: 60,
        marks: { correct: 4, wrong: -1 },
        picks: [
          { label: 'Physics', count: 12, subjects: ['physics'], minDifficulty: 3 },
          { label: 'Chemistry', count: 10, subjects: ['chemistry'], minDifficulty: 3 },
          { label: 'Biology', count: 10, subjects: ['biology'], minDifficulty: 3 },
          { label: 'Space & reasoning', count: 8, subjects: ['space', 'reasoning'], minDifficulty: 3 },
        ],
      },
    ],
  },
  {
    id: 'mixed',
    track: 'GEN',
    title: 'Mixed Science Challenge',
    subtitle: '30 MCQs · 35 min · every subject',
    verified: false,
    splitOfficial: false,
    sectionTimed: false,
    sourceIds: [],
    notes: ['A practice format mixing all subjects. Not modelled on an official paper.'],
    sections: [
      {
        name: 'Mixed',
        minutes: 35,
        marks: { correct: 1, wrong: 0 },
        picks: [
          { label: 'Physics', count: 6, subjects: ['physics'] },
          { label: 'Chemistry', count: 6, subjects: ['chemistry'] },
          { label: 'Biology', count: 6, subjects: ['biology'] },
          { label: 'Space', count: 3, subjects: ['space'] },
          { label: 'Tech & environment', count: 3, subjects: ['techenv'] },
          { label: 'Indian science', count: 3, subjects: ['indian'] },
          { label: 'Reasoning', count: 3, subjects: ['reasoning'] },
        ],
      },
    ],
  },
];

export const examById = (id: string, custom: ExamConfig[] = []) => [...EXAMS, ...custom].find((e) => e.id === id);
