// Builds src/data/bank/*.json from the authored batches in scripts/src/*.mjs, and refuses to
// write anything if a question fails validation. Run: npm run bank
//
// Checks per question:
//  - unique id; known topic for the subject; level 1–3; known type
//  - exactly 4 distinct, non-empty options; answer index in range
//  - explanation ≥ 40 chars; at least one hint (two for Science IQ problems); time 15–300 s
//  - NUMERICAL CHECK: every question with `v` (required for type "numerical") has its answer
//    recomputed independently from the expression; the correct option must match it within 0.6%
//    and no other option may match it
//  - DUPLICATE CHECK: stems are normalised (numbers → #) and compared by word-trigram Jaccard
//    similarity; ≥ 0.6 against any other question is rejected as a near-duplicate
// Competition tracks are derived from the official syllabus mapping below — never hand-typed.

import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';

const root = dirname(new URL(import.meta.url).pathname);
const SRC = join(root, 'src');
const OUT = join(root, '..', 'src', 'data', 'bank');

export const TOPICS = {
  Physics: ['Motion', "Force & Newton's Laws", 'Gravitation', 'Work, Energy & Power', 'Sound', 'Light', 'Electricity', 'Magnetism', 'Heat', 'Pressure & Buoyancy'],
  Chemistry: ['Matter', 'Atoms & Molecules', 'Atomic Structure', 'Elements, Compounds & Mixtures', 'Periodic Classification', 'Chemical Reactions', 'Acids, Bases & Salts', 'Metals & Non-metals', 'Carbon Chemistry', 'Everyday Chemistry'],
  Biology: ['Cell Biology', 'Tissues', 'Diversity of Organisms', 'Human Physiology', 'Nutrition', 'Respiration', 'Circulation', 'Reproduction', 'Genetics', 'Evolution', 'Ecology', 'Plant Biology'],
  'Space Science': ['Solar System', 'Stars & Galaxies', 'Space Exploration', 'Satellites & Orbits', 'Gravity in Space', 'Indian Space Missions', 'Astronomy'],
  'Environment & Technology': ['Climate Science', 'Biodiversity', 'Renewable Energy', 'Pollution', 'Biotechnology', 'AI & Robotics', 'Nanotechnology', 'Emerging Discoveries'],
  'Scientific Reasoning': ['Logical Reasoning', 'Patterns', 'Experimental Design', 'Data Interpretation', 'Observation & Inference', 'Numerical Reasoning', 'Applying Principles'],
};

// VVM: topics named in the official VVM 2026-27 Class IX syllabus (vvm.org.in). The Logic &
// Reasoning list includes "Scientific Reasoning", so all reasoning topics qualify.
const VVM = {
  Physics: ['Motion', "Force & Newton's Laws", 'Gravitation', 'Work, Energy & Power', 'Sound', 'Pressure & Buoyancy'],
  Chemistry: ['Matter', 'Atoms & Molecules', 'Atomic Structure', 'Elements, Compounds & Mixtures'],
  Biology: ['Cell Biology', 'Tissues', 'Diversity of Organisms', 'Reproduction', 'Ecology'],
  'Scientific Reasoning': TOPICS['Scientific Reasoning'],
};
// MVPP: the official DoE circular lists SUBJECTS only (SAT: Physics, Chemistry, Biology, …;
// MAT: reasoning). No chapter list is published, so MVPP relevance is subject-level only.
const MVPP_SUBJECTS = ['Physics', 'Chemistry', 'Biology', 'Scientific Reasoning'];

const TYPES = ['mcq', 'numerical', 'assertion-reason', 'statement', 'reasoning', 'experiment', 'application', 'data', 'interdisciplinary', 'what-if'];
const FILES = {
  physics: 'Physics',
  chemistry: 'Chemistry',
  biology: 'Biology',
  space: 'Space Science',
  envtech: 'Environment & Technology',
  reasoning: 'Scientific Reasoning',
};

