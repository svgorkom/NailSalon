import { DIFFICULTIES } from '../core';
import type { CustomerEntry } from '../scene/customerManifest';
import type { SalonViewId } from '../scene/salonViews';
import type { Level } from './salon';

const VIEW_BUTTONS: readonly { readonly id: SalonViewId; readonly text: string }[] = [
  { id: 'salon', text: '🪑 Salon' },
  { id: 'closeup', text: '🔍 Dichtbij' },
];

interface SalonBarProps {
  readonly customer: CustomerEntry;
  readonly wish: string;
  /** The requirements as short lines, to tick off while designing. */
  readonly checklist: readonly string[];
  readonly view: SalonViewId;
  readonly onViewChange: (view: SalonViewId) => void;
  /** How hard the wishes are, and the level the player chose. */
  readonly level: Level;
  readonly difficulty: number;
  readonly onLevelChange: (level: Level) => void;
  readonly onDone: () => void;
}

/** Top of the tool panel in the salon game: who is sitting there, what she wants, the camera and the Klaar button. */
export function SalonBar({ customer, wish, checklist, view, onViewChange, level, difficulty, onLevelChange, onDone }: SalonBarProps) {
  return (
    <section className="salon-bar" aria-label="Klant">
      <h2 className="salon-name">{customer.name}</h2>
      <p className="salon-wish">“{wish}”</p>
      <ul className="salon-checklist">
        {checklist.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <div className="row">
        {VIEW_BUTTONS.map(({ id, text }) => (
          <button key={id} type="button" className="choice grow" aria-pressed={id === view} onClick={() => onViewChange(id)}>
            {text}
          </button>
        ))}
      </div>
      <div className="salon-level" role="group" aria-label="Moeilijkheid">
        <span>Niveau {level === 'auto' ? `(auto: ${difficulty})` : ''}</span>
        <div className="salon-level-buttons">
          {(['auto', ...DIFFICULTIES] as const).map((value) => (
            <button key={value} type="button" className="choice" aria-pressed={value === level} onClick={() => onLevelChange(value)}>
              {value === 'auto' ? 'Auto' : value}
            </button>
          ))}
        </div>
      </div>
      <button type="button" className="salon-done" onClick={onDone}>
        ✅ Klaar
      </button>
    </section>
  );
}
