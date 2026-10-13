import { it } from 'vitest';

// Regenerate with: npm run examples
import { writeFileSync } from 'node:fs';
import { PROMPTS, getPrompt } from './data/prompts';
import { levelLabel, mediumLabel, RICHNESS_LABELS } from './data/taxonomy';
import { richnessTotal } from './data/prompts/define';
import { buildSuggestion } from './lib/plan';
import { selectPrompt } from './lib/selector';
import { seededRng } from './lib/random';

const IDS = ['bk-01', 'sf-01', 'sf-02', 'cn-01', 'cn-02', 'fc-01', 'fc-02', 'ln-01', 'ln-02', 'st-01', 'bk-05', 'bk-06', 'fc-03', 'st-02'];
const W = ['', 'light', 'moderate', 'demanding'];

it.skipIf(!process.env.GEN_EXAMPLES)('writes docs/examples.md', () => {
  const out: string[] = [];
  out.push('# Example scenes from the library\n');
  out.push(`Generated from the app's real data and plan builder (\`src/data/prompts/*\`, \`src/lib/plan.ts\`). Library size: ${PROMPTS.length} scenes — ` +
    (['relaxed', 'intermediate', 'detailed'] as const).map((l) => `${PROMPTS.filter((p) => p.level === l).length} ${levelLabel(l).toLowerCase()}`).join(', ') + '.\n');
  for (const id of IDS) {
    const p = getPrompt(id)!;
    const m = p.media[0];
    out.push(`## ${p.title} (\`${p.id}\`)\n`);
    out.push(`**Scene.** ${p.scene}\n`);
    out.push(`**Why draw it.** ${p.why}\n`);
    out.push(`**Richness** (total ${richnessTotal(p.richness)}/15 → ${levelLabel(p.level)}): ` + RICHNESS_LABELS.map((r) => `${r.label} ${W[p.richness[r.key]]}`).join(' · ') + `. Full scene ≈ ${p.fullTime === '40' ? '30–45' : p.fullTime} min.\n`);
    out.push(`**Suggested medium.** ${mediumLabel(m)} (also: ${p.media.slice(1).map(mediumLabel).join(', ')})\n`);
    for (const t of ['5', '10', '20'] as const) {
      const b = buildSuggestion(p, { time: t, medium: m, simplified: 0, createdAt: 1 }, 'intermediate');
      out.push(`**${t}-minute approach — ${b.approach}.** ${b.approachSummary}\n`);
      for (const s of b.plan) out.push(`- *${s.label}:* ${s.text}`);
      out.push('');
    }
    out.push(`**Hatch only here:** ${p.hatch.join('; ')}. **Leave unfinished:** ${p.unfinished}\n`);
  }
  out.push('## Selector check: 12 default picks (no choices made, default level)\n');
  out.push('| # | Scene | Level | Richness | Medium |\n|---|---|---|---|---|');
  const rng = seededRng(2026);
  let recent: string[] = [];
  for (let i = 1; i <= 12; i++) {
    const r = selectPrompt(PROMPTS, { time: '5' }, { recent, attempted: {}, saved: [], rng })!;
    recent = [r.prompt.id, ...recent];
    out.push(`| ${i} | ${r.prompt.title} | ${levelLabel(r.prompt.level)} | ${richnessTotal(r.prompt.richness)}/15 | ${mediumLabel(r.medium)} |`);
  }
  out.push('\nAll twelve were requested with a **5-minute** session: the scenes stay intermediate; only the approach becomes a focused study.\n');
  writeFileSync('docs/examples.md', out.join('\n'));
});
