import type { ExamConfig } from '../content/exams';
import { diagnose, isCorrect } from './evaluate';
import { applyFilter, pickQuestions } from './selection';
import type { ErrorKind, ExamItemResult, ExamResult, QStat, Question } from './types';
import { ERROR_NAMES } from './types';
import { pct } from './util';

// Examination engine. Builds a fixed paper from a config (no adaptation during the test),
// scores it, and produces a diagnostic report.

export interface BuiltSection {
  name: string;
  minutes: number;
  marks: { correct: number; wrong: number };
  qids: string[];
  wanted: number;
}

export interface BuiltExam {
  examId: string;
  title: string;
  sections: BuiltSection[];
  proportional: boolean;
  shortfall: string[];
}

/**
 * Build a paper. If the bank cannot supply a pick in full, the section is shortened and its time
 * scaled in proportion (same minutes-per-question), and the paper is flagged `proportional`.
 * Questions least seen before (and not used in the student's previous mocks) are preferred.
 */
export function buildExam(cfg: ExamConfig, bank: Question[], stats: Record<string, QStat>, usedInExams: Set<string>, rand = Math.random): BuiltExam {
  const taken = new Set<string>();
  const families = new Set<string>();
  const shortfall: string[] = [];
  let proportional = false;
  const sections: BuiltSection[] = cfg.sections.map((s) => {
    const qids: string[] = [];
    let wanted = 0;
    for (const p of s.picks) {
      wanted += p.count;
      const pool = applyFilter(bank, { subjects: p.subjects, chapters: p.chapters, topics: p.topics, exams: p.exams, minDifficulty: p.minDifficulty, maxDifficulty: p.maxDifficulty });
      // fresh-for-exams first, then everything else
      const fresh = pool.filter((q) => !usedInExams.has(q.id));
      let got = pickQuestions(fresh, { count: p.count, stats, exclude: taken, excludeFamilies: families, rand });
      if (got.length < p.count) {
        const more = pickQuestions(pool, { count: p.count - got.length, stats, exclude: new Set([...taken, ...got.map((q) => q.id)]), excludeFamilies: new Set([...families, ...got.map((q) => q.family || q.id)]), rand });
        got = [...got, ...more];
      }
      if (got.length < p.count) shortfall.push(`${s.name} · ${p.label}: ${got.length}/${p.count} available`);
      for (const q of got) {
        taken.add(q.id);
        families.add(q.family || q.id);
        qids.push(q.id);
      }
    }
    let minutes = s.minutes;
    if (qids.length < wanted) {
      proportional = true;
      minutes = Math.max(1, Math.round((s.minutes * qids.length) / wanted));
    }
    return { name: s.name, minutes, marks: s.marks, qids, wanted };
  });
  return { examId: cfg.id, title: cfg.title, sections, proportional, shortfall };
}

export interface ExamProgress {
  answers: Record<string, number | number[] | null>;
  marked: Record<string, boolean>;
  timeMs: Record<string, number>;
  visited: Record<string, boolean>;
}

export function scoreExam(built: BuiltExam, prog: ExamProgress, qmap: Record<string, Question>, meta: { id: string; startedAt: number; endedAt: number; usedSec: number }, cfg: ExamConfig): ExamResult {
  const items: ExamItemResult[] = [];
  const secs: ExamResult['sections'] = [];
  let score = 0;
  let max = 0;
  const tally = { correct: 0, wrong: 0, unattempted: 0 };
  for (const s of built.sections) {
    let ss = 0;
    for (const qid of s.qids) {
      const q = qmap[qid];
      const g = prog.answers[qid];
      const attempted = g !== null && g !== undefined && !(Array.isArray(g) && g.length === 0);
      const ok = attempted ? isCorrect(q, g) : null;
      const t = prog.timeMs[qid] || 0;
      if (ok === true) {
        ss += s.marks.correct;
        tally.correct++;
      } else if (ok === false) {
        ss += s.marks.wrong;
        tally.wrong++;
      } else tally.unattempted++;
      items.push({ qid, section: s.name, given: attempted ? g! : null, correct: ok, timeMs: t, marked: !!prog.marked[qid], error: ok === false ? diagnose(q, g, t) : undefined });
    }
    const smax = s.qids.length * s.marks.correct;
    secs.push({ name: s.name, score: ss, max: smax, count: s.qids.length });
    score += ss;
    max += smax;
  }
  const notes: string[] = [];
  if (cfg.qualifying) {
    const sec = secs[cfg.qualifying.section];
    if (sec) {
      const p = pct(sec.score, sec.max);
      notes.push(`${cfg.qualifying.text} Your ${sec.name}: ${p}% — ${p >= cfg.qualifying.minPercent ? 'qualifies' : 'would NOT qualify; Section B would not be evaluated'}.`);
    }
  }
  if (built.proportional) notes.push('Shortened paper: the question bank could not yet supply every section in full, so time was scaled per question. ' + built.shortfall.join('; '));
  const duration = built.sections.reduce((s, x) => s + x.minutes * 60, 0);
  return {
    id: meta.id,
    examId: built.examId,
    title: built.title,
    startedAt: meta.startedAt,
    endedAt: meta.endedAt,
    durationSec: duration,
    usedSec: meta.usedSec,
    scoring: tally,
    score,
    maxScore: max,
    questions: items,
    sections: secs,
    proportional: built.proportional,
    notes,
  };
}

