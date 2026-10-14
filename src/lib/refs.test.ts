import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { PROMPTS, getPrompt } from '../data/prompts';
import { ILLUSTRATED, illustratedFor, illustratedSrc } from '../data/illustrated';
import { buildGuide } from '../components/SceneGuide';
import { libraryFor, libraryScore, parseTags } from './library';
import { VIGNETTE, buildSuggestion } from './plan';

describe('bundled illustrated references', () => {
  it('has a file for every reference and only links to real scenes', () => {
    for (const r of ILLUSTRATED) {
      const file = `public/${illustratedSrc(r)}`;
      expect(existsSync(file), file).toBe(true);
      expect(statSync(file).size, file).toBeLessThan(400_000);
      expect(r.scenes.length, r.id).toBeGreaterThan(0);
      for (const id of r.scenes) expect(getPrompt(id), `${r.id} → ${id}`).toBeDefined();
    }
  });

  it('gives every new sketchbook scene at least one illustrated reference', () => {
    for (const p of PROMPTS.filter((x) => x.id.startsWith('sk-'))) expect(illustratedFor(p.id).length, p.id).toBeGreaterThan(0);
  });

  it('puts the artist’s own sketches first when both kinds match', () => {
    const refs = illustratedFor('sf-02');
    expect(refs[0].kind).toBe('my-sketch');
    expect(refs.length).toBeGreaterThanOrEqual(3);
  });
});

describe('personal reference library matching', () => {
  const p = getPrompt('sk-18')!; // Japanese tea shop with a noren
  it('shows explicitly linked images first', () => {
    expect(libraryScore({ title: 'x', tags: [], promptIds: [p.id] }, p)).toBe(100);
  });
  it('matches by shared words in tags or title', () => {
    expect(libraryScore({ title: 'Kyoto doorway', tags: ['noren', 'tea shop'], promptIds: [] }, p)).toBeGreaterThan(0);
    expect(libraryScore({ title: 'Harbour boats', tags: ['lake'], promptIds: [] }, p)).toBe(0);
    // Category names are not used, so a "tea shop" image does not match every café or bookshop.
    expect(libraryScore({ title: 'x', tags: ['tea shop'], promptIds: [] }, getPrompt('bk-01')!)).toBe(0);
  });
  it('orders matches by strength', () => {
    const items = [
      { title: 'tea', tags: [], promptIds: [] },
      { title: 'noren tea shop japan', tags: ['lantern'], promptIds: [] },
      { title: 'boats', tags: [], promptIds: [] },
    ];
    expect(libraryFor(items, p).map((i) => i.title)).toEqual(['noren tea shop japan', 'tea']);
  });
  it('parses comma-separated tags', () => {
    expect(parseTags(' noren, kanji ,, shopfront ')).toEqual(['noren', 'kanji', 'shopfront']);
  });
});

describe('composition guides and vignette guidance', () => {
  it('renders a guide for every scene with its study region', () => {
    for (const p of PROMPTS) {
      const { regions, ctx } = buildGuide(p.guide, p.id);
      expect(regions[p.study.region], `${p.id} ${p.study.region}`).toBeDefined();
      expect(ctx.lines.length, p.id).toBeGreaterThan(20);
    }
  });

  it('adds vignette framing to the composition and the plan', () => {
    const p = getPrompt('sk-01')!;
    const b = buildSuggestion(p, { time: '20', medium: 'ink-wash', simplified: 0, createdAt: 1 });
    expect(b.composition.find((c) => c.label === 'Vignette')?.text).toBe(VIGNETTE.waterfront);
    expect(b.plan[0].text).toContain(VIGNETTE.waterfront);
    expect(b.plan.at(-1)!.text).not.toContain(VIGNETTE.waterfront);
  });

  it('gives sign-lettering advice for scenes with script on their signs', () => {
    const kirana = buildSuggestion(getPrompt('sf-02')!, { time: '20', medium: 'ink', simplified: 0, createdAt: 1 });
    expect(kirana.composition.find((c) => c.label === 'Signs')?.text).toMatch(/Devanagari/);
    const sento = buildSuggestion(getPrompt('sk-09')!, { time: '20', medium: 'ink', simplified: 0, createdAt: 1 });
    expect(sento.composition.find((c) => c.label === 'Signs')?.text).toMatch(/kanji/);
  });
});
