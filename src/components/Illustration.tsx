import { useId, type ReactNode } from 'react';
import type { ReferenceId } from '../data/types';

// Original schematic illustrations drawn as inline SVG. Lines use
// `currentColor` so they follow the theme; washes use the accent tokens at low
// opacity. A gentle displacement filter gives lines a hand-drawn wobble.

type Scene = { label: string; lines: ReactNode; wash?: ReactNode };

const W = (props: { d: string; c: 'ochre' | 'sage' | 'blue' | 'terra' | 'grey'; o?: number }) => (
  <path d={props.d} fill={`var(--wash-${props.c})`} opacity={props.o ?? 0.55} stroke="none" />
);

const SCENES: Record<ReferenceId, Scene> = {
  shopfront: {
    label: 'A small corner shop with a striped awning, a half-open shutter and a stool on the pavement',
    wash: (
      <>
        <W c="terra" d="M92 112 L308 112 L322 146 L78 146 Z" />
        <W c="ochre" d="M70 40 L330 40 L330 250 L70 250 Z" o={0.22} />
        <W c="grey" d="M112 168 L288 168 L288 248 L112 248 Z" o={0.5} />
      </>
    ),
    lines: (
      <>
        <path d="M70 250 L70 40 L330 40 L330 250" />
        <path d="M62 40 L338 40 M66 48 L334 48" />
        <rect x="104" y="64" width="192" height="30" />
        <path d="M120 84 q8 -14 16 0 q8 -14 16 0 M170 72 l4 16 l6 -16 l4 16 M200 80 h40 M250 76 h30" />
        <path d="M92 112 L308 112 L322 146 L78 146 Z" />
        <path d="M78 146 q10 8 20 0 q10 8 20 0 q10 8 20 0 q10 8 20 0 q10 8 20 0 q10 8 20 0 q10 8 20 0 q10 8 20 0 q10 8 20 0 q10 8 20 0 q10 8 20 0 q10 8 24 0" />
        <path d="M122 112 L112 146 M152 112 L146 146 M182 112 L180 146 M218 112 L220 146 M248 112 L254 146 M278 112 L288 146" />
        <path d="M112 248 L112 158 L288 158 L288 248" />
        <path d="M112 166 H288 M112 174 H288 M112 182 H288 M112 190 H288 M112 198 H288" />
        <path d="M130 248 v-38 M150 248 v-30 l10 -8 v38 M240 248 v-34 h22 v34 M200 218 h20" />
        <path d="M20 252 H380 M30 266 H372" />
        <path d="M300 266 v-26 h22 v26 M296 240 h30" />
        <path d="M44 250 q-6 -24 6 -36 q10 12 4 36 M48 214 q-12 -6 -14 -18 M52 216 q10 -10 22 -10" />
        <path d="M338 150 h18 v30 h-18 z M342 158 h10 M342 166 h8" />
      </>
    ),
  },
  'street-corner': {
    label: 'A corner building with two faces receding, and a street turning out of sight',
    wash: (
      <>
        <W c="ochre" d="M168 46 L262 82 L262 236 L168 254 Z" o={0.35} />
        <W c="blue" d="M168 46 L60 84 L60 238 L168 254 Z" o={0.4} />
        <W c="grey" d="M0 270 L400 270 L400 300 L0 300 Z" o={0.25} />
      </>
    ),
    lines: (
      <>
        <path d="M168 40 L168 256" strokeWidth="2.2" />
        <path d="M168 40 L262 78 L262 238 M168 40 L60 80 L60 240" />
        <path d="M168 256 L262 238 M168 256 L60 240" />
        <path d="M168 92 L262 116 M168 144 L262 156 M168 196 L262 198" opacity=".6" />
        <path d="M168 92 L60 118 M168 144 L60 158 M168 196 L60 200" opacity=".6" />
        <path d="M184 104 v24 h14 v-21 M216 112 v22 h14 v-19 M184 156 v24 h14 v-23 M216 160 v22 h14 v-21" />
        <path d="M140 106 v24 h-14 v-21 M108 114 v22 h-14 v-19 M140 160 v24 h-14 v-23 M108 166 v22 h-14 v-21" />
        <path d="M188 252 v-36 h22 v32" />
        <path d="M262 100 L300 112 L300 232 L262 238 M300 132 L330 140 L330 228 L300 232 M330 150 L350 156 L350 224" opacity=".75" />
        <path d="M60 104 L30 114 L30 236 M30 128 L8 136" opacity=".75" />
        <path d="M0 268 L120 250 M400 268 L262 244 M170 300 L172 262" />
        <path d="M350 218 h30" opacity=".5" />
        <circle cx="236" cy="226" r="4" />
        <path d="M236 230 v14 M230 236 h12 M236 244 l-5 10 M236 244 l5 10" />
      </>
    ),
  },
  balcony: {
    label: 'A quiet balcony with a railing, a folded chair and potted plants, seen from below',
    wash: (
      <>
        <W c="sage" d="M120 70 L280 70 L280 180 L120 180 Z" o={0.28} />
        <W c="terra" d="M150 132 q8 -10 18 0 l-2 22 h-14 z M238 128 h20 l-3 26 h-14 z" o={0.6} />
        <W c="grey" d="M80 196 L320 196 L304 214 L96 214 Z" o={0.45} />
      </>
    ),
    lines: (
      <>
        <path d="M40 20 V280 M360 20 V280" opacity=".35" />
        <path d="M140 40 h120 v140 h-120 z M200 40 v140" />
        <path d="M150 54 h40 v40 h-40 z M210 54 h40 v40 h-40 z" opacity=".6" />
        <path d="M80 190 H320 L304 214 H96 Z" />
        <path d="M96 214 L100 226 H300 L304 214" opacity=".6" />
        <path d="M84 120 H316 M84 190 V120 M316 190 V120" />
        <path d="M104 120 V190 M124 120 V190 M144 120 V190 M164 120 V190 M184 120 V190 M204 120 V190 M224 120 V190 M244 120 V190 M264 120 V190 M284 120 V190 M304 120 V190" opacity=".85" />
        <path d="M84 132 H316" opacity=".5" />
        <path d="M150 132 q8 -10 18 0 l-2 22 h-14 z M159 124 q-10 -16 -2 -30 M159 124 q8 -20 20 -22 M159 126 q-14 -6 -20 -18" />
        <path d="M238 128 h20 l-3 26 h-14 z M248 128 q0 -20 10 -30 M248 126 q-6 -16 -18 -20" />
        <path d="M196 188 l12 -46 M214 188 l-12 -46 M198 160 h16" />
        <path d="M40 240 q80 22 160 8 q80 -14 160 8" opacity=".7" />
        <path d="M86 244 v20 h22 v-18 M128 250 l6 22 l14 -4 l-4 -18 M260 246 v24 h16 v-22" opacity=".8" />
      </>
    ),
  },
  door: {
    label: 'A tall painted door in a plain wall, with a step, a lantern and a pot',
    wash: (
      <>
        <W c="blue" d="M156 70 L246 70 L246 246 L156 246 Z" o={0.6} />
        <W c="grey" d="M156 70 L246 70 L236 82 L166 82 Z M156 70 L166 82 L166 246 L156 246 Z" o={0.6} />
        <W c="terra" d="M282 222 h32 l-4 26 h-24 z" o={0.6} />
      </>
    ),
    lines: (
      <>
        <path d="M144 58 h114 v190 M144 58 v190" />
        <path d="M156 70 h90 v178 M156 70 v178" />
        <path d="M156 70 L166 82 V248 M246 70 L236 82" opacity=".6" />
        <path d="M201 82 V248" />
        <path d="M176 100 h16 v50 h-16 z M210 100 h16 v50 h-16 z M176 172 h16 v54 h-16 z M210 172 h16 v54 h-16 z" opacity=".7" />
        <circle cx="194" cy="164" r="3" />
        <circle cx="208" cy="164" r="3" />
        <path d="M126 248 h150 l8 12 H118 Z M108 272 H292" />
        <path d="M110 92 q0 -10 10 -10 v-8 M112 96 h16 l-2 22 h-12 z M120 118 v6" />
        <path d="M282 222 h32 l-4 26 h-24 z M298 222 q-4 -22 6 -34 M298 222 q-10 -14 -22 -14 M300 220 q12 -10 18 -24" />
        <path d="M30 40 H370" opacity=".3" />
      </>
    ),
  },
  'tea-stall': {
    label: 'A small tea stall under a sloping tarpaulin, with a kettle, glasses and stools',
    wash: (
      <>
        <W c="blue" d="M60 64 L340 44 L346 84 L54 104 Z" o={0.5} />
        <W c="ochre" d="M96 160 L300 160 L300 214 L96 214 Z" o={0.4} />
        <W c="grey" d="M80 250 L320 250 L330 282 L70 282 Z" o={0.3} />
      </>
    ),
    lines: (
      <>
        <path d="M60 64 L340 44 L346 84 L54 104 Z" />
        <path d="M54 104 q8 6 16 0 M120 100 q4 8 2 14 M200 94 q4 8 2 14 M280 88 q4 8 2 14" opacity=".7" />
        <path d="M80 104 V250 M320 86 V250" />
        <path d="M90 160 H306 V214 H90 Z M90 168 H306" />
        <path d="M150 160 v-26 q0 -10 14 -10 h14 q14 0 14 10 v26 M164 124 v-8 h14 v8 M192 138 q20 -4 22 -20" />
        <path d="M170 104 q-8 -10 0 -18 q8 -8 0 -16 M184 100 q-6 -8 0 -14" opacity=".6" />
        <path d="M118 160 v-14 h10 v14 M132 160 v-14 h10 v14 M230 160 v-18 h12 v18 M250 160 v-16 h10 v16" />
        <path d="M262 124 h30 v22 h-30 z M266 124 v-6 h22 v6" opacity=".8" />
        <path d="M110 250 v-34 M150 250 v-34 M106 216 h48 M248 250 l6 -28 h28 l6 28 M254 222 h28" />
        <path d="M30 250 H370" />
        <path d="M150 262 v14 M180 258 v24 M220 262 v16 M260 258 v20" opacity=".45" />
      </>
    ),
  },
  'cafe-table': {
    label: 'A café table and two chairs next to a bright window, with a cup on the table',
    wash: (
      <>
        <W c="ochre" d="M40 30 L360 30 L360 270 L40 270 Z" o={0.18} />
        <W c="terra" d="M188 168 h24 l-2 16 h-20 z" o={0.7} />
        <W c="grey" d="M130 262 q70 -14 140 0 q-70 14 -140 0" o={0.45} />
      </>
    ),
    lines: (
      <>
        <path d="M120 30 h170 v120 h-170 z M205 30 v120 M120 90 h170" />
        <path d="M110 150 h190" />
        <ellipse cx="200" cy="184" rx="78" ry="16" />
        <path d="M200 200 V258 M176 262 h48" />
        <path d="M188 170 h24 l-2 14 h-20 z M212 174 q8 0 6 6 q-2 4 -8 3" />
        <path d="M196 164 q-4 -8 2 -14 M206 164 q-4 -8 2 -14" opacity=".5" />
        <path d="M86 140 q4 -10 14 -10 q10 0 12 10 l6 68 M90 208 h46 M94 208 l-6 56 M132 208 l4 56 M86 140 l4 68" />
        <path d="M314 140 q-4 -10 -14 -10 q-10 0 -12 10 l-6 68 M310 208 h-46 M306 208 l6 56 M268 208 l-4 56 M314 140 l-4 68" />
        <path d="M20 270 H380" />
        <path d="M232 178 l20 -4 l2 4" opacity=".6" />
      </>
    ),
  },
  'tree-bench': {
    label: 'A park bench in the shade of a spreading tree',
    wash: (
      <>
        <W c="sage" d="M70 120 q-30 -40 10 -70 q30 -40 90 -30 q50 -24 100 6 q60 10 60 60 q20 40 -30 60 q-40 30 -100 14 q-60 16 -100 -8 q-40 -6 -30 -32 z" o={0.6} />
        <W c="blue" d="M60 252 q140 -26 300 0 q-150 26 -300 0" o={0.4} />
      </>
    ),
    lines: (
      <>
        <path d="M70 120 q-30 -40 10 -70 q30 -40 90 -30 q50 -24 100 6 q60 10 60 60 q20 40 -30 60 q-40 30 -100 14 q-60 16 -100 -8 q-40 -6 -30 -32" />
        <path d="M196 254 q-6 -60 -2 -110 M212 254 q4 -60 -4 -110 M196 150 q-30 -20 -60 -26 M208 146 q30 -24 56 -30 M200 160 q0 -30 -8 -56" />
        <path d="M110 214 h120 M110 222 h120 M110 230 h120 M116 230 v22 M224 230 v22 M120 214 v-26 h104 v26" />
        <path d="M120 196 h104 M120 204 h104" opacity=".6" />
        <path d="M20 256 H380" />
        <path d="M290 256 v-80 M282 176 h16 l-4 -14 h-8 z" opacity=".7" />
        <path d="M300 230 q6 -6 12 0 M318 238 q6 -6 12 0" opacity=".5" />
      </>
    ),
  },
  'tree-wall': {
    label: 'A bare tree against a plain wall, with the shadow of its branches on the wall',
    wash: (
      <>
        <W c="ochre" d="M30 60 L370 60 L370 250 L30 250 Z" o={0.3} />
      </>
    ),
    lines: (
      <>
        <path d="M30 60 H370 M24 52 H376 M30 60 V250 M370 60 V250" />
        <path d="M14 250 H386" />
        <path d="M150 250 q-4 -60 0 -110 M164 250 q6 -60 0 -110" strokeWidth="2.2" />
        <path d="M152 146 q-30 -30 -70 -40 M160 140 q10 -40 -6 -96 M162 146 q30 -30 66 -40 M106 112 q-10 -20 -30 -26 M156 92 q14 -20 30 -24 M212 110 q16 -14 38 -12 M120 120 q-24 0 -40 10" />
        <path d="M80 106 l-14 -6 M76 86 l-10 -10 M186 68 l8 -12 M250 98 l14 -4" />
        <path d="M230 250 q14 -50 36 -80 q18 -24 48 -38 M262 178 q20 -10 44 -6 M282 152 q10 -20 6 -40 M300 140 q22 -4 40 6" stroke="var(--wash-blue)" strokeWidth="5" opacity=".55" />
        <path d="M300 120 h40 v60 h-40 z M320 120 v60" opacity=".6" />
        <path d="M100 250 q10 -6 20 0 M190 250 q10 -6 20 0" opacity=".5" />
      </>
    ),
  },
  cup: {
    label: 'A cup and saucer resting on a closed book',
    wash: (
      <>
        <W c="terra" d="M90 196 L300 176 L330 214 L118 240 Z" o={0.45} />
        <W c="blue" d="M164 112 L236 112 L230 174 Q200 186 170 174 Z" o={0.4} />
      </>
    ),
    lines: (
      <>
        <path d="M90 196 L300 176 L330 214 L118 240 Z M118 240 V252 L330 226 V214 M90 196 V208 L118 252" />
        <path d="M124 244 L326 220" opacity=".5" />
        <ellipse cx="200" cy="178" rx="66" ry="14" />
        <ellipse cx="200" cy="112" rx="36" ry="8" />
        <path d="M164 112 L170 170 Q200 182 230 170 L236 112" />
        <path d="M234 124 q26 -2 24 18 q-2 16 -26 18" />
        <path d="M190 96 q-8 -12 0 -24 q8 -12 0 -24 M210 98 q-6 -10 0 -20" opacity=".55" />
        <path d="M40 262 H360" opacity=".4" />
      </>
    ),
  },
  books: {
    label: 'A stack of books with a pair of glasses resting on top',
    wash: (
      <>
        <W c="terra" d="M110 200 L290 200 L290 236 L110 236 Z" o={0.5} />
        <W c="blue" d="M124 166 L280 160 L282 196 L126 202 Z" o={0.5} />
        <W c="ochre" d="M120 132 L270 138 L268 162 L118 156 Z" o={0.6} />
      </>
    ),
    lines: (
      <>
        <path d="M110 200 H290 V236 H110 Z M110 206 H290" />
        <path d="M124 166 L280 160 L282 196 L126 202 Z M126 172 L280 166" />
        <path d="M120 132 L270 138 L268 162 L118 156 Z" />
        <path d="M140 108 L250 104 L252 132 L142 136 Z M144 114 L250 110" opacity=".85" />
        <path d="M160 140 L170 154 M240 146 L236 160" opacity=".5" />
        <ellipse cx="172" cy="92" rx="18" ry="10" />
        <ellipse cx="222" cy="90" rx="18" ry="10" />
        <path d="M190 92 q6 -6 14 -2 M154 90 l-20 6 M240 88 l18 6" />
        <path d="M60 238 H340" />
        <path d="M120 248 q80 8 170 0" opacity=".4" />
      </>
    ),
  },
  bottles: {
    label: 'Three bottles of different heights grouped on a table',
    wash: (
      <>
        <W c="sage" d="M150 70 h20 v40 q24 14 24 40 v100 h-68 v-100 q0 -26 24 -40 z" o={0.5} />
        <W c="ochre" d="M210 150 h18 v20 q22 8 22 26 v54 h-62 v-54 q0 -18 22 -26 z" o={0.55} />
        <W c="blue" d="M108 120 h14 v30 q14 10 14 26 v74 h-42 v-74 q0 -16 14 -26 z" o={0.45} />
      </>
    ),
    lines: (
      <>
        <path d="M150 64 h20 v46 q24 14 24 40 v100 h-68 v-100 q0 -26 24 -40 z M148 64 h24" />
        <path d="M210 144 h18 v26 q22 8 22 26 v54 h-62 v-54 q0 -18 22 -26 z M208 144 h22" />
        <path d="M108 112 h14 v38 q14 10 14 26 v74 h-42 v-74 q0 -16 14 -26 z" />
        <path d="M136 170 v60 M246 200 v34" opacity=".5" />
        <path d="M200 194 h40 v24 h-40 z" opacity=".5" />
        <path d="M40 250 H360" />
        <path d="M194 250 q60 10 110 0 M90 250 q-30 6 -50 0" opacity=".4" />
      </>
    ),
  },
  'plant-window': {
    label: 'A window with plants in mismatched pots along the sill',
    wash: (
      <>
        <W c="blue" d="M110 50 L290 50 L290 200 L110 200 Z" o={0.22} />
        <W c="sage" d="M120 196 q-10 -40 10 -60 q20 10 16 60 z M180 196 q-20 -50 20 -90 q30 30 10 90 z M250 196 q-6 -30 16 -46 q16 20 4 46 z" o={0.65} />
        <W c="terra" d="M118 196 h32 l-4 26 h-24 z M178 196 h46 l-6 32 h-34 z M246 196 h30 l-4 22 h-22 z" o={0.6} />
      </>
    ),
    lines: (
      <>
        <path d="M100 40 h200 v170 h-200 z M110 50 h180 v150 h-180 z M200 50 v150 M110 124 h180" />
        <path d="M86 210 h228 v10 h-228 z" />
        <path d="M118 196 h32 l-4 26 h-24 z M134 196 q-14 -30 -6 -56 M134 196 q8 -30 4 -50 M134 170 q-14 -6 -20 -16" />
        <path d="M178 196 h46 l-6 32 h-34 z M200 196 q-16 -40 0 -80 M200 196 q24 -36 12 -70 M200 150 q-20 -14 -24 -30 M204 140 q16 -10 22 -24" />
        <path d="M246 196 h30 l-4 22 h-22 z M260 196 q-2 -24 8 -40 M262 196 q10 18 26 30 q6 12 2 30" />
        <path d="M100 40 q-20 60 -6 170 M300 40 q20 60 6 170" opacity=".4" />
      </>
    ),
  },
  rooftops: {
    label: 'Flat rooftops with water tanks, a stair hut and a washing line',
    wash: (
      <>
        <W c="ochre" d="M20 150 L180 136 L180 280 L20 280 Z" o={0.35} />
        <W c="terra" d="M180 120 L380 140 L380 280 L180 280 Z" o={0.3} />
        <W c="blue" d="M0 0 L400 0 L400 110 L0 110 Z" o={0.15} />
      </>
    ),
    lines: (
      <>
        <path d="M20 150 L180 136 L180 280 M20 150 V280 M20 158 L180 144" />
        <path d="M180 120 L380 140 V280 M180 128 L380 148" />
        <path d="M60 148 v-30 q0 -10 22 -10 q22 0 22 10 v30 M60 118 q22 8 44 0" />
        <path d="M230 124 v-44 h50 v48 M226 80 h58 M244 128 v-28 h20 v30" />
        <path d="M320 134 v-22 q0 -8 18 -8 q18 0 18 8 v26 M320 112 q18 6 36 0" />
        <path d="M120 140 q40 10 80 -6" opacity=".6" />
        <path d="M134 140 v12 h8 v-10 M160 138 v14 h10 v-14 M182 136 l2 12" opacity=".6" />
        <path d="M30 200 h20 v20 h-20 z M80 196 h20 v20 h-20 z M210 180 h20 v22 h-20 z M260 186 h20 v22 h-20 z M320 192 h20 v22 h-20 z" opacity=".55" />
        <path d="M300 60 l10 -6 l10 6 M120 50 l8 -5 l8 5" opacity=".5" />
      </>
    ),
  },
  arch: {
    label: 'A deep archway framing a bright courtyard with a tree beyond',
    wash: (
      <>
        <W c="grey" d="M60 280 V110 Q60 30 200 30 Q340 30 340 110 V280 H300 V120 Q300 70 200 70 Q100 70 100 120 V280 Z" o={0.6} />
        <W c="sage" d="M180 140 q-20 -30 10 -40 q30 -10 30 20 q10 20 -10 26 z" o={0.6} />
        <W c="ochre" d="M100 280 V120 Q100 70 200 70 Q300 70 300 120 V280 Z" o={0.2} />
      </>
    ),
    lines: (
      <>
        <path d="M60 280 V110 Q60 30 200 30 Q340 30 340 110 V280" />
        <path d="M100 280 V120 Q100 70 200 70 Q300 70 300 120 V280" />
        <path d="M60 110 L100 120 M340 110 L300 120" opacity=".6" />
        <path d="M100 236 L300 236" opacity=".7" />
        <path d="M200 236 v-80 M180 140 q-20 -30 10 -40 q30 -10 30 20 q10 20 -10 26" />
        <path d="M120 236 v-60 h40 v60 M240 236 v-50 h36 v50" opacity=".5" />
        <path d="M60 280 L100 236 M340 280 L300 236" />
        <path d="M80 60 l10 6 M320 60 l-10 6 M70 84 l14 4 M330 84 l-14 4" opacity=".5" />
      </>
    ),
  },
  stairs: {
    label: 'A short flight of stone steps rising to a doorway',
    wash: (
      <>
        <W c="grey" d="M170 40 h60 v80 h-60 z" o={0.7} />
        <W c="ochre" d="M110 270 L290 270 L250 120 L150 120 Z" o={0.3} />
      </>
    ),
    lines: (
      <>
        <path d="M156 30 h88 v90 M156 30 v90 M170 40 h60 v80 M170 40 v80" />
        <path d="M140 120 H260" />
        <path d="M150 120 L110 270 M250 120 L290 270" />
        <path d="M146 136 H254 M141 154 H259 M135 174 H265 M128 196 H272 M120 220 H280 M112 246 H288 M106 270 H294" />
        <path d="M146 136 v6 M254 136 v6 M141 154 v7 M259 154 v7 M135 174 v8 M265 174 v8 M128 196 v9 M272 196 v9" opacity=".4" />
        <path d="M84 270 V140 M316 270 V140 M84 140 L150 112 M316 140 L250 112" opacity=".7" />
        <path d="M120 284 q6 -6 12 0 M140 286 q6 -6 12 0 M260 284 q6 -6 12 0" opacity=".6" />
        <path d="M200 40 v-10 M194 58 q6 -10 12 0 v12 h-12 z" opacity=".6" />
      </>
    ),
  },
  'lamp-post': {
    label: 'Lamp posts receding along a street, with overhead wires',
    wash: (
      <>
        <W c="blue" d="M0 0 H400 V180 H0 Z" o={0.14} />
        <W c="grey" d="M0 200 L400 200 L400 300 L0 300 Z" o={0.22} />
      </>
    ),
    lines: (
      <>
        <path d="M0 196 H400" opacity=".5" />
        <path d="M60 280 V40 M60 40 q0 -10 14 -10 h26 M96 30 l-6 14 h20 l-6 -14" strokeWidth="2.2" />
        <path d="M170 236 V100 M170 100 q0 -6 8 -6 h14 M188 94 l-3 8 h10 l-3 -8" />
        <path d="M232 216 V136 M232 136 q0 -4 5 -4 h8 M243 132 l-2 5 h6 l-2 -5" />
        <path d="M268 206 V156 M268 156 h8" />
        <path d="M290 200 V172" />
        <path d="M0 60 q60 40 170 50 q50 4 62 26 q20 10 36 20 M0 90 q80 20 170 30 q40 6 62 18" opacity=".8" />
        <path d="M0 290 L300 198 M400 260 L300 198" />
        <path d="M320 196 v-40 h40 v40 M330 166 h20 M360 196 v-30 h30 v30" opacity=".5" />
      </>
    ),
  },
  bicycle: {
    label: 'A bicycle leaning against a wall',
    wash: (
      <>
        <W c="ochre" d="M20 40 H380 V230 H20 Z" o={0.22} />
        <W c="grey" d="M80 254 q120 -18 260 0 q-130 16 -260 0" o={0.4} />
        <W c="terra" d="M150 180 L200 120 L262 120 L236 180 Z" o={0.25} />
      </>
    ),
    lines: (
      <>
        <path d="M20 230 H380" />
        <circle cx="120" cy="196" r="52" />
        <circle cx="290" cy="196" r="52" />
        <circle cx="120" cy="196" r="4" />
        <circle cx="290" cy="196" r="4" />
        <path d="M120 196 L196 196 L170 124 M196 196 L262 124 L170 124 M262 124 L290 196 M170 124 L120 196" strokeWidth="2" />
        <path d="M164 112 h24 M170 124 l-4 -12 M262 124 l-6 -20 h-14 M256 104 l18 -4" />
        <circle cx="196" cy="196" r="10" />
        <path d="M196 196 l12 14 h8" />
        <path d="M60 80 h60 v40 h-60 z" opacity=".35" />
      </>
    ),
  },
  kettle: {
    label: 'A metal kettle on a gas stove, with a small tumbler beside it',
    wash: (
      <>
        <W c="grey" d="M140 210 q-20 -70 30 -100 h60 q50 30 30 100 z" o={0.4} />
        <W c="blue" d="M70 220 H330 V250 H70 Z" o={0.35} />
      </>
    ),
    lines: (
      <>
        <path d="M140 210 q-20 -70 30 -100 h60 q50 30 30 100 z" />
        <ellipse cx="200" cy="110" rx="30" ry="6" />
        <path d="M188 104 q12 -12 24 0" />
        <path d="M150 140 q-60 -10 -66 -40 l12 0 q10 24 58 22" />
        <path d="M168 92 q32 -40 64 0" strokeWidth="2" />
        <path d="M232 140 q10 30 0 60" opacity=".5" />
        <path d="M70 220 H330 V250 H70 Z M110 220 l10 -8 h160 l10 8" />
        <path d="M120 212 v-6 M280 212 v-6 M200 212 v-6" opacity=".7" />
        <path d="M290 220 v-34 h28 v34 M290 186 h28" />
        <path d="M110 70 q-6 -10 0 -20 q6 -10 0 -20" opacity=".45" />
        <path d="M30 40 V200 M60 40 V200 M30 70 H90 M30 110 H90 M30 150 H90" opacity=".25" />
      </>
    ),
  },
  chair: {
    label: 'A single wooden chair in a room, its long shadow stretching across the floor',
    wash: (
      <>
        <W c="blue" d="M180 236 L330 260 L370 230 L250 214 Z" o={0.45} />
        <W c="ochre" d="M0 0 H400 V200 H0 Z" o={0.15} />
      </>
    ),
    lines: (
      <>
        <path d="M130 70 h70 v100" />
        <path d="M130 70 v100 M136 90 h58 M136 110 h58" />
        <path d="M118 170 L210 170 L240 186 L148 186 Z" />
        <path d="M118 170 v80 M148 186 v74 M240 186 v66 M210 170 v60" />
        <path d="M0 200 H400" opacity=".4" />
        <path d="M260 40 h90 v110 h-90 z M305 40 v110 M260 95 h90" opacity=".5" />
        <path d="M180 236 L330 260 L370 230 L250 214 Z" opacity=".35" />
      </>
    ),
  },
  'grille-shadow': {
    label: 'A window grille and its stretched patterned shadow on the floor',
    wash: (
      <>
        <W c="ochre" d="M120 40 H280 V170 H120 Z" o={0.35} />
        <W c="blue" d="M40 220 L360 220 L380 290 L20 290 Z" o={0.18} />
      </>
    ),
    lines: (
      <>
        <path d="M110 30 h180 v150 h-180 z M120 40 h160 v130 h-160 z" />
        <path d="M160 40 v130 M200 40 v130 M240 40 v130 M120 83 h160 M120 126 h160" />
        <path d="M180 61 l20 -21 l20 21 l-20 22 z M180 147 l20 -21 l20 21 l-20 23 z" opacity=".8" />
        <path d="M60 200 H340" opacity=".5" />
        <path d="M90 230 L310 230 L360 286 L40 286 Z" stroke="var(--wash-grey)" strokeWidth="3" />
        <path d="M150 230 L126 286 M200 230 L200 286 M250 230 L274 286 M74 249 H326 M58 268 H342" stroke="var(--wash-grey)" strokeWidth="5" opacity=".8" />
        <path d="M90 230 L310 230" opacity=".5" />
      </>
    ),
  },
  'old-building': {
    label: 'An old façade with rows of windows, a cornice and evening light on the upper floors',
    wash: (
      <>
        <W c="ochre" d="M100 40 H300 V150 H100 Z" o={0.55} />
        <W c="blue" d="M100 150 H300 V268 H100 Z" o={0.4} />
      </>
    ),
    lines: (
      <>
        <path d="M100 268 V40 H300 V268" />
        <path d="M92 40 H308 M94 50 H306 M96 34 h208" />
        <path d="M100 150 H300" strokeDasharray="4 6" opacity=".6" />
        <path d="M120 66 h24 v40 h-24 z M188 66 h24 v40 h-24 z M256 66 h24 v40 h-24 z" />
        <path d="M120 66 q12 -14 24 0 M188 66 q12 -14 24 0 M256 66 q12 -14 24 0" />
        <path d="M120 126 h24 v40 h-24 z M188 126 h24 v40 h-24 z M256 126 h24 v40 h-24 z" />
        <path d="M114 166 h36 M182 166 h36 M250 166 h36" />
        <path d="M120 196 h24 v40 h-24 z M256 196 h24 v40 h-24 z M182 268 v-60 q18 -20 36 0 v60" />
        <path d="M100 186 H300" opacity=".5" />
        <path d="M30 268 H370" />
        <path d="M30 268 V120 H100 M300 150 H360 V268" opacity=".45" />
        <path d="M40 140 h20 v26 h-20 z M318 170 h24 v26 h-24 z" opacity=".35" />
      </>
    ),
  },
  'colour-masses': {
    label: 'Three overlapping watercolour masses in ochre, blue and green',
    wash: (
      <>
        <W c="ochre" d="M60 170 q-20 -80 60 -110 q80 -30 120 30 q30 60 -30 100 q-90 40 -150 -20 z" o={0.75} />
        <W c="blue" d="M190 120 q40 -70 120 -40 q70 40 40 110 q-30 60 -110 40 q-70 -30 -50 -110 z" o={0.6} />
        <W c="sage" d="M130 220 q10 -50 80 -50 q80 0 90 50 q-10 50 -90 50 q-80 0 -80 -50 z" o={0.65} />
      </>
    ),
    lines: (
      <>
        <path d="M40 270 H360" opacity=".25" />
        <path d="M300 60 l10 -10 M312 70 l14 -6" opacity=".35" />
      </>
    ),
  },
};

export const illustrationLabel = (id: ReferenceId) => SCENES[id].label;

export function Illustration({ id, className, decorative }: { id: ReferenceId; className?: string; decorative?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const scene = SCENES[id];
  return (
    <svg
      viewBox="0 0 400 300"
      className={`illustration ${className ?? ''}`}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : scene.label}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id={`wobble-${uid}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="2.4" />
        </filter>
        <filter id={`bleed-${uid}`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="8" />
          <feDisplacementMap in="SourceGraphic" scale="9" />
        </filter>
      </defs>
      {scene.wash && (
        <g filter={`url(#bleed-${uid})`} transform="translate(4 3)">
          {scene.wash}
        </g>
      )}
      <g
        filter={`url(#wobble-${uid})`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {scene.lines}
      </g>
    </svg>
  );
}
