import type { Part } from './Editor';

/** What can be chosen: a part to paint freely, or the salon game (only when it is turned on, see `flags.ts`). */
export type StartChoice = Part | 'salon';

interface StartScreenProps {
  readonly onChoose: (choice: StartChoice) => void;
  readonly salon: boolean;
}

const CHOICES: readonly { readonly part: StartChoice; readonly title: string; readonly text: string }[] = [
  { part: 'hand', title: 'Hand', text: 'Een manicure' },
  { part: 'foot', title: 'Voet', text: 'Een pedicure' },
  { part: 'salon', title: 'Salon', text: 'Klanten helpen' },
];

/** The first screen: paint a hand or a foot. */
export function StartScreen({ onChoose, salon }: StartScreenProps) {
  return (
    <section className="start viewer" aria-labelledby="start-title">
      <h2 id="start-title" className="start-title">
        Wat ga je lakken?
      </h2>
      <div className="start-cards">
        {CHOICES.filter(({ part }) => salon || part !== 'salon').map(({ part, title, text }) => (
          <button key={part} type="button" className="start-card panel" onClick={() => onChoose(part)}>
            {part === 'salon' ? (
              <span className="start-image start-emoji" aria-hidden="true">
                💅
              </span>
            ) : (
              <img src={`${import.meta.env.BASE_URL}assets/start/${part}.webp`} alt="" className="start-image" />
            )}
            <span className="start-name">{title}</span>
            <span className="start-text">{text}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
