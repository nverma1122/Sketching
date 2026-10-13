import { describe, expect, it } from 'vitest';
import { PROMPTS, getPrompt } from '../data/prompts';
import { CATEGORIES, MEDIA, TIMES, TIME_ORDER } from '../data/taxonomy';
import { TEMPLATE_REGIONS } from '../data/regions';
import { levelOf, richnessTotal } from '../data/prompts/define';
import type { Level, TimeKey } from '../data/types';
import { queriesFor, toSearch } from './commons';
import { pushRecent, selectPrompt, todaysPrompt } from './selector';
import { approachFor, buildSuggestion } from './plan';
import { hashString, seededRng } from './random';

const ctx = (over: Partial<Parameters<typeof selectPrompt>[2]> = {}) => ({
  recent: [] as string[],
  attempted: {},
  saved: [] as string[],
  rng: seededRng(42),
  ...over,
});

const LEVEL_KEYS: Level[] = ['relaxed', 'intermediate', 'detailed'];

describe('scene library', () => {
  it('has at least 150 scenes with unique ids and titles', () => {
    expect(PROMPTS.length).toBeGreaterThanOrEqual(150);
    expect(new Set(PROMPTS.map((p) => p.id)).size).toBe(PROMPTS.length);
    expect(new Set(PROMPTS.map((p) => p.title)).size).toBe(PROMPTS.length);
  });

  it('is centred on intermediate urban sketching', () => {
    const by = (l: Level) => PROMPTS.filter((p) => p.level === l).length;
    expect(by('intermediate')).toBeGreaterThan(by('relaxed'));
    expect(by('intermediate') + by('detailed')).toBeGreaterThanOrEqual(PROMPTS.length * 0.75);
    // Every scene is a multi-element composition: at least three secondary elements.
    for (const p of PROMPTS) expect(p.secondary.length, p.id).toBeGreaterThanOrEqual(3);
  });

  it('derives the level from the richness dimensions', () => {
    for (const p of PROMPTS) {
      expect(p.level).toBe(levelOf(p.richness));
      for (const v of Object.values(p.richness)) expect([1, 2, 3]).toContain(v);
    }
  });

  it('has the full per-scene guidance for every scene', () => {
    for (const p of PROMPTS) {
      const where = p.id;
      expect(p.scene.length, where).toBeGreaterThanOrEqual(120);
      expect(p.why.length, where).toBeGreaterThanOrEqual(60);
      for (const k of ['view', 'structure', 'perspective', 'negative', 'shadows', 'unfinished'] as const) expect(p[k].length, `${where} ${k}`).toBeGreaterThanOrEqual(25);
      expect(p.lines.length, where).toBeGreaterThanOrEqual(60);
      expect(p.washes.length, where).toBeGreaterThanOrEqual(70);
      expect(p.hatch.length, where).toBeGreaterThanOrEqual(3);
      expect(p.hatch.length, where).toBeLessThanOrEqual(4);
      expect(p.palette.length, where).toBeGreaterThanOrEqual(2);
      for (const k of ['ten', 'twenty', 'long'] as const) expect(p[k].length, `${where} ${k}`).toBeGreaterThanOrEqual(50);
      expect(p.study.text.length, where).toBeGreaterThanOrEqual(50);
      expect(p.media.length, where).toBeGreaterThan(0);
      expect(TIMES.map((t) => t.key)).toContain(p.fullTime);
    }
  });

  it('uses a valid focus region of the scene guide for every 5-minute study', () => {
    for (const p of PROMPTS) expect(Object.keys(TEMPLATE_REGIONS[p.guide.t]), p.id).toContain(p.study.region);
  });

  it('covers every subject and medium', () => {
    for (const c of CATEGORIES) expect(PROMPTS.some((p) => p.categories.includes(c.key)), c.key).toBe(true);
    for (const m of MEDIA) expect(PROMPTS.filter((p) => p.media.includes(m.key)).length, m.key).toBeGreaterThanOrEqual(20);
  });

  it('has Commons search words for every scene', () => {
    for (const p of PROMPTS) {
      expect(queriesFor(p).length, p.id).toBeGreaterThanOrEqual(2);
      expect(toSearch(queriesFor(p)[0])).toMatch(/^intitle:\S+( intitle:\S+)* filetype:bitmap$/);
    }
  });
});

