import { useId, useMemo, type ReactNode } from 'react';
import type { GuideSpec, GuideTemplate } from '../data/types';
import { TEMPLATE_REGIONS } from '../data/regions';
import { hashString, seededRng, type Rng } from '../lib/random';

// Composition guides: schematic drawings generated from each scene's spec.
// They show the structure and the relationship of elements — windows,
// awnings, signs, balconies, cables, plants, shadows — and can highlight the
// region a short session should focus on. They are deliberately labelled as
// schematic guides, never presented as reference images.

type Pt = [number, number];
type Map = (x: number, y: number) => Pt;
type WashColour = 'ochre' | 'sage' | 'blue' | 'terra' | 'grey';
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export { TEMPLATE_REGIONS };

// ---------------------------------------------------------------------------
// Drawing context

class Ctx {
  lines: ReactNode[] = [];
  faint: ReactNode[] = [];
  washes: ReactNode[] = [];
  private n = 0;
  constructor(public rng: Rng) {}
  key() {
    return this.n++;
  }
  path(d: string, opts: { faint?: boolean; w?: number; fill?: string; o?: number } = {}) {
    const el = <path key={this.key()} d={d} strokeWidth={opts.w} fill={opts.fill} opacity={opts.o} />;
    (opts.faint ? this.faint : this.lines).push(el);
  }
  wash(d: string, c: WashColour, o = 0.5) {
    this.washes.push(<path key={this.key()} d={d} fill={`var(--wash-${c})`} opacity={o} />);
  }
  dot(p: Pt, r = 1.6) {
    this.lines.push(<circle key={this.key()} cx={p[0]} cy={p[1]} r={r} fill="currentColor" stroke="none" />);
  }
}

const f = (n: number) => Math.round(n * 10) / 10;
const ID: Map = (x, y) => [x, y];

