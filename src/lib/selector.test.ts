import { describe, expect, it } from 'vitest';
import { PROMPTS, getPrompt } from '../data/prompts';
import { CATEGORIES, MEDIA, TIMES } from '../data/taxonomy';
import type { Criteria, Medium, SketchPrompt } from '../data/types';
import { REFERENCE_IDS } from '../data/referenceIds';
import { PHOTO_QUERIES } from '../data/photoQueries';
import { toSearch } from './commons';
import { fitsTime, pushRecent, selectPrompt, todaysPrompt } from './selector';
import { buildSuggestion } from './plan';
import { hashString, seededRng } from './random';

const ctx = (over: Partial<Parameters<typeof selectPrompt>[2]> = {}) => ({
  recent: [] as string[],
  attempted: {},
  saved: [] as string[],
  rng: seededRng(42),
  ...over,
});

describe('prompt library', () => {
  it('has at least 120 unique ids', () => {
    const ids = new Set(PROMPTS.map((p) => p.id));
    expect(ids.size).toBe(PROMPTS.length);
    expect(PROMPTS.length).toBeGreaterThanOrEqual(120);
  });

  it('has unique titles', () => {
    expect(new Set(PROMPTS.map((p) => p.title)).size).toBe(PROMPTS.length);
  });

  it('meets the category minimums', () => {
    const count = (f: (p: SketchPrompt) => boolean) => PROMPTS.filter(f).length;
    expect(count((p) => p.categories.includes('urban') || p.categories.includes('architecture'))).toBeGreaterThanOrEqual(25);
    expect(count((p) => p.categories.includes('shopfronts') || p.categories.includes('windows'))).toBeGreaterThanOrEqual(20);
    expect(count((p) => p.categories.includes('still-life'))).toBeGreaterThanOrEqual(20);
    expect(count((p) => p.categories.includes('nature'))).toBeGreaterThanOrEqual(15);
    expect(count((p) => p.media[0] === 'ink' || p.media[0] === 'hatching')).toBeGreaterThanOrEqual(15);
    expect(count((p) => p.media[0] === 'watercolour' || p.media[0] === 'ink-wash')).toBeGreaterThanOrEqual(15);
  });

  it('has complete, valid fields for every prompt', () => {
    for (const p of PROMPTS) {
      expect(p.title.length, p.id).toBeGreaterThan(3);
      expect(p.description.length, p.id).toBeGreaterThan(60);
      expect(p.categories.length, p.id).toBeGreaterThan(0);
      expect(p.media.length, p.id).toBeGreaterThan(0);
      expect(p.composition.length, p.id).toBeGreaterThanOrEqual(3);
      expect(p.steps.length, p.id).toBeGreaterThanOrEqual(3);
      expect(p.constraint.length, p.id).toBeGreaterThan(5);
      expect(p.simpler.length, p.id).toBeGreaterThan(5);
      expect(REFERENCE_IDS, p.id).toContain(p.reference);
      expect(TIMES.map((t) => t.key).indexOf(p.time[0]), p.id).toBeLessThanOrEqual(TIMES.map((t) => t.key).indexOf(p.time[1]));
    }
  });

  it('has a photo search for every prompt', () => {
    for (const p of PROMPTS) {
      expect(PHOTO_QUERIES[p.id]?.length, p.id).toBeGreaterThan(0);
    }
    expect(Object.keys(PHOTO_QUERIES).every((id) => getPrompt(id)), 'no orphan photo queries').toBe(true);
    expect(toSearch('tea stall')).toBe('intitle:tea intitle:stall filetype:bitmap');
  });

  it('has a substantial set of advanced ideas', () => {
    const adv = PROMPTS.filter((p) => p.difficulty === 4);
    expect(adv.length).toBeGreaterThanOrEqual(25);
    expect(PROMPTS.filter((p) => p.time[1] === '120').length).toBeGreaterThanOrEqual(25);
  });

  it('offers something for every time × medium combination', () => {
    for (const t of TIMES) {
      for (const m of MEDIA) {
        const n = PROMPTS.filter((p) => fitsTime(p, t.key, 'exact') && p.media.includes(m.key)).length;
        expect(n, `${t.key} ${m.key}`).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe('selectPrompt', () => {
  it('respects time and medium filters exactly when possible', () => {
    for (const t of TIMES) {
      for (const m of MEDIA) {
        const r = selectPrompt(PROMPTS, { time: t.key, medium: m.key }, ctx())!;
        expect(r.exact).toBe(true);
        expect(r.time).toBe(t.key);
        expect(r.medium).toBe(m.key);
        expect(fitsTime(r.prompt, t.key, 'exact')).toBe(true);
        expect(r.prompt.media).toContain(m.key);
      }
    }
  });

  it('respects every category', () => {
    for (const c of CATEGORIES) {
      const r = selectPrompt(PROMPTS, { category: c.key, time: '20' }, ctx())!;
      expect(r.prompt.categories).toContain(c.key);
    }
  });

  it('5 minutes + black ink gives a quick ink idea with a five-step-or-fewer minute plan', () => {
    const r = selectPrompt(PROMPTS, { time: '5', medium: 'ink', category: 'urban' }, ctx())!;
    expect(r.medium).toBe('ink');
    const built = buildSuggestion(r.prompt, { time: r.time, medium: r.medium, simplified: 0, createdAt: 1 });
    expect(built.plan.map((s) => s.label)).toEqual(['Minute 1', 'Minutes 2–3', 'Minute 4', 'Minute 5']);
  });

  it('never returns the excluded (current) prompt', () => {
    const first = selectPrompt(PROMPTS, { time: '5', medium: 'ink' }, ctx())!;
    for (let seed = 0; seed < 50; seed++) {
      const r = selectPrompt(PROMPTS, { time: '5', medium: 'ink' }, ctx({ exclude: [first.prompt.id], rng: seededRng(seed) }))!;
      expect(r.prompt.id).not.toBe(first.prompt.id);
    }
  });

  it('does not repeat prompts across a run of "another idea" requests', () => {
    const criteria: Criteria = { time: '20', medium: 'ink-wash' };
    let recent: string[] = [];
    let current: string | undefined;
    const seen: string[] = [];
    const rng = seededRng(7);
    const exactCount = PROMPTS.filter((p) => fitsTime(p, '20', 'exact') && p.media.includes('ink-wash')).length;
    for (let i = 0; i < Math.min(exactCount, 30); i++) {
      const r = selectPrompt(PROMPTS, criteria, { recent, attempted: {}, saved: [], exclude: current ? [current] : [], rng })!;
      seen.push(r.prompt.id);
      current = r.prompt.id;
      recent = pushRecent(recent, r.prompt.id);
    }
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('broadens the least important filter first and says so', () => {
    // A very narrow combination: 5 minutes, watercolour, architecture, ready to concentrate.
    const criteria: Criteria = { time: '5', medium: 'watercolour', category: 'architecture', energy: 'focus' };
    const r = selectPrompt(PROMPTS, criteria, ctx())!;
    expect(r).not.toBeNull();
    expect(r.exact).toBe(false);
    expect(r.broadened[0]).toMatch(/energy/);
    // Medium is the most important filter and should be kept.
    expect(r.medium).toBe('watercolour');
  });

  it('falls back to older history rather than dropping subject or medium', () => {
    const criteria: Criteria = { time: '5', medium: 'ink', category: 'still-life' };
    const strict = PROMPTS.filter(
      (p) => fitsTime(p, '5', 'near') && p.media.includes('ink') && (p.categories.includes('still-life') || p.categories.includes('cafes')),
    ).map((p) => p.id);
    const r = selectPrompt(PROMPTS, criteria, ctx({ recent: strict.slice(0, 40) }))!;
    expect(r.medium).toBe('ink');
    expect(r.broadened.join(' ')).toMatch(/recent history|subject/);
  });

  it('prefers prompts not attempted recently', () => {
    const criteria: Criteria = { time: '10', medium: 'pencil' };
    const matching = PROMPTS.filter((p) => fitsTime(p, '10', 'exact') && p.media.includes('pencil'));
    const attempted = Object.fromEntries(matching.slice(0, matching.length - 3).map((p) => [p.id, Date.now()]));
    const fresh = new Set(matching.slice(-3).map((p) => p.id));
    let freshHits = 0;
    for (let seed = 0; seed < 200; seed++) {
      const r = selectPrompt(PROMPTS, criteria, ctx({ attempted, rng: seededRng(seed) }))!;
      if (fresh.has(r.prompt.id)) freshHits++;
    }
    // 3 fresh vs many attempted (weight 0.3): fresh ones should be picked far more than their share.
    expect(freshHits / 200).toBeGreaterThan(3 / matching.length);
  });

  it('uses weighted randomness rather than always the first match', () => {
    const ids = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      ids.add(selectPrompt(PROMPTS, { time: '10' }, ctx({ rng: seededRng(seed) }))!.prompt.id);
    }
    expect(ids.size).toBeGreaterThan(15);
  });

  it('resolves a medium when the user chose "surprise me"', () => {
    const r = selectPrompt(PROMPTS, { time: '20' }, ctx())!;
    expect(r.prompt.media).toContain(r.medium);
  });

  it('advanced level favours demanding ideas', () => {
    const avg = (level: 'developing' | 'advanced') => {
      let sum = 0;
      for (let seed = 0; seed < 300; seed++) sum += selectPrompt(PROMPTS, { time: '40' }, ctx({ level, rng: seededRng(seed) }))!.prompt.difficulty;
      return sum / 300;
    };
    expect(avg('advanced')).toBeGreaterThan(avg('developing') + 0.8);
    expect(avg('advanced')).toBeGreaterThan(2.8);
  });

  it('two hours with watercolour finds an exact advanced match', () => {
    const r = selectPrompt(PROMPTS, { time: '120', medium: 'watercolour' }, ctx({ level: 'advanced' }))!;
    expect(r.exact).toBe(true);
    expect(r.prompt.difficulty).toBeGreaterThanOrEqual(3);
    const b = buildSuggestion(r.prompt, { time: '120', medium: 'watercolour', simplified: 0, createdAt: 1 }, 'advanced');
    expect(b.plan[0].text).toMatch(/thumbnail/i);
    expect(b.mediumGuidance.join(' ')).toMatch(/three passes/);
  });

  it('gives a stable idea for a given day', () => {
    const a = todaysPrompt(PROMPTS, '2026-10-13', hashString);
    const b = todaysPrompt(PROMPTS, '2026-10-13', hashString);
    expect(a.id).toBe(b.id);
  });
});

describe('buildSuggestion', () => {
  const p = getPrompt('shp-01')!;
  it('changes guidance meaningfully by medium', () => {
    const media: Medium[] = ['ink', 'ink-wash', 'watercolour', 'pencil', 'hatching'];
    const texts = media.map((m) => JSON.stringify(buildSuggestion(p, { time: '20', medium: m, simplified: 0, createdAt: 1 }).plan));
    expect(new Set(texts).size).toBe(media.length);
  });

  it('builds plans of the right shape for each time', () => {
    const labels = (t: '5' | '10' | '20' | '40' | '60' | '120') => buildSuggestion(p, { time: t, medium: 'ink', simplified: 0, createdAt: 1 }).plan.length;
    expect(labels('5')).toBe(4);
    expect(labels('10')).toBe(4);
    expect(labels('20')).toBe(5);
    expect(labels('40')).toBe(6);
    expect(labels('60')).toBe(6);
    expect(labels('120')).toBe(6);
  });

  it('makes a simpler version shorter and easier', () => {
    const normal = buildSuggestion(p, { time: '20', medium: 'ink', simplified: 0, createdAt: 1 });
    const simple = buildSuggestion(p, { time: '20', medium: 'ink', simplified: 1, createdAt: 1 });
    expect(simple.time).toBe('10');
    expect(simple.focus).toBe(p.simpler);
    expect(simple.composition.length).toBeLessThan(normal.composition.length);
    expect(simple.constraint).not.toBe(normal.constraint);
  });

  it('never produces empty plan steps', () => {
    for (const prompt of PROMPTS) {
      for (const t of ['5', '10', '20', '40', '60', '120'] as const) {
        for (const s of [0, 1, 2]) {
          const b = buildSuggestion(prompt, { time: t, medium: prompt.media[0], simplified: s, createdAt: 1 });
          for (const step of b.plan) expect(step.text.trim().length, `${prompt.id} ${t} ${s}`).toBeGreaterThan(5);
        }
      }
    }
  });
});