describe('selectPrompt', () => {
  it('defaults to intermediate scenes', () => {
    for (let i = 0; i < 40; i++) {
      const r = selectPrompt(PROMPTS, { time: '10' }, ctx({ rng: seededRng(i) }))!;
      expect(r.prompt.level).toBe('intermediate');
      expect(r.level).toBe('intermediate');
    }
  });

  it('does not lower scene richness for short sessions', () => {
    const avg = (t: TimeKey) => {
      let sum = 0;
      for (let i = 0; i < 60; i++) sum += richnessTotal(selectPrompt(PROMPTS, { time: t }, ctx({ rng: seededRng(i) }))!.prompt.richness);
      return sum / 60;
    };
    expect(Math.abs(avg('5') - avg('120'))).toBeLessThan(0.6);
    expect(avg('5')).toBeGreaterThanOrEqual(9);
  });

  it('respects the chosen level, medium and subject when possible', () => {
    for (const level of LEVEL_KEYS)
      for (const m of MEDIA) {
        const r = selectPrompt(PROMPTS, { time: '20', medium: m.key, level }, ctx())!;
        expect(r.medium).toBe(m.key);
        expect(r.prompt.media).toContain(m.key);
        expect(r.prompt.level).toBe(level);
        expect(r.exact).toBe(true);
      }
    for (const c of CATEGORIES) {
      const r = selectPrompt(PROMPTS, { category: c.key }, ctx())!;
      expect(r.prompt.categories).toContain(c.key);
    }
  });

  it('uses the saved level unless the request overrides it', () => {
    expect(selectPrompt(PROMPTS, {}, ctx({ level: 'detailed' }))!.prompt.level).toBe('detailed');
    expect(selectPrompt(PROMPTS, { level: 'relaxed' }, ctx({ level: 'detailed' }))!.prompt.level).toBe('relaxed');
  });

  it('never returns the excluded (current) scene', () => {
    for (let i = 0; i < 50; i++) {
      const r = selectPrompt(PROMPTS, { category: 'cafes' }, ctx({ rng: seededRng(i), exclude: ['bk-01'] }))!;
      expect(r.prompt.id).not.toBe('bk-01');
    }
  });

  it('does not repeat scenes across a run of "another idea" requests', () => {
    let recent: string[] = [];
    const seen: string[] = [];
    const rng = seededRng(7);
    for (let i = 0; i < 25; i++) {
      const r = selectPrompt(PROMPTS, { time: '10', medium: 'ink-wash' }, ctx({ recent, rng, exclude: seen.slice(-1) }))!;
      seen.push(r.prompt.id);
      recent = pushRecent(recent, r.prompt.id);
    }
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('relaxes the subject before the level, and says so', () => {
    // Exhaust intermediate tea-stall/café scenes in ink.
    const pool = PROMPTS.filter((p) => p.categories.includes('cafes') && p.level === 'intermediate' && p.media.includes('ink'));
    expect(pool.length).toBeGreaterThan(0);
    const r = selectPrompt(PROMPTS, { category: 'cafes', medium: 'ink' }, ctx({ exclude: pool.map((p) => p.id) }))!;
    expect(r.prompt.level).toBe('intermediate');
    expect(r.prompt.media).toContain('ink');
    expect(r.broadened.join(' ')).toMatch(/subject/);
    expect(r.broadened.join(' ')).not.toMatch(/level/);
  });

  it('explains a level change when it has to make one', () => {
    const pool = PROMPTS.filter((p) => p.level === 'detailed');
    const r = selectPrompt(PROMPTS, { level: 'detailed' }, ctx({ exclude: pool.map((p) => p.id) }))!;
    expect(r.prompt.level).toBe('intermediate');
    expect(r.broadened.join(' ')).toMatch(/sketching level/);
  });

  it('allows older history rather than changing level when every match was seen', () => {
    const pool = PROMPTS.filter((p) => p.level === 'relaxed').map((p) => p.id);
    const r = selectPrompt(PROMPTS, { level: 'relaxed' }, ctx({ recent: pool }))!;
    expect(r.prompt.level).toBe('relaxed');
    expect(pool.slice(0, 6)).not.toContain(r.prompt.id);
    expect(r.broadened.join(' ')).toMatch(/recent history/);
  });

  it('prefers scenes not attempted recently', () => {
    const now = Date.now();
    const pool = PROMPTS.filter((p) => p.level === 'intermediate' && p.categories.includes('shopfronts'));
    const attempted = Object.fromEntries(pool.slice(0, pool.length - 3).map((p) => [p.id, now]));
    let hits = 0;
    const rng = seededRng(3);
    for (let i = 0; i < 400; i++) {
      const r = selectPrompt(PROMPTS, { category: 'shopfronts' }, ctx({ rng, attempted, now }))!;
      if (!attempted[r.prompt.id]) hits++;
    }
    // Uniform choice would give about 1200 / pool.length; the cooldown should roughly triple it.
    expect(hits).toBeGreaterThan((2 * 1200) / pool.length);
  });

  it('uses weighted randomness rather than always the first match', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 30; i++) ids.add(selectPrompt(PROMPTS, {}, ctx({ rng: seededRng(i) }))!.prompt.id);
    expect(ids.size).toBeGreaterThan(15);
  });

  it('gives a stable scene for a given day at the chosen level', () => {
    const a = todaysPrompt(PROMPTS, '2026-10-13', hashString, 'intermediate');
    expect(todaysPrompt(PROMPTS, '2026-10-13', hashString, 'intermediate').id).toBe(a.id);
    expect(a.level).toBe('intermediate');
    expect(todaysPrompt(PROMPTS, '2026-10-13', hashString, 'detailed').level).toBe('detailed');
  });
});