const SUP = { '⁻': '-', '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
export function parseNumber(s) {
  const t = s.replace(/,(?=\d{3})/g, '').replace(/−/g, '-');
  const sci = t.match(/(-?\d+(?:\.\d+)?)\s*×\s*10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/);
  if (sci) return parseFloat(sci[1]) * Math.pow(10, parseInt([...sci[2]].map((c) => SUP[c]).join(''), 10));
  const m = t.match(/-?\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?/);
  if (!m) return NaN;
  if (m[0].includes('/')) {
    const [a, b] = m[0].split('/').map(Number);
    return a / b;
  }
  return parseFloat(m[0]);
}

const STOP = new Set(['the', 'a', 'an', 'of', 'is', 'to', 'and', 'in', 'on', 'for', 'which', 'what', 'it', 'be', 'by', 'with', 'are', 'that', 'this', 'its', 'if', 'will', 'from', 'at', 'as']);
const norm = (s) => s.toLowerCase().replace(/[0-9]+(\.[0-9]+)?/g, '#').replace(/[^a-z#\s]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w));
function shingles(s) {
  const w = norm(s);
  const out = new Set();
  for (let i = 0; i + 2 < w.length; i++) out.add(w.slice(i, i + 3).join(' '));
  return out;
}
function jaccard(a, b) {
  let i = 0;
  for (const x of a) if (b.has(x)) i++;
  return i / (a.size + b.size - i || 1);
}

function shuffleIdx(id) {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  let a = h >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const p = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  return p;
}

const errors = [];
let verifiedCount = 0;
const all = [];
const ids = new Set();
mkdirSync(OUT, { recursive: true });

for (const file of readdirSync(SRC).filter((f) => f.endsWith('.mjs')).sort()) {
  const key = file.replace(/(-\d+)?\.mjs$/, '');
  const subject = FILES[key];
  if (!subject) {
    errors.push(`${file}: unknown subject file`);
    continue;
  }
  const items = (await import(pathToFileURL(join(SRC, file)).href)).default;
  for (let r of items) {
    const where = `${file} ${r.id}`;
    const err = (m) => errors.push(`${where}: ${m}`);
    if (!r.id || ids.has(r.id)) err('missing or duplicate id');
    ids.add(r.id);
    if (!TOPICS[subject].includes(r.t)) err(`unknown topic "${r.t}"`);
    if (![1, 2, 3].includes(r.d)) err('level must be 1, 2 or 3');
    if (!TYPES.includes(r.ty)) err(`unknown type "${r.ty}"`);
    if (!Array.isArray(r.o) || r.o.length !== 4) err('needs exactly 4 options');
    else {
      if (r.o.some((o) => !String(o).trim())) err('empty option');
      if (new Set(r.o.map((o) => String(o).trim().replace(/\s+/g, ' '))).size !== 4) err('duplicate options');
    }
    if (!(r.a >= 0 && r.a < 4)) err('answer index out of range');
    if (!r.q || r.q.length < 15) err('question too short');
    if (!r.e || r.e.length < 40) err('explanation too short');
    if (!Array.isArray(r.h) || r.h.length < (r.iq ? 2 : 1)) err(r.iq ? 'Science IQ problems need ≥ 2 progressive hints' : 'needs at least one hint');
    if (!(r.s >= 15 && r.s <= 300)) err('time must be 15–300 s');
    if (r.ty === 'numerical' && !r.v) err('numerical questions need a verification expression (v)');
    if (r.v) {
      let val;
      try {
        val = Function('Math', `return (${r.v});`)(Math);
      } catch (e) {
        err(`verification expression failed: ${e.message}`);
      }
      if (typeof val === 'number' && Array.isArray(r.o)) {
        verifiedCount++;
        const close = (x) => Math.abs(x - val) <= Math.abs(val) * 0.006 + 1e-12;
        const got = parseNumber(String(r.o[r.a]));
        if (!close(got)) err(`NUMERIC MISMATCH: computed ${val}, keyed option says "${r.o[r.a]}"`);
        // vOnly: options differ by direction/sign words, not by number — only the keyed option is checked
        if (!r.vOnly) r.o.forEach((o, i) => {
          if (i !== r.a && close(parseNumber(String(o)))) err(`another option (${i}) also equals the computed answer ${val}`);
        });
      }
    }
    // Option order: authored with the key mostly first, so shuffle deterministically by id
    // (same order on every build). Assertion–reason keeps its standard fixed option order.
    if (Array.isArray(r.o) && r.o.length === 4 && r.ty !== 'assertion-reason' && !r.fixed) {
      const perm = shuffleIdx(r.id);
      r = { ...r, o: perm.map((i) => r.o[i]), a: perm.indexOf(r.a) };
    }
    const tracks = ['GEN'];
    if (VVM[subject]?.includes(r.t)) tracks.unshift('VVM');
    if (MVPP_SUBJECTS.includes(subject)) tracks.unshift('MVPP');
    all.push({
      id: r.id,
      subject,
      topic: r.t,
      level: r.d,
      type: r.ty,
      q: r.q,
      options: r.o.map(String),
      answer: r.a,
      explanation: r.e,
      ...(r.m ? { misconception: r.m } : {}),
      hints: r.h,
      time: r.s,
      tracks,
      iq: !!r.iq,
      ...(r.tb ? { table: r.tb } : {}),
      verified: true,
      _file: key,
    });
  }
}

// near-duplicate detection across the whole bank
const sh = all.map((q) => shingles(q.q));
for (let i = 0; i < all.length; i++)
  for (let j = i + 1; j < all.length; j++) {
    if (sh[i].size < 3 || sh[j].size < 3) continue;
    const s = jaccard(sh[i], sh[j]);
    if (s >= 0.6) errors.push(`NEAR-DUPLICATE ${all[i].id} ~ ${all[j].id} (similarity ${s.toFixed(2)})`);
  }

if (errors.length) {
  console.error(`\n✗ Question bank NOT written — ${errors.length} problem(s):\n` + errors.map((e) => '  - ' + e).join('\n'));
  process.exit(1);
}

const bySubj = {};
for (const q of all) {
  const { _file, ...clean } = q;
  (bySubj[_file] ||= []).push(clean);
}
for (const [k, qs] of Object.entries(bySubj)) writeFileSync(join(OUT, `${k}.json`), JSON.stringify(qs, null, 1));

const count = (f) => all.reduce((m, q) => ((m[f(q)] = (m[f(q)] || 0) + 1), m), {});
console.log(`✓ ${all.length} questions validated and written to src/data/bank/`);
console.log('  by subject:', count((q) => q.subject));
console.log('  by level:  ', count((q) => ['', 'Foundation', 'Advanced', 'Olympiad'][q.level]));
console.log('  by type:   ', count((q) => q.type));
console.log('  answer position A/B/C/D:', [0, 1, 2, 3].map((i) => all.filter((q) => q.answer === i).length).join(' / '));
console.log('  Science IQ:', all.filter((q) => q.iq).length, '· answers recomputed from formulas:', verifiedCount);
