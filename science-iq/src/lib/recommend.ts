import { LESSONS } from '../data/lessons';
import { dayKey, topicStats, type State } from './store';

export interface Rec {
  revise: { key: string; label: string; detail: string }[];
  strong: { key: string; label: string; detail: string }[];
  next: { label: string; why: string; path: string };
}

const MIN = 4; // never judge a topic on fewer than 4 answers

export function recommend(s: State): Rec {
  const ts = topicStats(s).filter((t) => t.n >= MIN);
  const revise = ts.filter((t) => t.acc < 60).sort((a, b) => a.acc - b.acc).slice(0, 4).map((t) => ({ key: t.key, label: `${t.subject} · ${t.topic}`, detail: `${t.acc}% over ${t.n} answers` }));
  const strong = ts.filter((t) => t.acc >= 80).sort((a, b) => b.acc - a.acc || b.n - a.n).slice(0, 4).map((t) => ({ key: t.key, label: `${t.subject} · ${t.topic}`, detail: `${t.acc}% over ${t.n} answers` }));
  const activeMistakes = Object.values(s.mistakes).filter((m) => !m.cleared).length;
  const today = s.daily[dayKey()];
  let next: Rec['next'];
  if (s.attempts.length < 10) next = { label: 'Start with a 10-question mixed practice', why: 'A short mixed set gives the app enough evidence to start spotting your strengths and weaknesses.', path: 'practice' };
  else if (!today?.done) next = { label: "Complete today's Daily Mission", why: 'Ten questions across all subjects keeps your streak and your breadth.', path: 'daily' };
  else if (activeMistakes >= 5) next = { label: `Clear mistakes in Mistake Master (${activeMistakes} active)`, why: 'Fixing errors you have already made is the fastest way to raise your score.', path: 'mistakes' };
  else if (revise.length) {
    const key = revise[0].key;
    const lesson = LESSONS.find((l) => `${l.subject}::${l.topic}` === key);
    next = lesson
      ? { label: `Revise “${lesson.title}”, then practise it`, why: `${revise[0].label} is your weakest topic (${revise[0].detail}).`, path: `learn/${lesson.id}` }
      : { label: `Practise ${revise[0].label}`, why: `Your weakest topic (${revise[0].detail}).`, path: `practice/topic/${encodeURIComponent(key)}` };
  } else if (!s.tests.some((t) => ['mvpp', 'vvm', 'olympiad'].includes(t.kind) && Date.now() - t.at < 7 * 86_400_000))
    next = { label: 'Take an Olympiad Challenge test', why: 'No timed test in the last 7 days — exam stamina and time management need practice too.', path: 'olympiad' };
  else next = { label: 'Push yourself in Science IQ', why: 'You are doing well — unfamiliar problems are where real understanding is tested.', path: 'iq' };
  return { revise, strong, next };
}
