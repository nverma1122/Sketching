import type { Richness as R } from '../data/types';
import { RICHNESS_LABELS } from '../data/taxonomy';

const WORDS = ['', 'light', 'moderate', 'demanding'];

/** Five richness dimensions as small dot meters. */
export function RichnessMeter({ richness, compact = false }: { richness: R; compact?: boolean }) {
  return (
    <dl className={`richness ${compact ? 'richness-compact' : ''}`} aria-label="Scene richness">
      {RICHNESS_LABELS.map(({ key, label }) => (
        <div key={key} className="richness-row">
          <dt>{label}</dt>
          <dd aria-label={`${label}: ${WORDS[richness[key]]}`} title={WORDS[richness[key]]}>
            {[1, 2, 3].map((i) => (
              <span key={i} className={`dot ${i <= richness[key] ? 'on' : ''}`} aria-hidden="true" />
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}
