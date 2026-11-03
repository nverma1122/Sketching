import { CHAPTERS } from '../content/curriculum';
import type { Question } from './types';

// Structural quality gate. Every built-in, imported or AI-generated question passes through
// this before it can enter the verified bank. It cannot judge scientific truth — that is what
// the review queue and the numeric re-computation tests are for — but it rejects anything
// ambiguous in form: missing explanations, duplicate options, out-of-range answers, etc.

const SUBJECTS = ['physics', 'chemistry', 'biology', 'space', 'techenv', 'indian', 'reasoning', 'maths'];
const chapterIds = new Set(CHAPTERS.map((c) => c.id));

export interface Issue {
  level: 'error' | 'warn';
  msg: string;
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

export function validateQuestion(q: Partial<Question>): Issue[] {
  const out: Issue[] = [];
  const err = (msg: string) => out.push({ level: 'error', msg });
  const warn = (msg: string) => out.push({ level: 'warn', msg });

  if (!q.id || !/^[A-Za-z0-9_-]+$/.test(q.id)) err('id missing or has invalid characters');
  if (!q.subject || !SUBJECTS.includes(q.subject)) err(`unknown subject "${q.subject}"`);
  if (!q.chapter || !chapterIds.has(q.chapter)) err(`unknown chapter "${q.chapter}"`);
  if (q.chapter && q.subject && chapterIds.has(q.chapter) && CHAPTERS.find((c) => c.id === q.chapter)!.subject !== q.subject)
    err('chapter does not belong to subject');
  if (!q.topic) err('topic missing');
  if (!q.exams?.length) err('competition relevance (exams) missing');
  if (!q.difficulty || q.difficulty < 1 || q.difficulty > 5) err('difficulty must be 1–5');
  if (!q.stem || q.stem.trim().length < 12) err('question text too short');
  if (!q.explanation || q.explanation.trim().length < 25) err('explanation missing or too short');
  if (!q.concept) err('concept tested missing');
  if (!q.time || q.time < 10 || q.time > 900) err('estimated time must be 10–900 s');
  if (!q.source) err('source / provenance missing');
  if (!q.answer) {
    err('answer missing');
    return out;
  }
  // balanced $ for KaTeX
  const dollars = (q.stem.match(/(?<!\\)\$/g) || []).length;
  if (dollars % 2) err('unbalanced $ in question text');

  const opts = q.options || [];
  const needsOptions = q.answer.kind !== 'numeric';
  if (needsOptions) {
    if (opts.length < 2) err('needs at least 2 options');
    if (opts.some((o) => !o || !String(o).trim())) err('empty option');
    const set = new Set(opts.map((o) => norm(String(o))));
    if (set.size !== opts.length) err('duplicate options — answer would be ambiguous');
    if (q.response === 'single' && opts.length < 4 && q.format !== 'true-false') warn('fewer than 4 options');
  }
  switch (q.answer.kind) {
    case 'single':
      if (q.response !== 'single') err('response kind does not match answer kind');
      if (!(q.answer.index >= 0 && q.answer.index < opts.length)) err('correct option index out of range');
      break;
    case 'multi':
      if (q.response !== 'multi') err('response kind does not match answer kind');
      if (!q.answer.indices.length) err('multi-correct needs at least one correct option');
      if (q.answer.indices.some((i) => i < 0 || i >= opts.length)) err('correct option index out of range');
      if (new Set(q.answer.indices).size !== q.answer.indices.length) err('repeated index in answer');
      break;
    case 'numeric':
      if (q.response !== 'numeric') err('response kind does not match answer kind');
      if (!Number.isFinite(q.answer.value)) err('numeric answer is not a number');
      if (!(q.answer.tolerance >= 0)) err('tolerance must be ≥ 0');
      if (q.answer.tolerance > Math.abs(q.answer.value) * 0.1 + 1e-9 && q.answer.value !== 0) warn('tolerance above 10% of the answer');
      break;
    case 'order': {
      if (q.response !== 'order') err('response kind does not match answer kind');
      const sorted = [...q.answer.order].sort((a, b) => a - b);
      if (sorted.length !== opts.length || sorted.some((v, i) => v !== i)) err('order answer must be a permutation of the options');
      break;
    }
  }
  if (q.optionNotes && opts.length && q.optionNotes.length !== opts.length) err('optionNotes length must equal options length');
  if (q.answer.kind === 'single' && q.traps && q.traps[q.answer.index]) err('the correct option cannot carry an error trap');
  if (q.response === 'single' && needsOptions && !q.optionNotes) warn('no explanation of incorrect options');
  return out;
}

export const hasErrors = (issues: Issue[]) => issues.some((i) => i.level === 'error');