function poly(P: Map, pts: Pt[], close = true) {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${f(P(...p)[0])} ${f(P(...p)[1])}`).join('') + (close ? 'Z' : '');
}
function seg(P: Map, x1: number, y1: number, x2: number, y2: number) {
  return poly(P, [[x1, y1], [x2, y2]], false);
}
function rectPath(P: Map, x: number, y: number, w: number, h: number) {
  return poly(P, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
}
function quad(P: Map, x1: number, y1: number, cx: number, cy: number, x2: number, y2: number) {
  const a = P(x1, y1);
  const c = P(cx, cy);
  const b = P(x2, y2);
  return `M${f(a[0])} ${f(a[1])}Q${f(c[0])} ${f(c[1])} ${f(b[0])} ${f(b[1])}`;
}
function bbox(P: Map, x: number, y: number, w: number, h: number, pad = 4): Rect {
  const pts = [P(x, y), P(x + w, y), P(x + w, y + h), P(x, y + h)];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.max(0, Math.min(...xs) - pad);
  const y0 = Math.max(0, Math.min(...ys) - pad);
  return { x: x0, y: y0, w: Math.min(400, Math.max(...xs) + pad) - x0, h: Math.min(300, Math.max(...ys) + pad) - y0 };
}
const union = (...r: Rect[]): Rect => {
  const x = Math.min(...r.map((a) => a.x));
  const y = Math.min(...r.map((a) => a.y));
  return { x, y, w: Math.max(...r.map((a) => a.x + a.w)) - x, h: Math.max(...r.map((a) => a.y + a.h)) - y };
};

// ---------------------------------------------------------------------------
// Elements (drawn in local coordinates through a mapping P)

function windowEl(c: Ctx, P: Map, x: number, y: number, w: number, h: number, o: { shutters?: boolean; arch?: boolean; plant?: boolean } = {}) {
  if (o.arch) {
    const r = w / 2;
    const a = P(x, y + r);
    const b = P(x + w, y + r);
    const top = P(x + r, y - r * 0.15);
    c.path(`M${f(P(x, y + h)[0])} ${f(P(x, y + h)[1])}L${f(a[0])} ${f(a[1])}Q${f(top[0])} ${f(top[1] - r * 0.6)} ${f(b[0])} ${f(b[1])}L${f(P(x + w, y + h)[0])} ${f(P(x + w, y + h)[1])}Z`);
  } else {
    c.path(rectPath(P, x, y, w, h));
    c.path(seg(P, x - 2, y - 3, x + w + 2, y - 3), { w: 1.1 }); // lintel
  }
  c.wash(rectPath(P, x + 1, y + (o.arch ? w / 2 : 1), w - 2, h - (o.arch ? w / 2 : 2)), 'grey', 0.45);
  c.path(seg(P, x + w / 2, y + (o.arch ? w * 0.2 : 0), x + w / 2, y + h), { w: 0.9 });
  c.path(seg(P, x, y + h * 0.45, x + w, y + h * 0.45), { w: 0.9 });
  c.path(seg(P, x - 3, y + h + 2, x + w + 3, y + h + 2), { w: 1.4 }); // sill
  if (o.shutters) {
    const sw = w * 0.48;
    for (const sx of [x - sw - 1, x + w + 1]) {
      c.path(rectPath(P, sx, y, sw, h));
      for (let i = 1; i < 6; i++) c.path(seg(P, sx + 1, y + (h * i) / 6, sx + sw - 1, y + (h * i) / 6), { w: 0.6 });
      c.wash(rectPath(P, sx, y, sw, h), 'sage', 0.55);
    }
  }
  if (o.plant) plantEl(c, P, x + w * 0.3, y + h + 2, 7);
}

function doorEl(c: Ctx, P: Map, x: number, y: number, w: number, h: number, o: { recessed?: boolean; arch?: boolean; glazed?: boolean } = {}) {
  if (o.arch) {
    const r = w / 2;
    const a = P(x, y + r);
    const b = P(x + w, y + r);
    const top = P(x + r, y);
    c.path(`M${f(P(x, y + h)[0])} ${f(P(x, y + h)[1])}L${f(a[0])} ${f(a[1])}Q${f(top[0])} ${f(top[1] - r)} ${f(b[0])} ${f(b[1])}L${f(P(x + w, y + h)[0])} ${f(P(x + w, y + h)[1])}`, { w: 1.7 });
  } else {
    c.path(rectPath(P, x, y, w, h), { w: 1.7 });
  }
  if (o.recessed) {
    c.path(rectPath(P, x + 5, y + 6, w - 10, h - 6));
    c.path(seg(P, x, y, x + 5, y + 6));
    c.path(seg(P, x + w, y, x + w - 5, y + 6));
    c.wash(poly(P, [[x, y], [x + w, y], [x + w - 5, y + 6], [x + 5, y + 6], [x + 5, y + h], [x, y + h]]), 'grey', 0.7);
    hatchRect(c, P, x, y, 5, h, 2.2);
    hatchRect(c, P, x + 5, y, w - 10, 6, 2.2, true);
  }
  const ix = x + (o.recessed ? 8 : 4);
  const iw = w - (o.recessed ? 16 : 8);
  if (o.glazed) {
    c.path(rectPath(P, ix, y + h * 0.15, iw, h * 0.45), { w: 0.9 });
    c.wash(rectPath(P, ix, y + h * 0.15, iw, h * 0.45), 'blue', 0.4);
  } else {
    c.path(rectPath(P, ix, y + h * 0.15, iw, h * 0.3), { w: 0.8 });
    c.path(rectPath(P, ix, y + h * 0.55, iw, h * 0.32), { w: 0.8 });
  }
  c.dot(P(x + w - (o.recessed ? 10 : 6), y + h * 0.55));
  c.path(seg(P, x - 4, y + h + 3, x + w + 4, y + h + 3), { w: 1.3 }); // step
}

function awningEl(c: Ctx, P: Map, x: number, y: number, w: number, h: number, type: GuideSpec['awning']) {
  if (!type || type === 'none') return;
  if (type === 'noren') {
    c.path(seg(P, x, y, x + w, y), { w: 1.8 });
    const panels = 3;
    const pw = w / panels;
    for (let i = 0; i < panels; i++) {
      const px = x + i * pw + 1;
      c.path(poly(P, [[px, y], [px + pw - 2, y], [px + pw - 2, y + h * 1.7], [px, y + h * 1.7]]));
      c.wash(rectPath(P, px, y, pw - 2, h * 1.7), 'blue', 0.75);
    }
    c.path(rectPath(P, x + w / 2 - 6, y + h * 0.5, 12, 10), { w: 0.8 });
    return;
  }
  if (type === 'tiled') {
    // Japanese kawara eave: rows of scalloped tiles over a dark underside
    const shapeT = poly(P, [[x - 4, y], [x + w + 4, y], [x + w + 12, y + h], [x - 12, y + h]]);
    c.path(shapeT, { w: 1.5 });
    const rows = 3;
    for (let r = 1; r <= rows; r++) {
      const ry = y + (h * r) / rows;
      const x0 = x - 4 - (8 * r) / rows;
      const x1 = x + w + 4 + (8 * r) / rows;
      let d = '';
      for (let tx = x0; tx < x1 - 1; tx += 8) d += quad(P, tx, ry, tx + 4, ry + 3, Math.min(tx + 8, x1), ry);
      c.path(d, { w: 0.7 });
    }
    for (let tx = x; tx <= x + w; tx += 8) c.path(seg(P, tx, y, tx - 6 + (12 * (tx - x)) / w, y + h), { w: 0.45 });
    c.wash(shapeT, 'grey', 0.6);
    hatchRect(c, P, x - 8, y + h + 1, w + 16, 7, 2.6);
    return;
  }
  const shape = poly(P, [[x, y], [x + w, y], [x + w + 8, y + h], [x - 8, y + h]]);
  c.path(shape, { w: 1.4 });
  hatchRect(c, P, x - 6, y + h + 2, w + 12, 9, 3.2);
  if (type === 'corrugated') {
    for (let i = 0; i <= w + 16; i += 6) c.path(seg(P, x + i * (w / (w + 16)), y, x - 8 + i, y + h), { w: 0.6 });
    c.wash(shape, 'grey', 0.55);
    return;
  }
  // scalloped valance
  const n = Math.max(4, Math.round((w + 16) / 16));
  let d = '';
  for (let i = 0; i < n; i++) {
    const x1 = x - 8 + ((w + 16) * i) / n;
    const x2 = x - 8 + ((w + 16) * (i + 1)) / n;
    d += quad(P, x1, y + h, (x1 + x2) / 2, y + h + 8, x2, y + h);
  }
  c.path(d);
  if (type === 'striped') {
    for (let i = 1; i < n; i++) {
      const t = i / n;
      c.path(seg(P, x + w * t, y, x - 8 + (w + 16) * t, y + h), { w: 0.8 });
    }
    c.wash(shape, 'terra', 0.6);
  } else {
    c.wash(shape, 'sage', 0.6);
  }
  // shadow under the awning
  c.wash(rectPath(P, x - 4, y + h + 6, w + 8, 16), 'blue', 0.35);
}

type Script = GuideSpec['script'];

/** Sign lettering drawn as glyph shapes: kanji boxes, Devanagari with its top bar, or Latin humps. */
function lettering(c: Ctx, P: Map, x: number, y: number, w: number, script: Script = 'latin', size = 8) {
  let d = '';
  if (script === 'kanji') {
    const n = Math.max(2, Math.min(4, Math.floor(w / (size * 1.6))));
    const gap = (w - n * size) / (n + 1);
    for (let i = 0; i < n; i++) {
      const gx = x + gap + i * (size + gap);
      const gy = y - size;
      d += seg(P, gx, gy + size * 0.2, gx + size, gy + size * 0.2);
      d += seg(P, gx + size * 0.5, gy, gx + size * 0.5, gy + size);
      d += seg(P, gx + size * 0.15, gy + size * 0.55, gx + size * 0.85, gy + size * 0.55);
      if (c.rng() > 0.4) d += seg(P, gx + size * 0.5, gy + size * 0.55, gx + size * 0.05, gy + size);
      if (c.rng() > 0.4) d += seg(P, gx + size * 0.5, gy + size * 0.55, gx + size, gy + size);
    }
  } else if (script === 'devanagari') {
    let cx = x;
    while (cx < x + w - 10) {
      const ww = Math.min(x + w - cx, 14 + c.rng() * 16);
      d += seg(P, cx, y - size, cx + ww, y - size); // shirorekha
      for (let gx = cx + 3; gx < cx + ww - 2; gx += 5 + c.rng() * 2) {
        d += seg(P, gx, y - size, gx, y - size * 0.15);
        if (c.rng() > 0.5) d += quad(P, gx, y - size * 0.55, gx - 3, y - size * 0.2, gx - 1, y);
      }
      cx += ww + 5;
    }
  } else {
    let cx = x;
    while (cx < x + w - 6) {
      const lw = 5 + c.rng() * 9;
      d += quad(P, cx, y, cx + lw / 2, y - 4 - c.rng() * 3, Math.min(cx + lw, x + w), y);
      cx += lw + 3;
    }
  }
  c.path(d, { w: 1 });
}

/** Parallel 45° hatching inside a rectangle (local coordinates). */
function hatchRect(c: Ctx, P: Map, x: number, y: number, w: number, h: number, gap = 3.4, flip = false) {
  let d = '';
  for (let k = -h; k < w; k += gap) {
    let x1 = x + k;
    let y1 = y + h;
    let x2 = x + k + h;
    let y2 = y;
    if (x1 < x) {
      y1 -= x - x1;
      x1 = x;
    }
    if (x2 > x + w) {
      y2 += x2 - (x + w);
      x2 = x + w;
    }
    if (x2 <= x1) continue;
    if (flip) d += seg(P, x + w - (x1 - x), y1, x + w - (x2 - x), y2);
    else d += seg(P, x1, y1, x2, y2);
  }
  c.path(d, { w: 0.5 });
}

/** Scalloped pen foliage: small cloud-like curls scattered through an ellipse. */
function scribble(c: Ctx, cx: number, cy: number, rw: number, rh: number, loops = 14) {
  let d = '';
  const n = Math.round(loops * 1.6);
  for (let i = 0; i < n; i++) {
    const a = c.rng() * Math.PI * 2;
    const rr = Math.sqrt(c.rng());
    const x = cx + Math.cos(a) * rw * rr;
    const y = cy + Math.sin(a) * rh * rr;
    const r = 2.2 + c.rng() * 2.6;
    const bumps = 2 + Math.floor(c.rng() * 2);
    d += `M${f(x)} ${f(y)}`;
    for (let k = 0; k < bumps; k++) d += `q${f(r * 0.5)} ${f(-r * 1.1)} ${f(r)} 0`;
  }
  c.path(d, { w: 0.75 });
}

function fascia(c: Ctx, P: Map, x: number, y: number, w: number, h: number, script: Script = 'latin') {
  c.path(rectPath(P, x, y, w, h), { w: 1.4 });
  lettering(c, P, x + w * 0.15, y + h * 0.78, w * 0.7, script, Math.min(10, h * 0.6));
  c.wash(rectPath(P, x, y, w, h), 'ochre', 0.5);
}

function projectingSign(c: Ctx, P: Map, x: number, y: number, dir: 1 | -1 = 1) {
  c.path(seg(P, x, y, x + dir * 26, y), { w: 1.4 });
  c.path(seg(P, x, y + 8, x + dir * 10, y), { w: 0.8 });
  const bx = dir === 1 ? x + 6 : x - 26;
  c.path(seg(P, bx + 2, y, bx + 2, y + 4));
  c.path(seg(P, bx + 18, y, bx + 18, y + 4));
  c.path(rectPath(P, bx, y + 4, 20, 22), { w: 1.3 });
  c.path(quad(P, bx + 4, y + 13, bx + 10, y + 9, bx + 16, y + 13), { w: 0.8 });
  c.path(seg(P, bx + 5, y + 19, bx + 15, y + 19), { w: 0.8 });
  c.wash(rectPath(P, bx, y + 4, 20, 22), 'terra', 0.55);
}

function verticalSign(c: Ctx, P: Map, x: number, y: number, h: number, script: Script = 'kanji') {
  c.path(rectPath(P, x, y, 13, h), { w: 1.3 });
  if (script === 'kanji') for (let i = 0; i < Math.floor(h / 12); i++) lettering(c, P, x + 0.5, y + 11 + i * 12, 12, 'kanji', 8);
  else for (let i = 0; i < Math.floor(h / 11); i++) c.path(seg(P, x + 4, y + 6 + i * 11, x + 9, y + 9 + i * 11), { w: 0.9 });
  c.wash(rectPath(P, x, y, 13, h), 'ochre', 0.6);
}

function lantern(c: Ctx, P: Map, x: number, y: number) {
  c.path(seg(P, x, y, x, y + 6), { w: 0.8 });
  const a = P(x, y + 14);
  c.lines.push(<ellipse key={c.key()} cx={a[0]} cy={a[1]} rx={5} ry={8} />);
  c.washes.push(<ellipse key={c.key()} cx={a[0]} cy={a[1]} rx={5} ry={8} fill="var(--wash-terra)" opacity={0.7} />);
}

function plantEl(c: Ctx, P: Map, x: number, ground: number, s = 10, pot = true) {
  if (pot) {
    c.path(poly(P, [[x - s * 0.55, ground - s * 0.9], [x + s * 0.55, ground - s * 0.9], [x + s * 0.4, ground], [x - s * 0.4, ground]]));
    c.wash(poly(P, [[x - s * 0.55, ground - s * 0.9], [x + s * 0.55, ground - s * 0.9], [x + s * 0.4, ground], [x - s * 0.4, ground]]), 'terra', 0.55);
  }
  const base = ground - (pot ? s * 0.9 : 0);
  let d = '';
  const leaves = 5 + Math.floor(c.rng() * 3);
  for (let i = 0; i < leaves; i++) {
    const ang = -Math.PI / 2 + (i - (leaves - 1) / 2) * 0.42 + (c.rng() - 0.5) * 0.2;
    const len = s * (1.1 + c.rng() * 0.8);
    const ex = x + Math.cos(ang) * len;
    const ey = base + Math.sin(ang) * len;
    d += quad(P, x, base, x + Math.cos(ang - 0.5) * len * 0.6, base + Math.sin(ang - 0.5) * len * 0.6, ex, ey);
    d += quad(P, ex, ey, x + Math.cos(ang + 0.5) * len * 0.6, base + Math.sin(ang + 0.5) * len * 0.6, x, base);
  }
  c.path(d, { w: 0.9 });
  const bb = bbox(P, x - s * 1.6, base - s * 2, s * 3.2, s * 2, 0);
  c.washes.push(<ellipse key={c.key()} cx={bb.x + bb.w / 2} cy={bb.y + bb.h * 0.6} rx={bb.w * 0.4} ry={bb.h * 0.45} fill="var(--wash-sage)" opacity={0.6} />);
}

function climber(c: Ctx, P: Map, x: number, y1: number, y2: number, across = 0) {
  let d = '';
  let y = y2;
  let side = 1;
  while (y > y1) {
    const ny = y - 10;
    d += quad(P, x, y, x + side * 6, (y + ny) / 2, x, ny);
    d += quad(P, x, ny + 5, x + side * 9, ny + 1, x + side * 7, ny + 6);
    side = -side as 1 | -1;
    y = ny;
  }
  if (across) {
    let xx = x;
    while (xx < x + across) {
      d += quad(P, xx, y1, xx + 5, y1 - 6 + c.rng() * 4, xx + 10, y1);
      d += quad(P, xx + 5, y1 - 2, xx + 8, y1 + 7, xx + 3, y1 + 6);
      xx += 10;
    }
  }
  c.path(d, { w: 0.9 });
  const bb = bbox(P, x - 10, y1 - 6, 20 + across, y2 - y1 + 6, 0);
  c.wash(rectPath(ID, bb.x, bb.y, bb.w, bb.h), 'sage', 0.35);
}

function treeEl(c: Ctx, x: number, ground: number, h: number, cw: number) {
  const top = ground - h;
  c.path(`M${x - 4} ${ground}Q${x - 2} ${ground - h * 0.4} ${x - 6} ${top + cw * 0.35}M${x + 4} ${ground}Q${x + 5} ${ground - h * 0.45} ${x + 9} ${top + cw * 0.3}`, { w: 1.6 });
  c.path(`M${x - 2} ${top + cw * 0.5}L${x - cw * 0.3} ${top + cw * 0.25}M${x + 3} ${top + cw * 0.45}L${x + cw * 0.28} ${top + cw * 0.2}`, { w: 1 });
  let d = '';
  const n = 9;
  const cy = top + cw * 0.18;
  for (let i = 0; i < n; i++) {
    const a1 = (i / n) * Math.PI * 2;
    const a2 = ((i + 1) / n) * Math.PI * 2;
    const r1 = cw * (0.48 + c.rng() * 0.08);
    const p1: Pt = [x + Math.cos(a1) * r1, cy + Math.sin(a1) * r1 * 0.62];
    const p2: Pt = [x + Math.cos(a2) * r1, cy + Math.sin(a2) * r1 * 0.62];
    const am = (a1 + a2) / 2;
    const pm: Pt = [x + Math.cos(am) * r1 * 1.22, cy + Math.sin(am) * r1 * 0.62 * 1.22];
    d += `${i ? '' : `M${f(p1[0])} ${f(p1[1])}`}Q${f(pm[0])} ${f(pm[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  c.path(d + 'Z', { w: 1.1, faint: true });
  scribble(c, x - cw * 0.18, cy - cw * 0.05, cw * 0.22, cw * 0.14, 10);
  scribble(c, x + cw * 0.2, cy + cw * 0.04, cw * 0.22, cw * 0.14, 10);
  scribble(c, x, cy - cw * 0.2, cw * 0.18, cw * 0.1, 8);
  c.wash(d + 'Z', 'sage', 0.55);
  c.washes.push(<ellipse key={c.key()} cx={x + cw * 0.15} cy={ground + 8} rx={cw * 0.55} ry={9} fill="var(--wash-blue)" opacity={0.45} />);
  return { x: x - cw * 0.6, y: cy - cw * 0.4, w: cw * 1.2, h: ground + 16 - (cy - cw * 0.4) };
}

function benchEl(c: Ctx, x: number, y: number, w: number) {
  c.path(`M${x} ${y}h${w}M${x} ${y + 5}h${w}M${x + 2} ${y - 14}h${w - 4}M${x + 2} ${y - 9}h${w - 4}`, { w: 1.2 });
  c.path(`M${x + 4} ${y + 5}v14M${x + w - 4} ${y + 5}v14M${x + 6} ${y}v-14M${x + w - 6} ${y}v-14`);
  c.wash(`M${x} ${y - 14}h${w}v${7}h${-w}Z`, 'terra', 0.4);
}

function lampEl(c: Ctx, x: number, ground: number, h: number) {
  c.path(`M${x} ${ground}V${ground - h}M${x - 4} ${ground}h8`, { w: 1.6 });
  c.path(`M${x} ${ground - h}q0 -6 9 -6h6M${x + 12} ${ground - h - 6}l-3 9h12l-3 -9`, { w: 1.1 });
}

function signpostEl(c: Ctx, x: number, ground: number, h: number) {
  c.path(`M${x} ${ground}V${ground - h}`, { w: 1.6 });
  c.path(`M${x} ${ground - h + 4}h26l6 6l-6 6h-26ZM${x} ${ground - h + 20}h-24l-6 6l6 6h24Z`, { w: 1.1 });
  c.wash(`M${x} ${ground - h + 4}h26l6 6l-6 6h-26Z`, 'blue', 0.5);
  c.wash(`M${x} ${ground - h + 20}h-24l-6 6l6 6h24Z`, 'ochre', 0.5);
}

function cablesEl(c: Ctx, segs: [Pt, Pt, number][]) {
  for (const [a, b, sag] of segs) c.path(`M${f(a[0])} ${f(a[1])}Q${f((a[0] + b[0]) / 2)} ${f((a[1] + b[1]) / 2 + sag)} ${f(b[0])} ${f(b[1])}`, { w: 0.8 });
}

function bricksEl(c: Ctx, P: Map, x: number, y: number, w: number, h: number) {
  let d = '';
  for (let k = 0; k < 4; k++) {
    const bx = x + c.rng() * (w - 30);
    const by = y + c.rng() * (h - 16);
    for (let r = 0; r < 3; r++) {
      const off = r % 2 ? 6 : 0;
      for (let i = 0; i < 2 + Math.floor(c.rng() * 2); i++) d += rectPath(P, bx + off + i * 12, by + r * 5, 11, 4);
    }
  }
  c.path(d, { w: 0.6, faint: true });
}

function balconyEl(c: Ctx, P: Map, x: number, y: number, w: number) {
  c.path(rectPath(P, x - 4, y, w + 8, 4), { w: 1.4 });
  c.path(seg(P, x - 2, y - 16, x + w + 2, y - 16), { w: 1.2 });
  let d = '';
  for (let bx = x; bx <= x + w; bx += 5) d += seg(P, bx, y - 16, bx, y);
  c.path(d, { w: 0.7 });
  c.wash(rectPath(P, x - 4, y + 4, w + 8, 10), 'blue', 0.4);
}

function pipeEl(c: Ctx, P: Map, x: number, y1: number, y2: number) {
  c.path(seg(P, x, y1, x, y2) + seg(P, x + 3, y1, x + 3, y2), { w: 0.9 });
  for (let y = y1 + 20; y < y2; y += 34) c.path(seg(P, x - 2, y, x + 5, y), { w: 1.1 });
}

function booksEl(c: Ctx, P: Map, x: number, y: number, w: number, h: number) {
  let d = '';
  for (const sy of [y + h * 0.48, y + h - 2]) {
    d += seg(P, x, sy, x + w, sy);
    let bx = x + 2;
    while (bx < x + w - 3) {
      const bh = 7 + c.rng() * 8;
      d += seg(P, bx, sy, bx, sy - bh);
      bx += 2 + c.rng() * 3;
    }
  }
  c.path(d, { w: 0.7 });
  c.wash(rectPath(P, x, y + 2, w, h - 4), 'terra', 0.3);
}

function chairsEl(c: Ctx, P: Map, x: number, y: number, w: number) {
  let d = '';
  const n = Math.max(2, Math.floor(w / 26));
  for (let i = 0; i < n; i++) {
    const cx = x + 8 + i * (w / n);
    d += seg(P, cx, y, cx, y - 16) + seg(P, cx, y - 8, cx + 9, y - 8) + seg(P, cx + 9, y - 8, cx + 9, y);
    if (i % 2 === 0) d += seg(P, cx + 14, y - 12, cx + 26, y - 12) + seg(P, cx + 20, y - 12, cx + 20, y);
  }
  c.path(d, { w: 0.9 });
}

function figureEl(c: Ctx, x: number, ground: number, s = 1) {
  const head = ground - 46 * s;
  c.lines.push(<circle key={c.key()} cx={x} cy={head} r={4 * s} />);
  c.path(`M${x} ${head + 4 * s}l-2 ${20 * s}M${x - 2} ${head + 24 * s}l-4 ${18 * s}M${x - 2} ${head + 24 * s}l5 ${18 * s}M${x} ${head + 8 * s}l-7 ${12 * s}M${x} ${head + 8 * s}l6 ${11 * s}`, { w: 1.1 });
}

function pavementEl(c: Ctx, y: number, x1: number, x2: number, irregular = false) {
  c.path(`M${x1} ${y}H${x2}`, { w: 1.4 });
  c.path(`M${x1} ${y + 3}H${x2}`, { w: 0.7, faint: true });
  let d = '';
  if (irregular) {
    let x = x1;
    while (x < x2) {
      const w = 14 + c.rng() * 16;
      d += `M${f(x)} ${y - 26}l${f(c.rng() * 4 - 2)} 12l${f(-c.rng() * 3)} 14`;
      d += `M${f(x)} ${y - 13}h${f(w * 0.6)}`;
      x += w;
    }
  } else {
    for (let x = x1 + 20; x < x2; x += 34) d += `M${x} ${y}l${(x - 200) * 0.08} -26`;
    d += `M${x1} ${y - 13}H${x2}`;
  }
  c.path(d, { w: 0.6, faint: true });
}

function reflectionsEl(c: Ctx, xs: [number, number, WashColour][], y: number) {
  for (const [x, w, col] of xs) {
    c.wash(`M${x} ${y}h${w}l${-w * 0.1} 34h${-w * 0.8}Z`, col, 0.4);
    c.path(`M${x + w * 0.3} ${y + 6}v10M${x + w * 0.6} ${y + 12}v14`, { w: 0.7, faint: true });
  }
}

/** Wooden utility pole with cross-arms, insulators, a transformer and sagging wires. */
function poleEl(c: Ctx, x: number, ground: number, h: number, dir: 1 | -1 = 1) {
  const top = ground - h;
  c.path(`M${x - 3} ${ground}L${x - 2} ${top}M${x + 3} ${ground}L${x + 2} ${top}`, { w: 1.5 });
  for (let y = top + 30; y < ground - 10; y += 26) c.path(`M${x - 3} ${y}h6`, { w: 0.7 });
  c.path(`M${x - 18} ${top + 10}h36M${x - 14} ${top + 22}h28`, { w: 1.3 });
  for (const ix of [-15, -6, 6, 15]) c.path(`M${x + ix} ${top + 10}v-5`, { w: 1.1 });
  c.path(rectPath(ID, x + 4 * dir - (dir < 0 ? 12 : 0), top + 34, 12, 18), { w: 1.1 });
  hatchRect(c, ID, x + 4 * dir - (dir < 0 ? 12 : 0), top + 34, 12, 18, 2.4);
  c.path(`M${x} ${top + 60}q${dir * 10} 10 ${dir * 6} 26`, { w: 0.8 });
  const ends = [-40, -20, 10, 40];
  for (const [i, e] of ends.entries()) {
    const sx = x + [-15, -6, 6, 15][i];
    c.path(`M${sx} ${top + 6}Q${sx + dir * 90} ${top + 20 + i * 6} ${x + dir * 230} ${top + e + 40}`, { w: 0.7 });
    c.path(`M${sx} ${top + 6}Q${sx - dir * 60} ${top + 16 + i * 4} ${x - dir * 160} ${top + e + 30}`, { w: 0.6, faint: true });
  }
}

/** Sandwich (A-frame) board with a few lines of writing. */
function aframeEl(c: Ctx, x: number, ground: number, s = 1) {
  const w = 22 * s;
  const h = 30 * s;
  c.path(`M${x} ${ground}L${x + 4 * s} ${ground - h}H${x + w - 4 * s}L${x + w} ${ground}M${x + w - 2} ${ground}l5 -${h - 4}`, { w: 1.2 });
  c.path(rectPath(ID, x + 5 * s, ground - h + 4 * s, w - 10 * s, h - 12 * s), { w: 0.8 });
  for (let i = 0; i < 3; i++) c.path(`M${x + 7 * s} ${ground - h + (9 + i * 5) * s}h${(w - 16 * s) * (0.6 + c.rng() * 0.4)}`, { w: 0.6 });
  c.wash(rectPath(ID, x + 4 * s, ground - h, w - 8 * s, h - 4 * s), 'grey', 0.55);
}

function bicycleEl(c: Ctx, x: number, ground: number, s = 1) {
  const r = 11 * s;
  for (const wx of [x, x + 34 * s]) c.lines.push(<circle key={c.key()} cx={wx} cy={ground - r} r={r} />);
  const b = ground - r;
  c.path(`M${x} ${b}L${x + 13 * s} ${b - 15 * s}H${x + 28 * s}L${x + 34 * s} ${b}M${x + 13 * s} ${b - 15 * s}L${x + 18 * s} ${b}L${x + 28 * s} ${b - 15 * s}M${x + 18 * s} ${b}L${x} ${b}`, { w: 1 });
  c.path(`M${x + 11 * s} ${b - 19 * s}h6M${x + 28 * s} ${b - 15 * s}l1 -6h6`, { w: 1.1 });
  c.path(rectPath(ID, x + 30 * s, b - 27 * s, 11 * s, 7 * s), { w: 0.8 }); // basket
}

function truckEl(c: Ctx, x: number, ground: number, s = 1) {
  const w = 120 * s;
  c.path(`M${x} ${ground - 10 * s}V${ground - 48 * s}h${30 * s}l${10 * s} ${-18 * s}h${-10 * s}M${x + 30 * s} ${ground - 48 * s}V${ground - 66 * s}h${-26 * s}l${-4 * s} ${18 * s}`, { w: 1.3 });
  c.path(`M${x + 34 * s} ${ground - 46 * s}H${x + w}V${ground - 10 * s}H${x}`, { w: 1.3 });
  c.path(`M${x + 34 * s} ${ground - 66 * s}H${x + w}V${ground - 46 * s}M${x + 50 * s} ${ground - 66 * s}v20M${x + 90 * s} ${ground - 66 * s}v20`, { w: 0.8 });
  for (const wx of [x + 20 * s, x + w - 22 * s]) c.lines.push(<circle key={c.key()} cx={wx} cy={ground - 8 * s} r={9 * s} />);
  hatchRect(c, ID, x + 2, ground - 64 * s, 24 * s, 14 * s, 2.6);
  c.wash(`M${x} ${ground - 48 * s}H${x + w}V${ground - 10 * s}H${x}Z`, 'grey', 0.35);
}

function palmEl(c: Ctx, x: number, ground: number, h: number) {
  const top = ground - h;
  c.path(`M${x} ${ground}Q${x - 6} ${ground - h * 0.5} ${x + 4} ${top}`, { w: 1.4 });
  let d = '';
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI + (i / 6) * Math.PI;
    const ex = x + 4 + Math.cos(a) * 34;
    const ey = top + Math.sin(a) * 16 + 18;
    d += `M${x + 4} ${top}Q${f(x + 4 + Math.cos(a) * 18)} ${f(top + Math.sin(a) * 22 - 6)} ${f(ex)} ${f(ey)}`;
    for (let k = 0.3; k < 1; k += 0.18) {
      const fx = x + 4 + (ex - x - 4) * k;
      const fy = top + (ey - top) * k - 4;
      d += `M${f(fx)} ${f(fy)}l${f(Math.cos(a + 1.2) * 6)} ${f(5)}`;
    }
  }
  c.path(d, { w: 0.8 });
  c.washes.push(<ellipse key={c.key()} cx={x + 4} cy={top + 6} rx={34} ry={18} fill="var(--wash-sage)" opacity={0.55} />);
}

function boatEl(c: Ctx, x: number, y: number, w: number, dir: 1 | -1 = 1) {
  const h = w * 0.22;
  const bow = dir === 1 ? x + w : x;
  const stern = dir === 1 ? x : x + w;
  c.path(`M${stern} ${y - h}L${bow - dir * w * 0.12} ${y - h * 1.1}Q${bow} ${y - h} ${bow + dir * 4} ${y - h * 1.3}Q${bow - dir * w * 0.1} ${y} ${bow - dir * w * 0.3} ${y}H${stern + dir * w * 0.06}Z`, { w: 1.4 });
  c.path(`M${stern + dir * 2} ${y - h * 0.62}L${bow - dir * w * 0.08} ${y - h * 0.72}`, { w: 1.1 });
  c.wash(`M${stern} ${y - h * 0.68}L${bow - dir * w * 0.06} ${y - h * 0.78}L${bow - dir * w * 0.1} ${y - h * 0.55}L${stern + dir * 2} ${y - h * 0.45}Z`, 'blue', 0.85);
  c.wash(`M${stern + dir * w * 0.06} ${y - h * 0.2}H${bow - dir * w * 0.3}L${bow - dir * w * 0.32} ${y}H${stern + dir * w * 0.08}Z`, 'terra', 0.7);
  for (let i = 1; i < 4; i++) c.path(`M${stern + dir * w * 0.2 * i} ${y - h * 1.05}l${dir * 3} ${-h * 0.25}`, { w: 0.7 });
  // reflection strokes
  let d = '';
  for (let i = 0; i < 5; i++) d += `M${f(x + w * (0.1 + c.rng() * 0.6))} ${f(y + 4 + i * 4)}h${f(10 + c.rng() * 20)}`;
  c.path(d, { w: 0.6, faint: true });
  c.wash(`M${x + w * 0.1} ${y + 2}h${w * 0.75}l-6 18h${-w * 0.6}Z`, 'blue', 0.45);
}

function railingEl(c: Ctx, x1: number, x2: number, y: number, h: number) {
  c.path(`M${x1} ${y - h}H${x2}M${x1} ${y - h * 0.15}H${x2}`, { w: 1.3 });
  let d = '';
  const step = 26;
  for (let x = x1; x < x2; x += step) {
    d += `M${x} ${y}V${y - h - 3}`;
    const xe = Math.min(x + step, x2);
    d += `M${x} ${y - h}L${xe} ${y - h * 0.15}M${xe} ${y - h}L${x} ${y - h * 0.15}`;
  }
  c.path(d, { w: 0.9 });
}

function roofEl(c: Ctx, P: Map, x: number, top: number, w: number, roof: GuideSpec['roof']) {
  c.path(seg(P, x - 6, top, x + w + 6, top) + seg(P, x - 4, top + 5, x + w + 4, top + 5), { w: 1.4 });
  if (roof === 'pitched' || roof === 'tiled') {
    c.path(poly(P, [[x - 8, top], [x + w / 2, top - 34], [x + w + 8, top]], false), { w: 1.4 });
    if (roof === 'tiled') {
      let d = '';
      for (let i = 1; i < 6; i++) {
        const t = i / 6;
        d += seg(P, x - 8 + (w / 2 + 8) * t, top - 34 * t, x + w + 8 - (w / 2 + 8) * t, top - 34 * t);
      }
      c.path(d, { w: 0.6 });
      c.wash(poly(P, [[x - 8, top], [x + w / 2, top - 34], [x + w + 8, top]]), 'terra', 0.5);
    }
  }
}

// ---------------------------------------------------------------------------
// A frontal façade block (used by several templates via a mapping)

interface FacadeOpts {
  x: number;
  w: number;
  ground: number;
  floors: number;
  floorH: number;
  shopH: number;
  bays: number;
  spec: GuideSpec;
  shop: boolean;
}

function facadeBlock(c: Ctx, P: Map, o: FacadeOpts) {
  const { x, w, ground, floors, floorH, shopH, bays, spec } = o;
  const top = ground - shopH - floors * floorH;
  const regions: Record<string, Rect> = {};
  c.path(poly(P, [[x, ground], [x, top], [x + w, top], [x + w, ground]], false), { w: 1.8 });
  c.wash(rectPath(P, x, top, w, ground - top), spec.brick ? 'terra' : 'ochre', spec.brick ? 0.28 : 0.3);
  if (spec.brick) bricksEl(c, P, x + 6, top + 10, w - 12, ground - top - shopH - 14);
  roofEl(c, P, x, top, w, spec.roof);
  regions.roofline = bbox(P, x - 8, top - (spec.roof && spec.roof !== 'flat' ? 36 : 4), w + 16, floorH * 0.9);

  const bw = w / bays;
  for (let fl = 0; fl < floors; fl++) {
    const fy = top + fl * floorH;
    if (fl > 0) c.path(seg(P, x, fy, x + w, fy), { w: 0.6, faint: true });
    for (let b = 0; b < bays; b++) {
      const ww = bw * (spec.shutters ? 0.34 : 0.44);
      const wx = x + b * bw + (bw - ww) / 2;
      const wy = fy + floorH * 0.2;
      windowEl(c, P, wx, wy, ww, floorH * 0.58, { shutters: spec.shutters, arch: spec.arch && fl === floors - 1, plant: (b + fl) % 3 === 1 && (spec.plants ?? 0) > 0 });
    }
    if (spec.balcony && fl === floors - 1 && fl >= 0) {
      const bx0 = x + bw * (bays > 2 ? 1 : 0) + 6;
      const bx1 = x + bw * (bays > 2 ? bays - 1 : bays) - 6;
      balconyEl(c, P, bx0, fy + floorH * 0.82, bx1 - bx0);
      regions.balconies = bbox(P, bx0 - 6, fy + floorH * 0.1, bx1 - bx0 + 12, floorH * 1.0);
    }
  }
  regions.upper = bbox(P, x, top, w, floors * floorH);

  if (o.shop) {
    const sy = ground - shopH;
    c.path(seg(P, x, sy, x + w, sy), { w: 1.4 });
    const hasFascia = spec.sign === 'fascia' || spec.sign === 'both' || spec.sign === 'layered';
    if (hasFascia) fascia(c, P, x + 6, sy + 3, w - 12, 15, spec.script);
    const ay = sy + (hasFascia ? 20 : 6);
    const doorW = Math.min(34, w * 0.3);
    const doorX = spec.door === 'left' ? x + 10 : spec.door === 'right' ? x + w - doorW - 10 : x + (w - doorW) / 2;
    const doorH = ground - ay - 12;
    doorEl(c, P, doorX, ground - doorH, doorW, doorH, { recessed: spec.recessed, glazed: true });
    // display windows on either side of the door
    const panes: [number, number][] = [];
    if (doorX - x > 30) panes.push([x + 8, doorX - 8]);
    if (x + w - (doorX + doorW) > 30) panes.push([doorX + doorW + 8, x + w - 8]);
    const dispY = ground - doorH + 6;
    const dispH = doorH - 20;
    for (const [a, b] of panes) {
      c.path(rectPath(P, a, dispY, b - a, dispH), { w: 1.3 });
      c.path(seg(P, a, dispY + dispH + 6, b, dispY + dispH + 6) + seg(P, a, dispY + dispH, a, ground) + seg(P, b, dispY + dispH, b, ground), { w: 0.9 });
      hatchRect(c, P, a + 1, dispY + dispH * 0.72, b - a - 2, dispH * 0.26, 3.6);
      if (spec.books) booksEl(c, P, a + 3, dispY + 4, b - a - 6, dispH - 6);
      else if (spec.chairs) chairsEl(c, P, a + 2, dispY + dispH - 2, b - a - 4);
      else {
        c.wash(rectPath(P, a + 1, dispY + 1, b - a - 2, dispH - 2), 'blue', 0.35);
        c.path(seg(P, a + 6, dispY + dispH - 4, a + (b - a) * 0.4, dispY + 6), { w: 0.6, faint: true });
      }
    }
    awningEl(c, P, x + 10, ay, w - 20, 16, spec.awning);
    if (spec.sign === 'projecting' || spec.sign === 'both') projectingSign(c, P, x + w - 2, sy - 30);
    if (spec.sign === 'layered') {
      verticalSign(c, P, doorX - 18, ay + 4, 44, spec.script ?? 'kanji');
      lantern(c, P, doorX + doorW + 10, ay + 2);
    }
    const disp = panes[0] ?? [doorX, doorX + doorW];
    regions.shop = bbox(P, x - 4, sy - 2, w + 8, shopH + 8);
    regions.entrance = bbox(P, doorX - 18, ay - 4, doorW + 36, ground - ay + 12);
    regions.display = bbox(P, disp[0] - 4, dispY - 6, disp[1] - disp[0] + 8, dispH + 14);
    regions.sign = spec.sign === 'projecting' ? bbox(P, x + w - 24, sy - 34, 56, 40) : bbox(P, x + 2, sy - (spec.sign === 'both' ? 34 : 2), w + (spec.sign === 'both' ? 30 : 4), 24 + (spec.sign === 'both' ? 32 : 0));
    const np = spec.plants ?? 0;
    for (let i = 0; i < np; i++) {
      const px = i % 2 === 0 ? doorX - 8 - Math.floor(i / 2) * 12 : doorX + doorW + 8 + Math.floor(i / 2) * 12;
      plantEl(c, P, px, ground, 9 + (i % 2) * 3);
    }
    regions.plants = bbox(P, doorX - 34, ground - 40, doorW + 68, 42);
  }
  return { top, regions };
}

// ---------------------------------------------------------------------------
// Templates

type Built = { regions: Record<string, Rect> };

/** Street furniture shared by several templates. */
function extras(c: Ctx, s: GuideSpec, ground: number, opts: { poleX?: [number, number]; boardX?: number; bikeX?: number; truckX?: number } = {}) {
  if (s.pole) {
    const [l, r] = opts.poleX ?? [26, 374];
    poleEl(c, s.pole === 'left' ? l : r, ground, Math.min(ground - 10, 230), s.pole === 'left' ? 1 : -1);
  }
  if (s.aframe) aframeEl(c, opts.boardX ?? 262, ground, 1);
  if (s.bicycle) bicycleEl(c, opts.bikeX ?? 300, ground, 1);
  if (s.truck) truckEl(c, opts.truckX ?? 160, ground + 6, 1);
}

function shopfrontT(c: Ctx, s: GuideSpec): Built {
  const bays = s.bays ?? 3;
  const floors = s.floors ?? 2;
  const w = Math.min(290, bays * 78);
  const x = 200 - w / 2;
  const ground = 256;
  // neighbours, cropped
  c.path(`M0 ${ground}V${ground - 150}H${x - 2}M${x + w + 2} ${ground - 120}H400`, { faint: true });
  windowEl(c, ID, x - 40, ground - 130, 22, 30);
  windowEl(c, ID, x + w + 22, ground - 100, 22, 30);
  const { regions } = facadeBlock(c, ID, { x, w, ground, floors, floorH: 46, shopH: 92, bays, spec: s, shop: true });
  pavementEl(c, ground + 20, 0, 400);
  if (s.cables) cablesEl(c, [[[0, ground - 92 - floors * 46 + 10], [400, ground - 92 - floors * 46 + 22], 18], [[0, ground - 120], [400, ground - 112], 14]]);
  if (s.tree) treeEl(c, s.tree === 'left' ? 36 : 364, ground + 14, 150, 110);
  if (s.lamp) lampEl(c, s.tree === 'right' ? 30 : 372, ground + 16, 120);
  if (s.figure) figureEl(c, x + w * 0.78, ground + 14, 0.9);
  if (s.wet) reflectionsEl(c, [[x + 20, 40, 'blue'], [x + w / 2 - 10, 26, 'ochre'], [x + w - 60, 40, 'terra']], ground + 22);
  extras(c, s, ground + 14, { poleX: [Math.max(16, x - 20), Math.min(384, x + w + 20)], boardX: x + w * 0.62, bikeX: x + w * 0.7, truckX: x + w * 0.42 });
  return { regions };
}

function cornerT(c: Ctx, s: GuideSpec): Built {
  const floors = s.floors ?? 3;
  const ye = 205;
  const CX = 210;
  const L: Map = (x, y) => {
    const d = 190 - x;
    return [CX - d * 0.86, ye + (y - ye) * (1 - d * 0.0019)];
  };
  const R: Map = (x, y) => [CX + x * 0.9, ye + (y - ye) * (1 - x * 0.0017)];
  const ground = 262;
  const floorH = 44;
  const shopH = 84;
  const left = facadeBlock(c, L, { x: 0, w: 190, ground, floors, floorH, shopH, bays: 3, spec: { ...s, awning: 'none', sign: s.sign === 'projecting' ? 'none' : s.sign }, shop: true });
  const right = facadeBlock(c, R, { x: 0, w: 180, ground, floors, floorH, shopH, bays: 3, spec: { ...s, balcony: false }, shop: true });
  c.path(`M${CX} ${ground}V${ground - shopH - floors * floorH - 4}`, { w: 2.4 });
  // pavement following both faces
  c.path(`M0 ${f(L(0, ground + 18)[1])}L${CX} ${ground + 18}L400 ${f(R(210, ground + 18)[1])}`, { w: 1.3 });
  c.path(`M${CX} ${ground + 18}l-8 30M${CX - 60} ${f(L(120, ground + 18)[1])}l-6 30M${CX + 70} ${f(R(80, ground + 18)[1])}l6 30`, { w: 0.6, faint: true });
  if (s.cables) cablesEl(c, [[[CX, ground - shopH - 30], [400, 120], 16], [[CX, ground - shopH - 30], [0, 110], 22]]);
  if (s.tree) treeEl(c, s.tree === 'left' ? 40 : 370, ground + 26, 150, 100);
  if (s.lamp) lampEl(c, CX - 30, ground + 30, 110);
  if (s.figure) figureEl(c, CX + 40, ground + 26, 0.9);
  if (s.wet) reflectionsEl(c, [[CX - 50, 40, 'ochre'], [CX + 20, 50, 'blue']], ground + 22);
  extras(c, s, ground + 26, { poleX: [24, 380], boardX: CX + 60, bikeX: CX + 110, truckX: 30 });
  return {
    regions: {
      corner: { x: CX - 44, y: 40, w: 88, h: ground - 30 },
      shop: union(left.regions.shop, right.regions.shop),
      upper: union(left.regions.upper, right.regions.upper),
      balconies: left.regions.balconies ?? left.regions.upper,
      entrance: right.regions.entrance,
      roofline: union(left.regions.roofline, right.regions.roofline),
    },
  };
}

function laneT(c: Ctx, s: GuideSpec): Built {
  const VP: Pt = [214, 150];
  const D = 120;
  const wall = (nearX: number): Map => (u, v) => {
    const k = 1 / (1 + u / D);
    return [VP[0] + (nearX - VP[0]) * k, VP[1] + (v - VP[1]) * k];
  };
  const Lw = wall(18);
  const Rw = wall(386);
  const G = 292;
  const H = 0;
  const U = 520;
  // walls: ground line, rooflines with irregular steps
  for (const P of [Lw, Rw]) {
    c.path(seg(P, 0, G, U, G), { w: 1.4 });
    let d = '';
    const steps = [0, 90, 170, 260, 360, U];
    for (let i = 0; i < steps.length - 1; i++) {
      const hgt = H + 10 + ((i * 37) % 50);
      d += seg(P, steps[i], hgt, steps[i + 1], hgt) + seg(P, steps[i + 1], hgt, steps[i + 1], H + 10 + (((i + 1) * 37) % 50));
      d += seg(P, steps[i], hgt, steps[i], G);
    }
    c.path(d, { w: 1.2 });
    c.wash(poly(P, [[0, 20], [U, 20], [U, G], [0, G]]), P === Lw ? 'ochre' : 'terra', 0.28);
    // windows on several floors, repeating with depth
    for (let u = 20; u < U - 40; u += 70) {
      for (const v of [60, 130]) {
        const P2 = P;
        c.path(rectPath(P2, u, v, 34, 40), { w: 1 });
        c.wash(rectPath(P2, u + 1, v + 1, 32, 38), 'grey', 0.45);
        c.path(seg(P2, u - 3, v + 43, u + 37, v + 43), { w: 1.2 });
        if (s.shutters && u < 200) {
          c.path(rectPath(P2, u - 14, v, 13, 40) + rectPath(P2, u + 35, v, 13, 40), { w: 0.7 });
          c.wash(rectPath(P2, u - 14, v, 13, 40), 'sage', 0.5);
        }
      }
      if (s.balcony && u % 140 === 20) balconyEl(c, P, u - 4, 126, 44);
    }
    doorEl(c, P, 40, 210, 40, 82, { recessed: true });
  }
  // far end: a building closing the view, sky strip above
  const fl = Lw(U, 20);
  const fr = Rw(U, 20);
  const gl = Lw(U, G);
  c.path(`M${f(fl[0])} ${f(gl[1])}L${f(fl[0] + 20)} ${f(fl[1] - 10)}L${f(fr[0])} ${f(fr[1] - 6)}`, { w: 1 });
  if (s.cables !== false) {
    cablesEl(c, [
      [Lw(60, 40), Rw(80, 30), 14],
      [Lw(150, 30), Rw(130, 50), 10],
      [Lw(260, 50), Rw(300, 40), 6],
      [Lw(30, 90), Rw(200, 70), 18],
    ]);
  }
  if (s.plants) plantEl(c, Lw, 20, G, 12);
  if (s.sign && s.sign !== 'none') projectingSign(c, ID, Rw(100, 100)[0], Rw(100, 100)[1], -1);
  if (s.figure) figureEl(c, 230, 268, 0.6);
  if (s.lamp) lantern(c, Rw, 230, 96);
  if (s.bicycle) bicycleEl(c, 270, 270, 0.8);
  if (s.pole) poleEl(c, s.pole === 'left' ? 70 : 330, 296, 250, s.pole === 'left' ? 1 : -1);
  if (s.wet) reflectionsEl(c, [[150, 40, 'ochre'], [230, 30, 'blue']], 236);
  c.path(`M${f(Lw(0, G)[0])} ${G}L${VP[0] - 6} ${f(Lw(U, G)[1])}M${f(Rw(0, G)[0])} ${G}L${VP[0] + 6} ${f(Rw(U, G)[1])}`, { faint: true, w: 0.7 });
  return {
    regions: {
      near: { x: 0, y: 150, w: 120, h: 150 },
      windows: bbox(Lw, 0, 50, 280, 140),
      cables: { x: 40, y: 0, w: 320, h: 120 },
      far: { x: 150, y: 90, w: 120, h: 130 },
    },
  };
}

function facadeT(c: Ctx, s: GuideSpec): Built {
  const bays = s.bays ?? 4;
  const floors = s.floors ?? 3;
  const w = Math.min(300, bays * 70);
  const x = 200 - w / 2;
  const ground = 270;
  const floorH = Math.min(52, 200 / (floors + 1));
  const { regions, top } = facadeBlock(c, ID, { x, w, ground, floors, floorH, shopH: floorH + 10, bays, spec: { ...s, books: false, chairs: false }, shop: false });
  // ground floor: street door + a window, with an interruption
  const gy = ground - floorH - 10;
  c.path(`M${x} ${gy}H${x + w}`, { w: 1.2 });
  const doorX = s.door === 'left' ? x + 12 : s.door === 'right' ? x + w - 48 : x + w / 2 - 18;
  doorEl(c, ID, doorX, gy + 8, 36, ground - gy - 8, { arch: s.arch, recessed: s.recessed });
  windowEl(c, ID, doorX > x + w / 2 ? x + 20 : x + w - 50, gy + 16, 28, 34, { shutters: s.shutters });
  pipeEl(c, ID, x + w - 8, top + 4, ground);
  if (s.cables) cablesEl(c, [[[x - 30, top + 30], [x + w + 30, top + 50], 10], [[x - 30, top + 60], [x + w - 8, gy - 20], 8]]);
  if (s.plants) for (let i = 0; i < s.plants; i++) plantEl(c, ID, doorX - 10 + i * 56, ground, 10);
  if (s.tree) treeEl(c, s.tree === 'left' ? 30 : 370, ground + 8, 130, 90);
  pavementEl(c, ground + 12, 0, 400);
  if (s.wet) reflectionsEl(c, [[doorX, 36, 'grey'], [x + 20, 40, 'ochre']], ground + 14);
  extras(c, s, ground + 10, { poleX: [18, 382], boardX: doorX + 44, bikeX: x + 14 });
  const rowY = top + floorH;
  return {
    regions: {
      windows: { x: x - 20, y: rowY + 2, w: w + 40, h: floorH + 6 },
      balcony: regions.balconies ?? { x: x + w / 4, y: rowY, w: w / 2, h: floorH },
      door: { x: doorX - 14, y: gy, w: 64, h: ground - gy + 14 },
      pipes: { x: x + w - 40, y: top, w: 60, h: ground - top },
      roofline: regions.roofline,
    },
  };
}

function stallT(c: Ctx, s: GuideSpec): Built {
  const ground = 262;
  const treeSide = s.tree ?? 'right';
  const tb = treeEl(c, treeSide === 'right' ? 330 : 70, ground, 190, 150);
  const x0 = treeSide === 'right' ? 70 : 130;
  const x1 = x0 + 200;
  // corrugated or plain roof
  awningEl(c, ID, x0, 92, x1 - x0, 30, s.awning && s.awning !== 'none' ? s.awning : 'corrugated');
  c.path(`M${x0 - 4} 124V${ground}M${x1 + 4} 124V${ground}`, { w: 1.6 });
  // hanging signs
  for (let i = 0; i < 3; i++) {
    const hx = x0 + 22 + i * 58;
    c.path(`M${hx} 124v8M${hx + 30} 124v8`, { w: 0.7 });
    c.path(rectPath(ID, hx - 4, 132, 38, 16), { w: 1.1 });
    lettering(c, ID, hx, 145, 30, s.script ?? 'latin', 9);
    c.wash(rectPath(ID, hx - 4, 132, 38, 16), i === 1 ? 'terra' : 'ochre', 0.55);
  }
  // counter
  const cy = 196;
  c.path(rectPath(ID, x0 + 6, cy, x1 - x0 - 12, ground - cy), { w: 1.6 });
  c.path(`M${x0 + 6} ${cy + 8}H${x1 - 6}`, { w: 0.8 });
  c.wash(rectPath(ID, x0 + 6, cy, x1 - x0 - 12, ground - cy), 'ochre', 0.4);
  // kettle and stove
  const kx = x0 + 40;
  c.path(`M${kx} ${cy}v-24q0 -8 12 -8h10q12 0 12 8v24M${kx + 12} ${cy - 32}v-5h10v5M${kx + 34} ${cy - 16}q14 -2 16 -14`, { w: 1.3 });
  c.path(`M${kx + 10} ${cy - 44}q-6 -8 0 -14q6 -6 0 -12M${kx + 22} ${cy - 46}q-5 -7 0 -12`, { w: 0.7, faint: true });
  // stacked cups
  for (let st = 0; st < 3; st++) {
    const sx = x0 + 110 + st * 18;
    for (let k = 0; k < 4 - st; k++) c.path(poly(ID, [[sx, cy - k * 7], [sx + 12, cy - k * 7], [sx + 10, cy - k * 7 - 7], [sx + 2, cy - k * 7 - 7]]), { w: 0.9 });
  }
  c.path(rectPath(ID, x1 - 52, cy - 26, 34, 26), { w: 1 });
  // stools and a bench
  c.path(`M${x0 + 20} ${ground}v-22h22v22M${x0 + 18} ${ground - 22}h26`, { w: 1.2 });
  if (s.bench !== false) benchEl(c, x1 + (treeSide === 'right' ? -10 : 20), ground - 18, 46);
  if (s.figure) figureEl(c, x1 - 30, ground, 1);
  // dappled tree shadow on the roof and ground
  c.wash(`M${x0 + 100} 92h${x1 - x0 - 100}v32h${-(x1 - x0 - 120)}Z`, 'blue', 0.35);
  pavementEl(c, ground + 16, 0, 400, true);
  if (s.cables) cablesEl(c, [[[0, 60], [400, 76], 16]]);
  return {
    regions: {
      counter: { x: x0, y: cy - 60, w: x1 - x0, h: ground - cy + 66 },
      roof: { x: x0 - 14, y: 84, w: x1 - x0 + 28, h: 70 },
      tree: tb,
      seats: { x: x0, y: ground - 46, w: x1 - x0 + 70, h: 66 },
    },
  };
}

function doorwayT(c: Ctx, s: GuideSpec): Built {
  const ground = 270;
  const dw = 92;
  const dh = 170;
  const dx = 200 - dw / 2;
  const dy = ground - dh;
  c.wash(`M30 20H370V${ground}H30Z`, s.brick ? 'terra' : 'ochre', 0.3);
  if (s.brick) bricksEl(c, ID, 40, 30, 320, 220);
  else c.path('M60 60q20 -6 40 0M300 110q18 -5 34 2M70 200q14 -4 28 1', { w: 0.7, faint: true });
  // frame
  if (s.arch) {
    c.path(`M${dx - 16} ${ground}V${dy + 30}Q${dx - 16} ${dy - 30} 200 ${dy - 34}Q${dx + dw + 16} ${dy - 30} ${dx + dw + 16} ${dy + 30}V${ground}`, { w: 1.6 });
  } else {
    c.path(`M${dx - 14} ${ground}V${dy - 14}H${dx + dw + 14}V${ground}`, { w: 1.6 });
    c.path(`M${dx - 20} ${dy - 14}H${dx + dw + 20}M${dx - 18} ${dy - 20}H${dx + dw + 18}`, { w: 1.2 });
  }
  doorEl(c, ID, dx, dy, dw, dh, { recessed: true, arch: s.arch });
  c.path(`M200 ${dy + 10}V${ground}`, { w: 1 });
  // transom / lamp
  if (s.lamp) {
    c.path(`M${dx + dw + 30} ${dy + 10}h12M${dx + dw + 36} ${dy + 10}v8`, { w: 1 });
    c.path(rectPath(ID, dx + dw + 30, dy + 18, 12, 18), { w: 1 });
  }
  // tiles on the step
  const sy = ground;
  c.path(`M${dx - 30} ${sy}H${dx + dw + 30}L${dx + dw + 40} ${sy + 18}H${dx - 40}Z`, { w: 1.3 });
  if (s.tiles !== false) {
    let d = '';
    for (let i = 1; i < 10; i++) d += `M${dx - 30 + ((dw + 60) * i) / 10} ${sy}l${-4 + (i - 5) * 1.2} 18`;
    d += `M${dx - 35} ${sy + 9}H${dx + dw + 35}`;
    c.path(d, { w: 0.7 });
    c.wash(`M${dx - 30} ${sy}H${dx + dw + 30}L${dx + dw + 40} ${sy + 18}H${dx - 40}Z`, 'blue', 0.4);
  }
  // plants either side
  const np = Math.max(2, s.plants ?? 3);
  for (let i = 0; i < np; i++) {
    const left = i % 2 === 0;
    const px = left ? dx - 30 - Math.floor(i / 2) * 22 : dx + dw + 30 + Math.floor(i / 2) * 22;
    plantEl(c, ID, px, ground, 13 + (i % 3) * 3);
  }
  climber(c, ID, dx - 22, dy - 26, ground - 30, s.arch ? 0 : dw + 40);
  windowEl(c, ID, 50, 70, 40, 56, { shutters: s.shutters });
  pipeEl(c, ID, 352, 20, ground);
  return {
    regions: {
      door: { x: dx - 6, y: dy - 6, w: dw + 12, h: dh + 10 },
      frame: { x: dx - 44, y: dy - 44, w: dw + 88, h: dh + 50 },
      plants: { x: dx - 80, y: ground - 70, w: dw + 160, h: 76 },
      step: { x: dx - 50, y: ground - 20, w: dw + 100, h: 44 },
    },
  };
}

function streetT(c: Ctx, s: GuideSpec): Built {
  const ground = 196;
  // background shopfront, smaller
  const w = 170;
  const x = 150;
  const { regions } = facadeBlock(c, ID, { x, w, ground, floors: s.floors ?? 2, floorH: 34, shopH: 64, bays: s.bays ?? 3, spec: { ...s, plants: Math.min(2, s.plants ?? 1) }, shop: true });
  c.path(`M0 ${ground}V60H${x - 4}M${x + w + 4} ${ground - 110}H400`, { faint: true });
  // pavement with joints in perspective
  c.path(`M0 ${ground + 4}H400M0 260L400 250`, { w: 1.3 });
  let d = '';
  for (let i = -6; i < 12; i++) d += `M${200 + i * 26} ${ground + 4}L${200 + i * 52} 300`;
  d += `M0 ${ground + 30}H400M0 ${ground + 62}H400`;
  c.path(d, { w: 0.6, faint: true });
  const tb = treeEl(c, s.tree === 'right' ? 330 : 80, 252, 200, 150);
  benchEl(c, s.tree === 'right' ? 280 : 50, 240, 70);
  signpostEl(c, s.tree === 'right' ? 70 : 352, 256, 120);
  if (s.lamp !== false) lampEl(c, s.tree === 'right' ? 120 : 300, 250, 150);
  if (s.figure) figureEl(c, 230, ground + 2, 0.7);
  if (s.cables) cablesEl(c, [[[0, 70], [400, 50], 18]]);
  if (s.wet) reflectionsEl(c, [[x + 20, 40, 'ochre'], [x + 100, 30, 'blue']], ground + 6);
  return {
    regions: {
      bench: { ...tb, h: tb.h + 10 },
      signpost: { x: (s.tree === 'right' ? 70 : 352) - 40, y: 120, w: 80, h: 140 },
      shop: regions.shop,
      pavement: { x: 0, y: ground, w: 400, h: 100 },
    },
  };
}

function cafeT(c: Ctx, s: GuideSpec): Built {
  const ground = 258;
  const x = 40;
  const w = 320;
  const top = 40;
  c.path(`M${x} ${ground}V${top}H${x + w}V${ground}`, { w: 1.8 });
  c.wash(`M${x} ${top}H${x + w}V${ground}H${x}Z`, s.brick ? 'terra' : 'ochre', 0.28);
  if (s.brick) bricksEl(c, ID, x + 6, top + 6, w - 12, 60);
  fascia(c, ID, x + 30, top + 18, w - 60, 20);
  windowEl(c, ID, x + 30, top + 48, 30, 24, {});
  windowEl(c, ID, x + w - 60, top + 48, 30, 24, {});
  // two large windows with chairs inside, door between
  const wy = 120;
  const wh = 100;
  const dX = s.door === 'left' ? x + 20 : s.door === 'right' ? x + w - 66 : x + w / 2 - 23;
  const panes: [number, number][] = s.door === 'left' ? [[dX + 60, x + w - 16]] : s.door === 'right' ? [[x + 16, dX - 14]] : [[x + 16, dX - 14], [dX + 60, x + w - 16]];
  for (const [a, b] of panes) {
    c.path(rectPath(ID, a, wy, b - a, wh), { w: 1.6 });
    c.path(`M${a} ${wy + 26}H${b}M${(a + b) / 2} ${wy}V${wy + wh}`, { w: 0.8 });
    c.wash(rectPath(ID, a + 1, wy + 1, b - a - 2, wh - 2), 'blue', 0.28);
    chairsEl(c, ID, a + 4, wy + wh - 4, b - a - 8);
    c.path(`M${a + 10} ${wy + wh - 6}L${a + (b - a) * 0.45} ${wy + 30}`, { w: 0.6, faint: true });
  }
  doorEl(c, ID, dX, wy - 6, 46, ground - wy + 6, { glazed: true, recessed: s.recessed });
  climber(c, ID, dX - 12, top + 46, ground - 20, 70);
  plantEl(c, ID, dX - 18, ground, 14);
  plantEl(c, ID, dX + 64, ground, 12);
  if (s.awning && s.awning !== 'none') awningEl(c, ID, x + 20, wy - 22, w - 40, 14, s.awning);
  if (s.sign === 'projecting' || s.sign === 'both') projectingSign(c, ID, x + w, top + 50);
  // outdoor chair and irregular pavement
  c.path(`M${x + w - 50} ${ground + 30}v-18h14v18M${x + w - 50} ${ground + 12}v-14`, { w: 1.1 });
  pavementEl(c, ground + 34, 0, 400, true);
  if (s.lamp) lampEl(c, 20, ground + 34, 140);
  if (s.wet) reflectionsEl(c, [[x + 40, 60, 'ochre'], [dX, 40, 'blue']], ground + 36);
  extras(c, s, ground + 34, { poleX: [16, 386], boardX: dX + 70, bikeX: x + 30 });
  return {
    regions: {
      window: { x: panes[0][0] - 6, y: wy - 8, w: panes[0][1] - panes[0][0] + 12, h: wh + 16 },
      entrance: { x: dX - 26, y: wy - 30, w: 98, h: ground - wy + 40 },
      plants: { x: dX - 40, y: top + 30, w: 130, h: ground - top },
      pavement: { x: 0, y: ground - 10, w: 400, h: 60 },
    },
  };
}

function waterfrontT(c: Ctx, s: GuideSpec): Built {
  const horizon = 122;
  // far hills, faint, with a pale wash
  const hills = `M0 ${horizon}L40 ${horizon - 22}L70 ${horizon - 12}L110 ${horizon - 40}L150 ${horizon - 16}L190 ${horizon - 30}L240 ${horizon}`;
  c.path(hills, { w: 0.9, faint: true });
  c.wash(hills + 'Z', 'blue', 0.35);
  c.path(`M0 ${horizon}H230`, { w: 1 });
  // village on the shore: houses with pitched roofs, trees scribbled behind
  for (let i = 0; i < 4; i++) scribble(c, 250 + i * 40, 92 + (i % 2) * 8, 26, 14, 9);
  c.washes.push(<ellipse key={c.key()} cx={320} cy={96} rx={90} ry={26} fill="var(--wash-sage)" opacity={0.55} />);
  const houses: [number, number, number, number][] = [
    [236, 150, 34, 30],
    [268, 140, 40, 40],
    [306, 146, 36, 36],
    [340, 138, 44, 48],
    [282, 166, 40, 26],
    [330, 170, 50, 30],
  ];
  for (const [hx, base, hw, hh] of houses) {
    const top = base - hh;
    c.path(rectPath(ID, hx, top, hw, hh), { w: 1.1 });
    c.path(`M${hx - 3} ${top}L${hx + hw * 0.5} ${top - 12}L${hx + hw + 3} ${top}`, { w: 1.1 });
    c.wash(`M${hx - 3} ${top}L${hx + hw * 0.5} ${top - 12}L${hx + hw + 3} ${top}Z`, 'terra', 0.7);
    c.wash(rectPath(ID, hx, top, hw, hh), 'ochre', 0.55);
    for (let wx = hx + 6; wx < hx + hw - 6; wx += 11) for (let wy = top + 7; wy < base - 6; wy += 12) c.path(rectPath(ID, wx, wy, 4, 6), { w: 0.8 });
  }
  if (s.spire) {
    c.path('M372 150V96M386 150V96M370 96L379 70L388 96Z', { w: 1.2 });
    c.wash('M370 96L379 70L388 96Z', 'terra', 0.7);
  }
  c.path(`M226 ${horizon + 28}Q300 ${horizon + 50} 400 ${horizon + 62}`, { w: 1.3 });
  // water: horizontal strokes and washes
  let d = '';
  for (let y = horizon + 10; y < 296; y += 9) for (let x = c.rng() * 40; x < 400; x += 50 + c.rng() * 40) d += `M${f(x)} ${y}h${f(10 + c.rng() * 22)}`;
  c.path(d, { w: 0.6, faint: true });
  c.wash(`M0 ${horizon}H232Q300 ${horizon + 52} 400 ${horizon + 64}V300H0Z`, 'blue', 0.4);
  // boats with mooring lines to rocks
  boatEl(c, 60, 252, 130, 1);
  boatEl(c, 232, 214, 96, 1);
  boatEl(c, 150, 166, 62, 1);
  const rock = (x: number, y: number, r: number) => {
    c.path(`M${x - r} ${y}Q${x - r * 0.8} ${y - r * 1.2} ${x} ${y - r}Q${x + r} ${y - r * 0.9} ${x + r} ${y}Z`, { w: 1 });
    c.wash(`M${x - r} ${y}Q${x} ${y - r * 1.4} ${x + r} ${y}Z`, 'grey', 0.7);
  };
  rock(30, 232, 9);
  rock(206, 222, 8);
  rock(300, 196, 7);
  rock(120, 158, 6);
  c.path('M60 238L36 230M190 236L200 222M328 196L304 192M150 160L124 156', { w: 0.7 });
  return {
    regions: {
      boats: { x: 20, y: 200, w: 200, h: 92 },
      village: { x: 220, y: 60, w: 180, h: 130 },
      water: { x: 0, y: 140, w: 400, h: 160 },
      hills: { x: 0, y: 70, w: 250, h: 60 },
    },
  };
}

function riversideT(c: Ctx, s: GuideSpec): Built {
  // overhanging branch, top left
  c.path('M0 30Q60 36 120 22M40 32Q70 50 96 48', { w: 1.1 });
  for (let i = 0; i < 4; i++) scribble(c, 30 + i * 42, 34 + (i % 2) * 14, 24, 12, 9);
  c.washes.push(<ellipse key={c.key()} cx={100} cy={40} rx={110} ry={30} fill="var(--wash-sage)" opacity={0.6} />);
  // buildings across the river
  const base = 176;
  let x = 60;
  const cols: WashColour[] = ['terra', 'ochre', 'ochre', 'blue', 'ochre', 'terra', 'ochre'];
  let k = 0;
  while (x < 400) {
    const w = 34 + c.rng() * 18;
    const h = 46 + c.rng() * 26;
    const top = base - h;
    c.path(rectPath(ID, x, top, w, h), { w: 1.1 });
    c.path(`M${x - 2} ${top}L${x + 6} ${top - 10}H${x + w - 6}L${x + w + 2} ${top}`, { w: 1 });
    c.wash(`M${x - 2} ${top}L${x + 6} ${top - 10}H${x + w - 6}L${x + w + 2} ${top}Z`, k % 3 === 2 ? 'blue' : 'terra', 0.65);
    c.wash(rectPath(ID, x, top, w, h), cols[k % cols.length], 0.45);
    for (let wy = top + 8; wy < base - 8; wy += 12) for (let wx = x + 5; wx < x + w - 5; wx += 9) c.path(rectPath(ID, wx, wy, 3.5, 6), { w: 0.7 });
    x += w;
    k++;
  }
  if (s.spire !== false) {
    c.path('M296 112V40M318 112V40M294 40L307 0L320 40Z', { w: 1.3 });
    c.path('M300 60h14M300 84h14M303 50v6M311 50v6', { w: 0.8 });
    c.wash('M294 40L307 0L320 40Z', 'blue', 0.75);
    c.wash('M296 40H318V112H296Z', 'grey', 0.4);
  }
  // trees along the quay
  scribble(c, 80, 150, 22, 18, 10);
  scribble(c, 210, 152, 18, 14, 8);
  // embankment and bridge
  c.path(`M40 ${base}H400M40 ${base + 18}H230`, { w: 1.3 });
  let st = '';
  for (let sx = 50; sx < 230; sx += 18) st += `M${sx} ${base + 4}h10M${sx + 8} ${base + 11}h10`;
  c.path(st, { w: 0.6, faint: true });
  c.wash(`M40 ${base}H230V${base + 18}H40Z`, 'ochre', 0.5);
  c.path(`M226 ${base - 4}H400M226 ${base + 2}H400M232 ${base + 2}V${base + 40}M232 ${base + 40}Q280 ${base + 2} 326 ${base + 40}M326 ${base + 40}Q366 ${base + 6} 400 ${base + 30}`, { w: 1.4 });
  hatchRect(c, ID, 238, base + 22, 80, 16, 3);
  c.path(`M322 ${base + 2}V${base + 44}h10V${base + 2}`, { w: 1.1 });
  c.wash(`M226 ${base - 4}H400V${base + 30}Q366 ${base + 6} 326 ${base + 40}Q280 ${base + 2} 232 ${base + 40}V${base - 4}Z`, 'ochre', 0.5);
  // river
  let d = '';
  for (let y = base + 26; y < 254; y += 7) for (let rx = 20 + c.rng() * 40; rx < 400; rx += 46 + c.rng() * 30) d += `M${f(rx)} ${y}h${f(10 + c.rng() * 18)}`;
  c.path(d, { w: 0.6, faint: true });
  c.wash(`M20 ${base + 20}H400V256H20Z`, 'blue', 0.45);
  // foreground railing, paving, lamp post
  railingEl(c, 24, 250, 266, 30);
  c.path('M0 270H400M0 300L60 270M90 300L130 270M190 300L210 270M290 300L290 270', { w: 0.7, faint: true });
  c.wash('M0 270H400V300H0Z', 'ochre', 0.4);
  const lx = 150;
  c.path(`M${lx - 8} 292h16M${lx - 6} 292V274h12V292M${lx - 3} 274V96M${lx + 3} 274V96`, { w: 1.5 });
  c.path(`M${lx - 7} 210h14M${lx - 5} 180h10`, { w: 1 });
  c.path(`M${lx - 10} 96h20M${lx - 9} 96L${lx - 13} 70H${lx + 13}L${lx + 9} 96M${lx - 13} 70L${lx} 58L${lx + 13} 70M${lx} 58v-8`, { w: 1.3 });
  hatchRect(c, ID, lx + 3, 100, 3, 170, 2);
  return {
    regions: {
      lamp: { x: lx - 40, y: 44, w: 80, h: 254 },
      bridge: { x: 222, y: base - 10, w: 178, h: 56 },
      buildings: { x: 50, y: 92, w: 350, h: 90 },
      tower: { x: 284, y: 0, w: 46, h: 118 },
    },
  };
}

function vistaT(c: Ctx, s: GuideSpec): Built {
  const VP: Pt = [204, 130];
  // water band and bridge at the end of the street
  c.path('M120 128H300', { w: 1 });
  c.wash('M110 112H300V140H110Z', 'blue', 0.5);
  c.path('M168 124V88M174 124V88M240 124V84M246 124V84M120 116H300', { w: 1.3 });
  c.path('M120 112Q146 90 171 88Q207 116 243 84Q270 92 300 108', { w: 0.9 });
  let hz = '';
  for (let x = 180; x < 240; x += 8) hz += `M${x} ${100 + Math.abs(x - 207) * 0.4}V116`;
  c.path(hz, { w: 0.5 });
  c.wash('M166 86h10v38h-10ZM238 82h10v42h-10Z', 'terra', 0.75);
  c.path('M262 104q20 -14 36 -4', { w: 0.8, faint: true });
  c.path('M196 132h18l-3 4h-12Z', { w: 0.9 });
  // street converging
  c.path(`M70 300L${VP[0] - 12} ${VP[1] + 8}M346 300L${VP[0] + 14} ${VP[1] + 8}`, { w: 1.3 });
  let dash = '';
  for (let t = 0.05; t < 0.9; t += 0.12) {
    const y1 = 300 - (300 - VP[1] - 8) * t;
    const y2 = 300 - (300 - VP[1] - 8) * (t + 0.05);
    dash += `M${f(208 + (VP[0] - 206) * t)} ${f(y1)}L${f(208 + (VP[0] - 206) * (t + 0.05))} ${f(y2)}`;
  }
  c.path(dash, { w: 1 });
  c.wash(`M70 300L${VP[0] - 12} ${VP[1] + 8}H${VP[0] + 14}L346 300Z`, 'grey', 0.3);
  // row houses on both sides, smaller with distance
  const cols: WashColour[] = ['terra', 'blue', 'ochre', 'sage', 'terra', 'blue'];
  const side = (dir: 1 | -1) => {
    let xx = dir === -1 ? 0 : 400;
    let k = 1;
    let i = 0;
    while (k > 0.3 && (dir === -1 ? xx < VP[0] - 46 : xx > VP[0] + 46)) {
      const w = 74 * k;
      const h = 180 * k;
      const base = 300 - (300 - VP[1] - 8) * (1 - k) - 34 * k;
      const x0 = dir === -1 ? xx : xx - w;
      c.path(rectPath(ID, x0, base - h, w, h), { w: 1.2 * Math.max(0.6, k) });
      c.path(`M${x0 - 3} ${base - h}h${w + 6}M${x0 - 2} ${base - h + 4 * k}h${w + 4}`, { w: 1 });
      c.wash(rectPath(ID, x0, base - h, w, h), cols[i % cols.length], 0.6);
      for (let fy = base - h + 16 * k; fy < base - 30 * k; fy += 34 * k)
        for (let fx = x0 + 10 * k; fx < x0 + w - 14 * k; fx += 22 * k) c.path(rectPath(ID, fx, fy, 9 * k, 20 * k), { w: 0.8 });
      c.path(rectPath(ID, x0 + w * 0.15, base - 32 * k, 14 * k, 32 * k), { w: 1 });
      hatchRect(c, ID, x0 + (dir === -1 ? w - 8 * k : 0), base - h, 8 * k, h, 3);
      xx += dir === -1 ? w : -w;
      k *= 0.78;
      i++;
    }
  };
  side(-1);
  side(1);
  // street trees and parked cars
  scribble(c, 150, 158, 20, 10, 9);
  scribble(c, 258, 160, 18, 9, 8);
  for (const [cx, cy, sc] of [[100, 270, 1], [290, 262, 0.9], [262, 220, 0.6]] as const) {
    c.path(`M${cx} ${cy}h${46 * sc}v${-10 * sc}l${-8 * sc} ${-10 * sc}h${-26 * sc}l${-8 * sc} ${10 * sc}Z`, { w: 1.1 });
    c.lines.push(<circle key={c.key()} cx={cx + 10 * sc} cy={cy} r={5 * sc} />);
    c.lines.push(<circle key={c.key()} cx={cx + 36 * sc} cy={cy} r={5 * sc} />);
    c.wash(`M${cx} ${cy}h${46 * sc}v${-10 * sc}h${-46 * sc}Z`, 'terra', 0.5);
  }
  if (s.cables) cablesEl(c, [[[0, 40], [400, 50], 30]]);
  return {
    regions: {
      left: { x: 0, y: 40, w: 150, h: 250 },
      view: { x: 112, y: 76, w: 196, h: 66 },
      street: { x: 70, y: 140, w: 280, h: 160 },
      right: { x: 250, y: 40, w: 150, h: 250 },
    },
  };
}

function houseT(c: Ctx, s: GuideSpec): Built {
  const ground = 262;
  const regions: Record<string, Rect> = {};
  if ((s.tiers ?? 1) > 1) {
    // Kerala-style house: stacked tiled roofs with deep eaves, verandah posts
    if (s.palms !== false) {
      palmEl(c, 60, ground, 150);
      palmEl(c, 96, ground - 4, 118);
    }
    const tiers = Math.min(3, s.tiers ?? 2);
    const blocks: [number, number, number, number][] = [
      [140, 190, 190, ground],
      [170, 132, 140, 190],
      [196, 86, 90, 132],
    ];
    for (let i = 0; i < tiers; i++) {
      const [bx, top, bw, bot] = blocks[i];
      c.path(rectPath(ID, bx, top, bw, bot - top), { w: 1.3 });
      c.wash(rectPath(ID, bx, top, bw, bot - top), i === 0 ? 'terra' : 'ochre', 0.4);
      const ex = 26 - i * 4;
      const roof = `M${bx - ex} ${top + 6}L${bx + 14} ${top - 26}H${bx + bw - 14}L${bx + bw + ex} ${top + 6}Z`;
      c.path(roof, { w: 1.4 });
      let r = '';
      for (let t = 1; t < 4; t++) {
        const y = top + 6 - (32 * t) / 4;
        const dx = ((ex + 14) * t) / 4;
        r += `M${bx - ex + dx} ${f(y)}H${bx + bw + ex - dx}`;
      }
      for (let rx = bx - ex + 8; rx < bx + bw + ex - 4; rx += 9) r += `M${rx} ${top + 6}l${(bx + bw / 2 - rx) * 0.08} -6`;
      c.path(r, { w: 0.6 });
      c.wash(roof, i === tiers - 1 ? 'terra' : 'ochre', 0.75);
      hatchRect(c, ID, bx, top + 6, bw, 8, 2.8);
      for (let wx = bx + 18; wx < bx + bw - 20; wx += 34) c.path(rectPath(ID, wx, top + 20, 14, Math.min(26, bot - top - 30)), { w: 1 });
    }
    c.path(`M140 ${ground}V198M190 ${ground}V198M250 ${ground}V198`, { w: 1.2 });
    c.path(`M110 ${ground}H350M120 ${ground + 12}H330`, { w: 1.2 });
    hatchRect(c, ID, 196, 214, 40, 48, 3);
    scribble(c, 340, 160, 26, 30, 12);
    scribble(c, 210, 280, 120, 8, 18);
    c.washes.push(<ellipse key={c.key()} cx={220} cy={284} rx={170} ry={14} fill="var(--wash-sage)" opacity={0.55} />);
    regions.roof = { x: 130, y: 50, w: 190, h: 110 };
    regions.door = { x: 180, y: 196, w: 80, h: 76 };
    regions.balcony = { x: 160, y: 120, w: 160, h: 72 };
    regions.stair = { x: 100, y: 190, w: 260, h: 90 };
    return { regions };
  }
  // Village house with an outside stair (Mediterranean)
  const x = 96;
  const w = 220;
  const top = 112;
  c.path(`M${x} ${ground}V${top}H${x + w}V${ground}`, { w: 1.6 });
  c.wash(`M${x} ${top}H${x + w}V${ground}H${x}Z`, 'blue', 0.45);
  // tiled roof on the left volume, chimney, second volume on the right
  c.path(`M${x - 8} ${top}L${x + 12} ${top - 34}H${x + 130}L${x + 140} ${top}Z`, { w: 1.4 });
  let t = '';
  for (let r = 1; r < 5; r++) {
    const y = top - (34 * r) / 5;
    for (let tx = x - 8 + (20 * r) / 5; tx < x + 138 - (10 * r) / 5; tx += 8) t += quad(ID, tx, y + 7, tx + 4, y + 9, tx + 8, y + 7);
  }
  c.path(t, { w: 0.6 });
  c.wash(`M${x - 8} ${top}L${x + 12} ${top - 34}H${x + 130}L${x + 140} ${top}Z`, 'terra', 0.75);
  c.path(`M${x + 28} ${top - 34}V${top - 62}h24V${top - 34}M${x + 24} ${top - 62}h32`, { w: 1.2 });
  c.wash(`M${x + 28} ${top - 62}h24v28h-24Z`, 'blue', 0.5);
  c.path(`M${x + 140} ${top}V${top - 50}H${x + 214}V${top}M${x + 132} ${top - 50}L${x + 140} ${top - 62}H${x + 214}L${x + 222} ${top - 50}`, { w: 1.3 });
  c.wash(`M${x + 140} ${top - 50}H${x + 214}V${top}H${x + 140}Z`, 'terra', 0.4);
  c.path(rectPath(ID, x + 160, top - 38, 30, 16), { w: 1 });
  // bunting line
  c.path(`M${x + 6} ${top + 14}q20 10 40 0q20 10 40 0q20 10 40 0`, { w: 0.8 });
  // upper balcony with pots, upper door
  c.path(rectPath(ID, x + 52, top + 30, 22, 44), { w: 1.2 });
  c.wash(rectPath(ID, x + 52, top + 30, 22, 44), 'sage', 0.7);
  balconyEl(c, ID, x + 30, top + 74, 70);
  for (let i = 0; i < 4; i++) plantEl(c, ID, x + 38 + i * 18, top + 70, 6);
  // lower louvred double door
  const dx = x + 30;
  c.path(rectPath(ID, dx, ground - 76, 58, 76), { w: 1.6 });
  let lv = `M${dx + 29} ${ground - 76}V${ground}`;
  for (let y = ground - 70; y < ground - 4; y += 5) lv += `M${dx + 3} ${y}h23M${dx + 32} ${y}h23`;
  c.path(lv, { w: 0.6 });
  c.wash(rectPath(ID, dx, ground - 76, 58, 76), 'sage', 0.75);
  regions.door = { x: dx - 30, y: ground - 90, w: 118, h: 100 };
  regions.balcony = { x: x + 20, y: top + 24, w: 96, h: 68 };
  regions.roof = { x: x - 12, y: top - 70, w: 240, h: 76 };
  if (s.stair !== false) {
    // outside stair rising to an upper door on the right
    const sx0 = x + w - 10;
    c.path(rectPath(ID, x + 150, top + 26, 26, 50), { w: 1.2 });
    let shut = '';
    for (let y = top + 30; y < top + 74; y += 4) shut += `M${x + 153} ${y}h20`;
    c.path(shut, { w: 0.5 });
    c.path(`M${x + 146} ${top + 78}L${sx0} ${ground}M${x + 180} ${top + 78}L${sx0 + 34} ${ground}M${x + 146} ${top + 78}H${x + 180}`, { w: 1.3 });
    let steps = '';
    for (let k = 1; k < 12; k++) {
      const tt = k / 12;
      const y = top + 78 + (ground - top - 78) * tt;
      steps += `M${f(x + 146 + (sx0 - x - 146) * tt)} ${f(y)}h34`;
    }
    c.path(steps, { w: 0.8 });
    c.path(`M${x + 180} ${top + 78}L${sx0 + 34} ${ground}M${x + 186} ${top + 72}L${sx0 + 40} ${ground - 6}`, { w: 1 });
    hatchRect(c, ID, x + 150, top + 120, 50, ground - top - 120, 3.4);
    c.wash(`M${x + 146} ${top + 78}H${x + 180}L${sx0 + 34} ${ground}H${sx0}Z`, 'grey', 0.45);
    regions.stair = { x: x + 136, y: top + 20, w: 120, h: ground - top - 10 };
  }
  climber(c, ID, x + w - 6, top - 40, top + 70, 0);
  const np = s.plants ?? 5;
  const spots = [x + 8, x + 104, x + 128, x + w + 18, x - 10];
  for (let i = 0; i < Math.min(np, spots.length); i++) plantEl(c, ID, spots[i], ground + (i % 2) * 4, 12 + (i % 3) * 3);
  // paving in perspective
  let pv = `M${x - 20} ${ground}H${x + w + 30}`;
  for (let i = 0; i <= 10; i++) pv += `M${x - 20 + ((w + 50) * i) / 10} ${ground}l${(i - 5) * 3} 30`;
  pv += `M${x - 30} ${ground + 14}H${x + w + 40}`;
  c.path(pv, { w: 0.6, faint: true });
  c.wash(`M${x - 20} ${ground}H${x + w + 30}L${x + w + 45} ${ground + 30}H${x - 35}Z`, 'grey', 0.35);
  return { regions };
}

function stepsT(c: Ctx, s: GuideSpec): Built {
  const bottom = 296;
  const topY = 86;
  const n = 16;
  // walls converging upwards
  c.path(`M0 120L120 ${bottom}M0 40L150 ${topY + 10}M400 110L280 ${bottom}M400 30L250 ${topY + 6}`, { w: 1.2 });
  c.path(`M150 ${topY + 10}V20M250 ${topY + 6}V24`, { w: 1 });
  c.wash(`M0 40L150 ${topY + 10}V${topY + 40}L120 ${bottom}H0Z`, 'ochre', 0.35);
  c.wash(`M400 30L250 ${topY + 6}V${topY + 40}L280 ${bottom}H400Z`, 'terra', 0.3);
  // steps: treads narrowing with height
  let d = '';
  for (let i = 0; i <= n; i++) {
    const tt = i / n;
    const y = bottom - (bottom - topY) * Math.pow(tt, 0.85);
    const xl = 120 + (160 - 120) * tt;
    const xr = 280 - (280 - 244) * tt;
    d += `M${f(xl)} ${f(y)}H${f(xr)}`;
    if (i < n) d += `M${f(xl)} ${f(y - 3 * (1 - tt))}H${f(xr)}`;
  }
  c.path(d, { w: 0.9 });
  c.wash(`M120 ${bottom}L160 ${topY}H244L280 ${bottom}Z`, 'grey', 0.35);
  hatchRect(c, ID, 120, 200, 24, 96, 3);
  // left wall: hanging lantern, pots and plants
  lantern(c, ID, 110, 96);
  c.path('M110 96h-30', { w: 0.8 });
  lettering(c, ID, 105, 124, 10, s.script ?? 'kanji', 7);
  for (const [px, gy, sz] of [[40, 290, 16], [78, 288, 12], [100, 262, 10]] as const) plantEl(c, ID, px, gy, sz);
  scribble(c, 40, 230, 30, 26, 14);
  // right wall: windows, a lamp, a tall cabinet sign
  for (const [wx, wy, ww, wh] of [[330, 70, 30, 34], [300, 120, 20, 26]] as const) windowEl(c, ID, wx, wy, ww, wh);
  c.path(rectPath(ID, 300, 190, 26, 70), { w: 1.1 });
  hatchRect(c, ID, 300, 190, 26, 70, 3.2);
  plantEl(c, ID, 350, 290, 14);
  scribble(c, 360, 240, 26, 22, 12);
  // the top: foliage and roofs where the alley turns
  scribble(c, 200, 50, 40, 22, 16);
  c.washes.push(<ellipse key={c.key()} cx={200} cy={52} rx={60} ry={30} fill="var(--wash-sage)" opacity={0.55} />);
  c.path(`M150 40L200 28L250 40`, { w: 1 });
  if (s.cables) cablesEl(c, [[[150, 30], [250, 40], 8], [[0, 60], [400, 44], 20]]);
  if (s.lamp) lampEl(c, 268, 250, 130);
  return {
    regions: {
      steps: { x: 116, y: topY - 6, w: 168, h: bottom - topY + 6 },
      near: { x: 0, y: 160, w: 128, h: 140 },
      lantern: { x: 80, y: 80, w: 60, h: 66 },
      top: { x: 140, y: 18, w: 120, h: 82 },
    },
  };
}

const TEMPLATES: Record<GuideTemplate, (c: Ctx, s: GuideSpec) => Built> = {
  shopfront: shopfrontT,
  corner: cornerT,
  lane: laneT,
  facade: facadeT,
  stall: stallT,
  doorway: doorwayT,
  street: streetT,
  cafe: cafeT,
  waterfront: waterfrontT,
  riverside: riversideT,
  vista: vistaT,
  house: houseT,
  steps: stepsT,
};

export function buildGuide(spec: GuideSpec, seed: string) {
  const c = new Ctx(seededRng(hashString(seed)));
  const built = TEMPLATES[spec.t](c, spec);
  return { ctx: c, regions: built.regions };
}

// ---------------------------------------------------------------------------

export function SceneGuide({
  spec,
  seed,
  focus,
  title,
  decorative,
  className,
}: {
  spec: GuideSpec;
  seed: string;
  /** Region key to highlight (e.g. for a 5-minute study). */
  focus?: string;
  title?: string;
  decorative?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const { ctx, regions } = useMemo(() => buildGuide(spec, seed), [spec, seed]);
  const r = focus ? regions[focus] : undefined;
  const label = focus ? TEMPLATE_REGIONS[spec.t][focus] : undefined;
  return (
    <svg
      viewBox="0 0 400 300"
      className={`illustration scene-guide ${className ?? ''}`}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : `Composition guide (schematic)${title ? ` for ${title}` : ''}${label ? `, focus area: ${label}` : ''}`}
    >
      <defs>
        <filter id={`wob-${uid}`} x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" />
          <feDisplacementMap in="SourceGraphic" scale="1.6" />
        </filter>
        <filter id={`bleed-${uid}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="3" seed="9" />
          <feDisplacementMap in="SourceGraphic" scale="7" />
        </filter>
        <filter id={`vig-${uid}`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="34" />
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <mask id={`v-${uid}`}>
          <rect x="0" y="0" width="400" height="300" fill="black" />
          <rect x="18" y="14" width="364" height="272" rx="40" fill="white" filter={`url(#vig-${uid})`} />
        </mask>
        {r && (
          <mask id={`m-${uid}`}>
            <rect x="0" y="0" width="400" height="300" fill="white" />
            <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="6" fill="black" />
          </mask>
        )}
      </defs>
      {/* Washes stop short of the edges, like a vignetted sketchbook page. */}
      <g mask={`url(#v-${uid})`}>
        <g filter={`url(#bleed-${uid})`} transform="translate(2.5 2)">
          {ctx.washes}
        </g>
      </g>
      <g filter={`url(#wob-${uid})`} fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round">
        <g opacity="0.5" mask={`url(#v-${uid})`}>
          {ctx.faint}
        </g>
        {ctx.lines}
      </g>
      {r && (
        <g>
          <rect x="0" y="0" width="400" height="300" fill="var(--paper)" opacity="0.72" mask={`url(#m-${uid})`} />
          <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="6" fill="none" stroke="var(--terracotta)" strokeWidth="1.6" strokeDasharray="5 4" />
        </g>
      )}
    </svg>
  );
}
