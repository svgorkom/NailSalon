export type MenuChoice = 'free' | 'salon';

interface MainMenuProps {
  readonly onChoose: (choice: MenuChoice) => void;
}

const CHOICES: readonly { readonly choice: MenuChoice; readonly title: string; readonly text: string }[] = [
  { choice: 'free', title: 'Nagelontwerp', text: 'Vrij ontwerpen op een hand of voet' },
  { choice: 'salon', title: 'Nagelsalon', text: 'Klanten helpen met hun wens' },
];

/** The first screen when the salon game is turned on (see `flags.ts`): free design as it always was, or the salon game. */
export function MainMenu({ onChoose }: MainMenuProps) {
  return (
    <section className="start viewer" aria-labelledby="menu-title">
      <h2 id="menu-title" className="start-title">
        Wat wil je doen?
      </h2>
      <div className="start-cards">
        {CHOICES.map(({ choice, title, text }) => (
          <button key={choice} type="button" className="start-card panel" onClick={() => onChoose(choice)}>
            {choice === 'salon' ? (
              <span className="start-image start-emoji" aria-hidden="true">
                💅
              </span>
            ) : (
              <img src={`${import.meta.env.BASE_URL}assets/start/hand.webp`} alt="" className="start-image" />
            )}
            <span className="start-name">{title}</span>
            <span className="start-text">{text}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
