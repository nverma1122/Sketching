import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { LEVELS, MEDIA, PICTURES, pictureSrc, type Picture } from '../data/pictures';
import { pickPicture, pushRecent } from './pick';

const seq = (vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

const P = (id: string, level: Picture['level'], medium: Picture['medium']): Picture => ({ id, level, medium, title: id, w: 1, h: 1 });
const LIB = [P('q1', 'quick', 'ink'), P('q2', 'quick', 'ink'), P('q3', 'quick', 'pencil'), P('l1', 'long', 'watercolour'), P('l2', 'long', 'ink')];

describe('picture library', () => {
  it('has a file for every picture and valid labels', () => {
    expect(PICTURES.length).toBeGreaterThan(0);
    const levels = LEVELS.map((l) => l.key);
    const media = MEDIA.map((m) => m.key);
    for (const p of PICTURES) {
      expect(existsSync(`public/${pictureSrc(p)}`), p.id).toBe(true);
      expect(levels).toContain(p.level);
      expect(media).toContain(p.medium);
      expect(p.title.length).toBeGreaterThan(3);
    }
    expect(new Set(PICTURES.map((p) => p.id)).size).toBe(PICTURES.length);
  });
});

describe('pickPicture', () => {
  it('matches length and medium exactly when possible', () => {
    for (let i = 0; i < 20; i++) {
      const r = pickPicture(LIB, { level: 'quick', medium: 'ink' }, [], Math.random)!;
      expect(r.picture.level).toBe('quick');
      expect(r.picture.medium).toBe('ink');
      expect(r.note).toBeUndefined();
    }
  });

  it('never repeats the current picture when there is a choice', () => {
    let recent: string[] = [];
    let last = '';
    for (let i = 0; i < 30; i++) {
      const r = pickPicture(LIB, { level: 'quick' }, recent, Math.random)!;
      expect(r.picture.id).not.toBe(last);
      last = r.picture.id;
      recent = pushRecent(recent, last);
    }
  });

  it('keeps the length and explains when the medium is missing', () => {
    const r = pickPicture(LIB, { level: 'quick', medium: 'gouache' }, [], seq([0]))!;
    expect(r.picture.level).toBe('quick');
    expect(r.note).toMatch(/No gouache pictures at this length/);
  });

  it('falls back to the nearest length and explains', () => {
    const r = pickPicture(LIB, { level: 'deep', medium: 'watercolour' }, [], seq([0]))!;
    expect(r.picture.id).toBe('l1');
    expect(r.note).toMatch(/No deep pictures yet/);
  });

  it('returns the only match even if it was just shown', () => {
    const r = pickPicture(LIB, { level: 'long', medium: 'watercolour' }, ['l1'], seq([0]))!;
    expect(r.picture.id).toBe('l1');
  });
});
