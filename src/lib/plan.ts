import type { Level, Medium, SketchPrompt, Suggestion, TimeKey } from '../data/types';
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

/** Openings for advanced work: construction before marks. */
const ADV_OPENING: Record<Medium, string> = {
  ink: 'Fix the eye level and vanishing points, sight-size the two or three governing proportions, then commit with the pen.',
  'ink-wash': 'Construct eye level and vanishing points, and plan the wash sequence — which areas, in which order.',
  watercolour: 'Plan the passes: protected lights, first big wash, mid-value glaze, darks. Construct the perspective lightly.',
  pencil: 'Construct eye level and vanishing points, then measure the key proportions by sight-size.',
  hatching: 'Fix the light direction and the perspective construction before a single hatch.',
};

const EDGES: Record<Medium, string> = {
  ink: 'Edge control: break lines where light hits a form; reserve your heaviest line for the focal plane.',
  'ink-wash': 'Edge control: soften wash edges away from the focal point and keep them crisp at it.',
  watercolour: 'Edge control: lose edges into neighbouring shapes of similar value; find hard edges only at the focal point.',
  pencil: 'Edge control: blend edges that turn away from you; sharpen only at the centre of interest.',
  hatching: 'Edge control: let hatching stop short of the light side so forms dissolve into the paper.',
};

/** Extra guidance shown for advanced level or demanding ideas. */
const ADV_GUIDANCE: Record<Medium, string[]> = {
  ink: [
    'Use three line weights deliberately: structure, form, accent.',
    'Let figures and secondary objects stay as broken contour; resolve fully only at the focal point.',
  ],
  'ink-wash': [
    'Unify the shadow side of the whole scene with one wash that crosses many objects.',
    'Keep colour temperature consistent: warm light, cool shadow, with reflected warmth inside the shadows.',
  ],
  watercolour: [
    'Limit yourself to three passes: big light wash, mid-value glaze, darks and accents.',
    'Design your edges: soft for atmosphere and distance, hard for the focal point and sunlit edges.',
  ],
  pencil: [
    'Work in a full value range, but keep the darkest darks and the brightest lights together at the focal point.',
    'Use a harder lead for construction and a soft lead only for the final dark accents.',
  ],
  hatching: [
    'Map tonal zones before hatching; each zone gets a consistent stroke density.',
    'Follow the plane: on curved forms let the hatching wrap around them as contour hatching.',
  ],
};

const join = (parts: (string | undefined)[]) => parts.filter(Boolean).join(' ');

/** Lower the time by `steps` positions, never below 5 minutes. */
export function shorterTime(t: TimeKey, steps: number): TimeKey {
  return TIME_ORDER[Math.max(0, TIME_ORDER.indexOf(t) - steps)];
}

const isAdvanced = (prompt: SketchPrompt, level: Level) => level === 'advanced' || prompt.difficulty >= 4;

