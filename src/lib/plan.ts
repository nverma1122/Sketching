import type { Medium, SketchPrompt, Suggestion, TimeKey } from '../data/types';
import { CLOSING_LINES, TIME_ORDER, mediumInfo } from '../data/taxonomy';
import { hashString } from './random';

export interface PlanStep {
  label: string;
  text: string;
}

export interface BuiltSuggestion {
  prompt: SketchPrompt;
  time: TimeKey;
  medium: Medium;
  simplified: number;
  /** Shown above the plan when simplified. */
  focus?: string;
  composition: string[];
  plan: PlanStep[];
  mediumGuidance: string[];
  mediumNote?: string;
  constraint: string;
  closing: string;
}

const FINISH: Record<Medium, string> = {
  ink: 'Finish with a few purposeful marks — one or two dark accents — then stop.',
  'ink-wash': 'Sweep one quick, pale wash across the shadow side, then stop.',
  watercolour: 'Drop in one darker accent while the paper is still damp, then stop.',
  pencil: 'Press a little harder for the single darkest accent, then stop.',
  hatching: 'Hatch the one darkest shadow shape, then stop.',
};

const TONE: Record<Medium, string> = {
  ink: 'Vary your line weight: strengthen edges in shadow and where forms overlap.',
  'ink-wash': 'Lay your two or three transparent washes, keeping the white of the paper for the lights.',
  watercolour: 'Add the middle values over the dry first wash, keeping the warm and cool areas distinct.',
  pencil: 'Group the tones into light, middle and dark masses with the side of the lead.',
  hatching: 'Hatch the shadow shapes, keeping the light direction consistent.',
};

const SHADOW_PATTERN: Record<Medium, string> = {
  ink: 'Look for the shadow pattern and describe it with a few selective areas of hatching.',
  'ink-wash': 'Map the shadow pattern with a single cool wash that crosses several objects.',
  watercolour: 'Glaze the shadow pattern as one connected cool shape.',
  pencil: 'Block in the shadow pattern as one connected mid-tone.',
  hatching: 'Build the shadow pattern in layers — one direction first, a second only for the darkest.',
};

const OPENING: Record<Medium, string> = {
  ink: 'Look before you draw: find the largest shapes and decide where the page will stay empty.',
  'ink-wash': 'Look first: choose the two or three areas that will receive colour later.',
  watercolour: 'Look first: find the large colour masses and the lightest areas to protect.',
  pencil: 'Look first: check proportions with your pencil held at arm’s length.',
  hatching: 'Look first: decide where the light comes from and where the main shadow shapes fall.',
};

const join = (parts: (string | undefined)[]) => parts.filter(Boolean).join(' ');

/** Lower the time by `steps` positions, never below 5 minutes. */
export function shorterTime(t: TimeKey, steps: number): TimeKey {
  return TIME_ORDER[Math.max(0, TIME_ORDER.indexOf(t) - steps)];
}

export function buildPlan(prompt: SketchPrompt, time: TimeKey, medium: Medium, simplified = 0): PlanStep[] {
  // Simpler versions keep fewer of the subject-specific steps.
  const keep = Math.max(2, prompt.steps.length - simplified * 2);
  const s = prompt.steps.slice(0, keep);
  const colourFirst = medium === 'watercolour';
  const at = (i: number) => s[i];

  switch (time) {
    case '5':
      return [
        { label: 'Minute 1', text: colourFirst ? 'Identify the two or three largest colour shapes.' : 'Identify the largest shapes.' },
        { label: 'Minutes 2–3', text: join([at(0), at(1)]) },
        { label: 'Minute 4', text: at(2) ? `${at(2)} Two or three defining details are enough.` : 'Add two or three defining details.' },
        { label: 'Minute 5', text: FINISH[medium] },
      ];
    case '10':
      return [
        { label: 'Minutes 1–2', text: join([OPENING[medium], colourFirst ? undefined : at(0)]) },
        { label: 'Minutes 3–5', text: colourFirst ? join(['Lay the big colour masses, lightest first.', at(0)]) : join([at(1), at(2)]) },
        { label: 'Minutes 6–8', text: colourFirst ? join([at(1), at(2)]) : at(3) ?? 'Add only the essential details.' },
        { label: 'Minutes 9–10', text: medium === 'ink' || medium === 'hatching' ? 'Add selective shading where it helps the form read.' : FINISH[medium] },
      ];
    case '20':
      return [
        { label: 'Minutes 1–3', text: join([OPENING[medium], 'Place the main shapes lightly and check proportions.']) },
        { label: 'Minutes 4–8', text: colourFirst ? join(['Lay the first large washes, protecting the lights.', at(0)]) : join(['Build the structure:', at(0), at(1)]) },
        { label: 'Minutes 9–13', text: join([colourFirst ? at(1) : undefined, at(2), at(3) ?? 'Develop the foreground.']) },
        { label: 'Minutes 14–17', text: TONE[medium] },
        { label: 'Minutes 18–20', text: join([at(4), 'Optional: a little more tonal work — or step back and leave it.']) },
      ];
    case '40':
      return [
        { label: 'Minutes 1–5', text: join([OPENING[medium], 'If it helps, make a thumbnail to settle the composition.']) },
        { label: 'Minutes 5–12', text: colourFirst ? join(['Lay the large colour masses and their values.', at(0)]) : join(['Construct the main forms:', at(0), at(1)]) },
        { label: 'Minutes 12–20', text: join([colourFirst ? at(1) : undefined, at(2), at(3)]) || 'Develop the main forms.' },
        { label: 'Minutes 20–28', text: SHADOW_PATTERN[medium] },
        {
          label: 'Minutes 28–36',
          text: join([
            at(4) ?? 'Add a few secondary details.',
            medium === 'ink-wash' || medium === 'watercolour'
              ? 'Keep to a restrained colour plan — two or three related colours.'
              : TONE[medium],
          ]),
        },
        { label: 'Minutes 36–45', text: 'Unify: strengthen the focal point, soften anything competing with it, and stop while it still feels fresh.' },
      ];
  }
}

export function buildSuggestion(prompt: SketchPrompt, sug: Pick<Suggestion, 'time' | 'medium' | 'simplified' | 'createdAt'>): BuiltSuggestion {
  const { medium, simplified } = sug;
  const time = simplified > 0 ? shorterTime(sug.time, simplified) : sug.time;
  const info = mediumInfo(medium);
  const closing = CLOSING_LINES[hashString(prompt.id + sug.createdAt) % CLOSING_LINES.length];
  return {
    prompt,
    time,
    medium,
    simplified,
    focus: simplified > 0 ? prompt.simpler : undefined,
    composition: simplified > 0 ? prompt.composition.slice(0, 2) : prompt.composition,
    plan: buildPlan(prompt, time, medium, simplified),
    mediumGuidance: simplified > 0 ? info.guidance.slice(0, 2) : info.guidance,
    mediumNote: prompt.mediumNotes?.[medium],
    constraint: simplified > 0 ? info.easyConstraints[(simplified - 1) % info.easyConstraints.length] : prompt.constraint,
    closing,
  };
}

export const MAX_SIMPLIFY = 2;
