import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { SceneGuide } from './components/SceneGuide';
import type { GuideSpec } from './data/types';

const SPECS: [string, GuideSpec][] = [
  ['shopfront kanji tiled pole aframe', { t: 'shopfront', floors: 1, bays: 2, awning: 'tiled', sign: 'fascia', script: 'kanji', pole: 'left', aframe: true, plants: 2, books: true }],
  ['kirana devanagari corrugated', { t: 'shopfront', floors: 0, bays: 2, awning: 'corrugated', sign: 'fascia', script: 'devanagari', roof: 'pitched', cables: true, aframe: true }],
  ['corner pole', { t: 'corner', floors: 1, awning: 'corrugated', sign: 'fascia', balcony: true, pole: 'left', aframe: true }],
  ['waterfront', { t: 'waterfront', spire: true }],
  ['riverside', { t: 'riverside' }],
  ['vista', { t: 'vista' }],
  ['house stair', { t: 'house', stair: true, plants: 5 }],
  ['house kerala', { t: 'house', tiers: 3, palms: true }],
  ['steps', { t: 'steps', script: 'kanji', cables: true }],
  ['stall devanagari', { t: 'stall', script: 'devanagari', tree: 'left' }],
  ['cafe bicycle', { t: 'cafe', awning: 'striped', bicycle: true, aframe: true }],
  ['lane bicycle', { t: 'lane', bicycle: true, plants: 2 }],
];
it.skipIf(!process.env.GEN_PREVIEW)('writes guide preview', () => {
  const css = ':root{--paper:#f6f1e7;--wash-ochre:#d9b46a;--wash-sage:#9fb197;--wash-blue:#92a8bb;--wash-terra:#d08b6c;--wash-grey:#9d978c;--terracotta:#b1623f}body{background:#f6f1e7;color:#2b2925;margin:0;display:grid;grid-template-columns:repeat(3,400px);gap:8px}figure{margin:0}figcaption{font:12px sans-serif}';
  const body = SPECS.map(([n, s]) => `<figure>${renderToStaticMarkup(<SceneGuide spec={s} seed={n} title={n} />)}<figcaption>${n}</figcaption></figure>`).join('');
  writeFileSync(process.env.GEN_PREVIEW!, `<!doctype html><style>${css}</style>${body}`);
});