// ------------------------------------------------------------------ report analysis

export interface Breakdown {
  key: string;
  correct: number;
  wrong: number;
  skipped: number;
  total: number;
  pct: number;
  timeSec: number;
}

export function breakdown(r: ExamResult, qmap: Record<string, Question>, key: (q: Question) => string): Breakdown[] {
  const m: Record<string, Breakdown> = {};
  for (const it of r.questions) {
    const q = qmap[it.qid];
    if (!q) continue;
    const k = key(q);
    const b = (m[k] ||= { key: k, correct: 0, wrong: 0, skipped: 0, total: 0, pct: 0, timeSec: 0 });
    b.total++;
    b.timeSec += it.timeMs / 1000;
    if (it.correct === true) b.correct++;
    else if (it.correct === false) b.wrong++;
    else b.skipped++;
  }
  return Object.values(m)
    .map((b) => ({ ...b, pct: pct(b.correct, b.total), timeSec: Math.round(b.timeSec) }))
    .sort((a, b) => b.pct - a.pct);
}

export interface Diagnosis {
  errorCounts: { kind: string; label: string; count: number }[];
  timeWasted: ExamItemResult[]; // > 2× budget
  slowWrong: ExamItemResult[]; // wrong after > 1.5× budget
  guesses: ExamItemResult[];
  recommendations: string[];
}

export function diagnoseExam(r: ExamResult, qmap: Record<string, Question>, cfg: ExamConfig): Diagnosis {
  const counts: Record<string, number> = {};
  for (const it of r.questions) if (it.error) counts[it.error] = (counts[it.error] || 0) + 1;
  const errorCounts = Object.entries(counts)
    .map(([kind, count]) => ({ kind, label: ERROR_NAMES[kind as ErrorKind] ?? kind, count }))
    .sort((a, b) => b.count - a.count);
  const budget = (it: ExamItemResult) => (qmap[it.qid]?.time ?? 60) * 1000;
  const timeWasted = r.questions.filter((it) => it.timeMs > 2 * budget(it)).sort((a, b) => b.timeMs - a.timeMs);
  const slowWrong = r.questions.filter((it) => it.correct === false && it.timeMs > 1.5 * budget(it));
  const guesses = r.questions.filter((it) => it.error === 'guess');
  const rec: string[] = [];
  const top = errorCounts[0];
  if (top?.kind === 'concept') rec.push('Most errors were conceptual: revisit the Learn & Master lesson for the weakest topics below before more practice.');
  if (counts.calculation) rec.push(`${counts.calculation} calculation slip(s): write units at every step and re-check arithmetic on numerical questions.`);
  if (counts.formula) rec.push(`${counts.formula} wrong-formula answer(s): practise identifying which principle applies before calculating (Science IQ mode trains this).`);
  if (counts.misread) rec.push(`${counts.misread} misreading error(s): underline NOT / EXCEPT / "incorrect" and the quantity asked for.`);
  if (counts.unit) rec.push(`${counts.unit} unit error(s): convert everything to SI before substituting.`);
  if (guesses.length) {
    const neg = cfg.sections.some((s) => s.marks.wrong < 0);
    rec.push(`${guesses.length} answer(s) given far too fast to have been reasoned — ${neg ? 'with negative marking, blind guesses cost marks; eliminate options first' : 'there is no negative marking, but reasoned elimination beats blind guessing'}.`);
  }
  if (timeWasted.length >= 3) rec.push(`${timeWasted.length} questions took over twice their time budget. Use "mark for review" and move on after ~1.5× budget, then return.`);
  const unatt = r.scoring.unattempted;
  if (unatt && cfg.sections.every((s) => s.marks.wrong === 0)) rec.push(`${unatt} question(s) left blank in a paper with no negative marking — always attempt every question.`);
  if (!rec.length) rec.push('Strong, well-paced paper. Move up a difficulty level in Expert Arena and Science IQ.');
  return { errorCounts, timeWasted, slowWrong, guesses, recommendations: rec };
}