describe('buildSuggestion', () => {
  const p = getPrompt('bk-01')!;
  const sug = (time: TimeKey, medium = p.media[0], simplified = 0) => ({ time, medium, simplified, createdAt: 1 });

  it('maps time to an approach of the same scene', () => {
    expect(TIME_ORDER.map((t) => approachFor(t))).toEqual(['study', 'structure', 'composition', 'complete', 'complete', 'complete']);
  });

  it('turns 5 minutes into a focused study with a highlighted region', () => {
    for (const prompt of PROMPTS) {
      const b = buildSuggestion(prompt, sug('5', prompt.media[0]));
      expect(b.approach).toBe('study');
      expect(b.focusRegion).toBe(prompt.study.region);
      expect(b.plan.map((s) => s.text).join(' ')).toContain(b.focusLabel!);
      expect(b.plan.some((s) => s.text.includes(prompt.study.text.slice(0, 30)))).toBe(true);
      // The scene stays rich.
      expect(b.prompt.richness).toEqual(prompt.richness);
    }
  });

  it('adds structure at 10, composition at 20 and materials and colour at 40+', () => {
    const text = (t: TimeKey) => buildSuggestion(p, sug(t, 'ink-wash')).plan.map((s) => s.text).join(' ');
    expect(text('10')).toContain(p.ten);
    expect(text('20')).toContain(p.twenty);
    expect(text('20')).not.toContain(p.long);
    expect(text('40')).toContain(p.long);
    expect(text('40')).toContain(p.palette[0]);
    expect(buildSuggestion(p, sug('40')).plan.length).toBeGreaterThan(buildSuggestion(p, sug('10')).plan.length);
  });

  it('gives ink-and-wash guidance on structure, open edges, few washes and white paper', () => {
    const b = buildSuggestion(p, sug('20', 'ink-wash'));
    const g = b.mediumGuidance.join(' ').toLowerCase();
    expect(g).toMatch(/confident ink lines/);
    expect(g).toMatch(/open/);
    expect(g).toMatch(/few purposeful areas/);
    expect(g).toMatch(/white paper/);
    expect(g).toMatch(/anchor/);
    expect(b.colour.optional).toBe(false);
    expect(buildSuggestion(p, sug('20', 'ink')).colour.optional).toBe(true);
  });

  it('changes guidance by level without changing the scene or time', () => {
    const r = buildSuggestion(p, sug('20'), 'relaxed');
    const d = buildSuggestion(p, sug('20'), 'detailed');
    expect(r.time).toBe(d.time);
    expect(r.lineTone.hatch.length).toBe(2);
    expect(d.lineTone.hatch.length).toBe(p.hatch.length);
    expect(d.mediumGuidance.length).toBeGreaterThan(buildSuggestion(p, sug('20'), 'intermediate').mediumGuidance.length);
  });

  it('keeps the time when made simpler, stepping down the approach', () => {
    const one = buildSuggestion(p, sug('40', p.media[0], 1));
    const two = buildSuggestion(p, sug('40', p.media[0], 2));
    expect(one.time).toBe('40');
    expect(one.approach).toBe('composition');
    expect(two.time).toBe('40');
    expect(two.approach).toBe('study');
    expect(approachFor('10', 1)).toBe('study');
    expect(approachFor('20', 1)).toBe('structure');
  });

  it('never produces empty or malformed plan steps', () => {
    for (const prompt of PROMPTS)
      for (const t of TIME_ORDER)
        for (const s of [0, 1, 2]) {
          const b = buildSuggestion(prompt, sug(t, prompt.media[0], s));
          for (const step of b.plan) {
            expect(step.text.trim().length, `${prompt.id} ${t} ${s}`).toBeGreaterThan(20);
            expect(step.text).not.toMatch(/undefined|\.\.|\s,/);
            expect(step.label).toMatch(/\d/);
          }
        }
  });
});
