import { useState, type FormEvent } from 'react';
import { CATEGORIES, ENERGIES, LEVELS, MEDIA, TIMES } from '../data/taxonomy';
import type { Category, Energy, Level, Medium, TimeKey } from '../data/types';
import { ChoiceGroup, useToast } from '../components/ui';
import { Icon } from '../components/Icons';
import { useStore } from '../lib/store';
import { navigate } from '../lib/router';

type CategoryChoice = Category | 'any';
type MediumChoice = Medium | 'any';
type EnergyChoice = Energy | 'skip';

const TIME_ACCENTS = ['var(--sage)', 'var(--dusty-blue)', 'var(--ochre)', 'var(--terracotta)', 'var(--ink-soft)', 'var(--ink)'];

export function Finder() {
  const store = useStore();
  const toast = useToast();
  const last = store.prefs.lastCriteria;
  const [time, setTime] = useState<TimeKey>(last.time ?? '10');
  const [category, setCategory] = useState<CategoryChoice>(last.category ?? 'any');
  const [medium, setMedium] = useState<MediumChoice>(last.medium ?? 'any');
  const [energy, setEnergy] = useState<EnergyChoice>(last.energy ?? 'skip');
  const [level, setLevel] = useState<Level>(store.prefs.level);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (level !== store.prefs.level) store.setPrefs({ level });
    const s = store.find(
      {
        time,
        category: category === 'any' ? undefined : category,
        medium: medium === 'any' ? undefined : medium,
        energy: energy === 'skip' ? undefined : energy,
        level,
      },
      { remember: true },
    );
    if (s) navigate('/idea');
    else toast({ message: 'No ideas could be found. Please try different choices.', tone: 'error' });
  };

  return (
    <form className="finder page-narrow" onSubmit={submit}>
      <header className="page-head">
        <h1>Find me something to sketch</h1>
        <p className="muted">A few quick choices. The time changes how you approach the scene, never how rich the scene is.</p>
      </header>

      <ChoiceGroup
        name="time"
        legend="How much time do you have?"
        columns={3}
        value={time}
        onChange={setTime}
        options={TIMES.map((t, i) => ({ value: t.key, label: t.label, hint: t.hint, accent: TIME_ACCENTS[i] }))}
      />

      <ChoiceGroup<Level>
        name="level"
        legend="Sketching level"
        columns={3}
        value={level}
        onChange={setLevel}
        options={LEVELS.map((l) => ({ value: l.key, label: l.label, hint: l.hint }))}
      />

      <ChoiceGroup<CategoryChoice>
        name="category"
        legend="What would you like to draw?"
        columns={2}
        value={category}
        onChange={setCategory}
        options={[...CATEGORIES.map((c) => ({ value: c.key as CategoryChoice, label: c.label })), { value: 'any', label: 'Surprise me', hint: 'A completely random idea.' }]}
      />

      <ChoiceGroup<MediumChoice>
        name="medium"
        legend="What medium are you in the mood for?"
        columns={2}
        value={medium}
        onChange={setMedium}
        options={[...MEDIA.map((m) => ({ value: m.key as MediumChoice, label: m.label, hint: m.blurb })), { value: 'any', label: 'Surprise me', hint: 'Let the idea choose.' }]}
      />

      <ChoiceGroup<EnergyChoice>
        name="energy"
        legend="How much energy do you have? (optional)"
        columns={2}
        value={energy}
        onChange={setEnergy}
        options={[...ENERGIES.map((e) => ({ value: e.key as EnergyChoice, label: e.label, hint: e.hint })), { value: 'skip', label: 'Skip this question', hint: 'No preference.' }]}
      />

      <div className="finder-submit">
        <button type="submit" className="btn btn-primary btn-large">
          <Icon name="sparkle" /> Find my sketch
        </button>
      </div>
    </form>
  );
}
