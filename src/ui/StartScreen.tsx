import type { Part } from './Editor';

interface StartScreenProps {
  readonly onChoose: (part: Part) => void;
}

const CHOICES: readonly { readonly part: Part; readonly title: string; readonly text: string }[] = [
  { part: 'hand', title: 'Hand', text: 'Een manicure' },
  { part: 'foot', title: 'Voet', text: 'Een pedicure' },
];

/** The first screen: paint a hand or a foot. */
export function StartScreen({ onChoose }: StartScreenProps) {
  return (
    <section className="start viewer" aria-labelledby="start-title">
      <h2 id="start-title" className="start-title">
        Wat ga je lakken?
      </h2>
      <div className="start-cards">
        {CHOICES.map(({ part, title, text }) => (
          <button key={part} type="button" className="start-card panel" onClick={() => onChoose(part)}>
            <img src={`${import.meta.env.BASE_URL}assets/start/${part === 'hand' ? 'hand' : 'foot'}.webp`} alt="" className="start-image" />
            <span className="start-name">{title}</span>
            <span className="start-text">{text}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
