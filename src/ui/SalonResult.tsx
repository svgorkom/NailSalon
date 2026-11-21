import { useState } from 'react';
import type { Wish, WishResult } from '../core';
import { lengthLimit, type Stars } from '../core';
import type { CustomerEntry } from '../scene/customerManifest';
import { errorText } from './saving';
import { checklistLine, REACTIONS, resultMark, starsText } from './wishText';

interface SalonResultProps {
  readonly customer: CustomerEntry;
  readonly wish: Wish;
  readonly result: WishResult;
  /** The most stars this customer gave in any attempt. */
  readonly best: Stars;
  /** Saves the design of this round as a new design in "Mijn ontwerpen"; rejects when that fails. */
  readonly onSave: () => Promise<void>;
  readonly onRetry: () => void;
  readonly onNext: () => void;
}

/** After "Klaar": what the customer thinks, with a mark per requirement. The player may adjust the design or go on to the next customer. */
export function SalonResult({ customer, wish, result, best, onSave, onRetry, onNext }: SalonResultProps) {
  const limit = lengthLimit(wish.part);
  const [saving, setSaving] = useState<'idle' | 'busy' | 'saved' | string>('idle');
  const save = async () => {
    setSaving('busy');
    try {
      await onSave();
      setSaving('saved');
    } catch (error) {
      setSaving(errorText(error));
    }
  };
  return (
    <section className="salon-result" aria-labelledby="result-title">
      <h2 id="result-title" className="start-title">
        {customer.name}: <span className="salon-stars" role="img" aria-label={`${result.stars} van 3 sterren`}>
          {[1, 2, 3].map((n) => (
            <span key={n} className={n <= result.stars ? 'star-on' : 'star-off'}>
              ★
            </span>
          ))}
        </span>
      </h2>
      <p className="salon-wish">“{REACTIONS[result.stars]}”</p>
      <ul className="salon-checklist salon-marks">
        {result.results.map(({ requirement, score }) => (
          <li key={checklistLine(requirement, limit)}>
            {resultMark(score)} {checklistLine(requirement, limit)}
          </li>
        ))}
      </ul>
      {result.creative && <p className="salon-wish">🎨 Creatief! Je hebt zelf getekend.</p>}
      {best > result.stars && <p className="salon-wish">Beste poging bij {customer.name}: {starsText(best)}</p>}
      <div className="row">
        <button type="button" onClick={save} disabled={saving === 'busy' || saving === 'saved'}>
          {saving === 'saved' ? '✔ Bewaard' : '💾 Bewaar in Mijn ontwerpen'}
        </button>
      </div>
      {saving !== 'idle' && saving !== 'busy' && saving !== 'saved' && (
        <p className="salon-wish" role="alert">
          {saving}
        </p>
      )}
      <div className="row">
        <button type="button" onClick={onRetry}>
          ✏️ Nog niet klaar, ik pas het aan
        </button>
        <button type="button" className="salon-done" onClick={onNext}>
          Volgende klant
        </button>
      </div>
    </section>
  );
}
