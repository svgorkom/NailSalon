import type { Wish, WishResult } from '../core';
import { lengthLimit, type Stars } from '../core';
import type { CustomerEntry } from '../scene/customerManifest';
import { checklistLine, REACTIONS, resultMark, starsText } from './wishText';

interface SalonResultProps {
  readonly customer: CustomerEntry;
  readonly wish: Wish;
  readonly result: WishResult;
  /** The most stars this customer gave in any attempt. */
  readonly best: Stars;
  readonly onRetry: () => void;
  readonly onNext: () => void;
}

/** After "Klaar": what the customer thinks, with a mark per requirement. The player may adjust the design or go on to the next customer. */
export function SalonResult({ customer, wish, result, best, onRetry, onNext }: SalonResultProps) {
  const limit = lengthLimit(wish.part);
  return (
    <section className="start viewer salon-result" aria-labelledby="result-title">
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
