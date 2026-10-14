import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { CANVA, LEVELS, MEDIA, PICTURES, pictureSrc, type Item } from '../data/pictures';
import { pickPicture, pushRecent } from './pick';

const seq = (vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

const P = (id: string, level: Item['level'], medium: Item['medium']): Item => ({
  id,
  kind: 'canva',
  level,
  medium,
  title: id,
  src: id,
  large: id,
  w: 1,
  h: 1,
});
const PH = (id: string, level: Item['level']): Item => ({
  id,
  kind: 'photo',
  level,
  title: id,
  src: id,
  large: id,
  w: 1,
  h: 1,
});
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

  it('keeps the medium and tries the nearest length first', () => {
    const r = pickPicture(LIB, { level: 'quick', medium: 'watercolour' }, [], seq([0]))!;
    expect(r.picture.id).toBe('l1');
    expect(r.note).toMatch(/No quick watercolour pictures available right now — here is a long one/);
  });

  it('changes the medium only when no length has it', () => {
    const r = pickPicture(LIB, { level: 'quick', medium: 'gouache' }, [], seq([0]))!;
    expect(r.picture.level).toBe('quick');
    expect(r.note).toMatch(/No gouache pictures available right now — here is one in/);
  });

  it('falls back to the nearest length and explains', () => {
    const r = pickPicture(LIB, { level: 'deep', medium: 'watercolour' }, [], seq([0]))!;
    expect(r.picture.id).toBe('l1');
    expect(r.note).toMatch(/No deep watercolour pictures available right now/);
  });

  it('returns the only match even if it was just shown', () => {
    const r = pickPicture(LIB, { level: 'long', medium: 'watercolour' }, ['l1'], seq([0]))!;
    expect(r.picture.id).toBe('l1');
  });

  it('shows photos only when the medium is Any', () => {
    const lib = [...LIB, PH('d1', 'deep'), { ...P('d2', 'deep', 'gouache'), kind: 'art' as const }];
    for (let i = 0; i < 10; i++) {
      const r = pickPicture(lib, { level: 'deep', medium: 'gouache' }, [])!;
      expect(r.picture.id).toBe('d2');
      expect(r.note).toBeUndefined();
    }
    const any = new Set(Array.from({ length: 40 }, () => pickPicture(lib, { level: 'deep' }, [])!.picture.id));
    expect(any).toEqual(new Set(['d1', 'd2']));
  });

  it('mixes Canva pictures and photos evenly even when photos outnumber them', () => {
    const lib = [P('q1', 'quick', 'ink'), P('q2', 'quick', 'ink'), ...Array.from({ length: 40 }, (_, i) => PH(`p${i}`, 'quick'))];
    let canva = 0;
    let recent: string[] = [];
    for (let i = 0; i < 400; i++) {
      const r = pickPicture(lib, { level: 'quick' }, recent)!;
      if (r.picture.kind === 'canva') canva++;
      recent = pushRecent(recent, r.picture.id);
    }
    expect(canva).toBeGreaterThan(120);
    expect(canva).toBeLessThan(280);
  });
});

describe('own pictures', () => {
  const M = (id: string, level: Item['level'], medium?: Item['medium']): Item => ({
    id,
    kind: 'mine',
    level,
    medium,
    title: id,
    src: id,
    large: id,
    w: 1,
    h: 1,
  });

  it('respects a saved medium; own pictures saved for any medium suit every medium', () => {
    const lib = [M('m-ink', 'short', 'ink'), M('m-any', 'short')];
    for (let i = 0; i < 10; i++) {
      const r = pickPicture(lib, { level: 'short', medium: 'gouache' }, [])!;
      expect(r.picture.id).toBe('m-any');
    }
  });

  it('gives Canva pictures, photos and own pictures a fair share', () => {
    const lib = [P('q1', 'quick', 'ink'), M('m1', 'quick'), ...Array.from({ length: 30 }, (_, i) => PH(`p${i}`, 'quick'))];
    const count = { canva: 0, art: 0, photo: 0, mine: 0 };
    let recent: string[] = [];
    for (let i = 0; i < 600; i++) {
      const r = pickPicture(lib, { level: 'quick' }, recent)!;
      count[r.picture.kind]++;
      recent = pushRecent(recent, r.picture.id);
    }
    expect(count.photo).toBeGreaterThan(150);
    expect(count.canva + count.mine).toBeGreaterThan(200);
  });
});

describe('bundled Canva items', () => {
  it('mirror pictures.json', () => {
    expect(CANVA).toHaveLength(PICTURES.length);
    expect(CANVA.every((c) => c.kind === 'canva' && c.medium)).toBe(true);
  });
});