export function buildPlan(prompt: SketchPrompt, time: TimeKey, medium: Medium, simplified = 0, level: Level = 'experienced'): PlanStep[] {
  // Simpler versions keep fewer of the subject-specific steps.
  const keep = Math.max(2, prompt.steps.length - simplified * 2);
  const s = prompt.steps.slice(0, keep);
  const colourFirst = medium === 'watercolour';
  const adv = isAdvanced(prompt, level) && simplified === 0;
  const opening = adv ? ADV_OPENING[medium] : OPENING[medium];
  const at = (i: number) => s[i];
  const rest = (from: number) => (s.length > from ? s.slice(from).join(' ') : undefined);

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
        { label: 'Minutes 1–2', text: join([opening, colourFirst ? undefined : at(0)]) },
        { label: 'Minutes 3–5', text: colourFirst ? join(['Lay the big colour masses, lightest first.', at(0)]) : join([at(1), at(2)]) },
        { label: 'Minutes 6–8', text: colourFirst ? join([at(1), at(2)]) : at(3) ?? 'Add only the essential details.' },
        { label: 'Minutes 9–10', text: medium === 'ink' || medium === 'hatching' ? 'Add selective shading where it helps the form read.' : FINISH[medium] },
      ];
    case '20':
      return [
        { label: 'Minutes 1–3', text: join([opening, adv ? undefined : 'Place the main shapes lightly and check proportions.']) },
        { label: 'Minutes 4–8', text: colourFirst ? join(['Lay the first large washes, protecting the lights.', at(0)]) : join(['Build the structure:', at(0), at(1)]) },
        { label: 'Minutes 9–13', text: join([colourFirst ? at(1) : undefined, at(2), at(3) ?? 'Develop the foreground.']) },
        { label: 'Minutes 14–17', text: adv ? EDGES[medium] : TONE[medium] },
        { label: 'Minutes 18–20', text: join([at(4), 'Optional: a little more tonal work — or step back and leave it.']) },
      ];
    case '40':
      return [
        { label: 'Minutes 1–5', text: join([opening, adv ? 'Make a small three-value thumbnail first.' : 'If it helps, make a thumbnail to settle the composition.']) },
        { label: 'Minutes 5–12', text: colourFirst ? join(['Lay the large colour masses and their values.', at(0)]) : join(['Construct the main forms:', at(0), at(1)]) },
        { label: 'Minutes 12–20', text: join([colourFirst ? at(1) : undefined, at(2), at(3)]) || 'Develop the main forms.' },
        { label: 'Minutes 20–28', text: SHADOW_PATTERN[medium] },
        {
          label: 'Minutes 28–36',
          text: join([
            rest(4) ?? 'Add a few secondary details.',
            adv ? EDGES[medium] : medium === 'ink-wash' || medium === 'watercolour' ? 'Keep to a restrained colour plan — two or three related colours.' : TONE[medium],
          ]),
        },
        { label: 'Minutes 36–45', text: 'Unify: strengthen the focal point, soften anything competing with it, and stop while it still feels fresh.' },
      ];
    case '60':
      return [
        { label: 'Minutes 0–6', text: 'Study the scene. Make two or three thumbnails (thumb-sized, three values) and choose the strongest composition and focal point.' },
        { label: 'Minutes 6–16', text: join([ADV_OPENING[medium], at(0)]) },
        { label: 'Minutes 16–30', text: join([colourFirst ? 'Lay the big colour and value masses, protecting the lights.' : undefined, at(1), at(2)]) },
        { label: 'Minutes 30–42', text: join([at(3), SHADOW_PATTERN[medium]]) },
        { label: 'Minutes 42–52', text: join([rest(4) ?? 'Develop secondary details, keeping them subordinate to the focal area.', EDGES[medium]]) },
        { label: 'Minutes 52–60', text: 'Step back to arm’s length. Adjust the value hierarchy, add the final accents at the focal point, and stop.' },
      ];
    case '120':
      return [
        { label: 'First 15 min', text: 'Walk around the subject. Make several thumbnails and a value study; decide format, focal point and what you will leave out.' },
        { label: '15–40 min', text: join(['Full construction:', ADV_OPENING[medium], at(0), at(1)]) },
        { label: '40–45 min', text: 'Pause. Look at the drawing from a distance (or upside down) and correct proportions and perspective now, while it is still cheap to change.' },
        { label: '45–75 min', text: join([colourFirst ? 'First pass: big light-to-mid washes over the whole page.' : 'Main development:', at(2), at(3)]) },
        { label: '75–100 min', text: join([rest(4) ?? 'Develop the focal area fully; let the periphery stay suggested.', SHADOW_PATTERN[medium]]) },
        { label: '100–120+ min', text: join([EDGES[medium], 'Final accents and darks. If you need another sitting, note the light direction and time so you can return to the same conditions.']) },
      ];
  }
}

export function buildSuggestion(
  prompt: SketchPrompt,
  sug: Pick<Suggestion, 'time' | 'medium' | 'simplified' | 'createdAt'>,
  level: Level = 'experienced',
): BuiltSuggestion {
  const { medium, simplified } = sug;
  const time = simplified > 0 ? shorterTime(sug.time, simplified) : sug.time;
  const info = mediumInfo(medium);
  const closing = CLOSING_LINES[hashString(prompt.id + sug.createdAt) % CLOSING_LINES.length];
  const adv = isAdvanced(prompt, level) && simplified === 0 && TIME_ORDER.indexOf(time) >= 2;
  return {
    prompt,
    time,
    medium,
    simplified,
    focus: simplified > 0 ? prompt.simpler : undefined,
    composition: simplified > 0 ? prompt.composition.slice(0, 2) : prompt.composition,
    plan: buildPlan(prompt, time, medium, simplified, level),
    mediumGuidance: simplified > 0 ? info.guidance.slice(0, 2) : adv ? [...info.guidance.slice(0, 3), ...ADV_GUIDANCE[medium]] : info.guidance,
    mediumNote: prompt.mediumNotes?.[medium],
    constraint: simplified > 0 ? info.easyConstraints[(simplified - 1) % info.easyConstraints.length] : prompt.constraint,
    closing,
  };
}

export const MAX_SIMPLIFY = 2;
