import { useEffect, useReducer, useState } from 'react';
import { createDesign, createHistory, type Difficulty, generateWish, lengthLimit, MAX_DIFFICULTY, scoreWish, type Stars, type Wish, type WishResult } from '../core';
import type { CustomerEntry } from '../scene/customerManifest';
import { httpAiDesigner } from '../data/aiDesigner';
import { httpDesignRepository } from '../data/designRepository';
import { Editor, type Part } from './Editor';
import { historyReducer } from './historyReducer';
import { type SavedState, startState } from './saving';
import { loadSkin, saveSkin } from './skin';
import { salonEnabled } from './flags';
import { loadCustomers, nextCustomer } from './salon';
import { SalonResult } from './SalonResult';
import { checklistLine, wishText } from './wishText';
import { MainMenu, type MenuChoice } from './MainMenu';
import { StartScreen } from './StartScreen';
import { loadTheme, saveTheme } from './theme';

/** The salon game: the customer in the chair, her wish, the latest result (null while designing) and the most stars she gave so far. */
interface SalonState {
  readonly customers: readonly CustomerEntry[];
  readonly customer: CustomerEntry;
  readonly wish: Wish;
  readonly difficulty: Difficulty;
  readonly result: WishResult | null;
  readonly best: Stars;
}

/** A random seed for a wish; `generateWish` itself is deterministic. */
function newWishSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}

const repository = httpDesignRepository((url, init) => fetch(url, init));
const designer = httpAiDesigner((url, init) => fetch(url, init));
const newId = () => crypto.randomUUID();

export function App() {
  const [theme, setTheme] = useState(loadTheme);

  const [skin, setSkin] = useState(loadSkin);
  /** What is being painted; null shows the start screen. The design stays when you go back to choose again. */
  const [part, setPart] = useState<Part | null>(null);
  const [showSalon] = useState(salonEnabled);
  /** With the salon game on: whether free design was chosen in the main menu, so the hand and foot cards show. */
  const [free, setFree] = useState(false);
  /** The salon game: the customer in the chair, whether she is done, or a message when the list could not be loaded. */
  const [salon, setSalon] = useState<SalonState | { readonly error: string } | null>(null);
  const [history, dispatch] = useReducer(historyReducer, undefined, () => createHistory(createDesign('Mijn ontwerp')));
  /** The saved copy of the open design; kept here so it survives switching between hand and foot. */
  const [saved, setSaved] = useState<SavedState>(() => startState(history.present));

  useEffect(() => saveSkin(skin), [skin]);

  /** Brings in the next customer with a fresh design and a new wish. */
  const receive = (customers: readonly CustomerEntry[], current: CustomerEntry | null, difficulty: Difficulty) => {
    const customer = nextCustomer(customers, current, Math.random);
    if (customer === null) return;
    dispatch({ type: 'load', design: createDesign(`Klant ${customer.name}`) });
    setPart(customer.part);
    setSalon({ customers, customer, wish: generateWish(newWishSeed(), customer.part, difficulty), difficulty, result: null, best: 0 });
  };

  const startSalon = () => {
    setPart('hand');
    setSalon(null);
    loadCustomers().then(
      (customers) => receive(customers, null, 1),
      (reason: unknown) => setSalon({ error: reason instanceof Error ? reason.message : 'Klanten laden mislukt.' }),
    );
  };

  const chooseFromMenu = (choice: MenuChoice) => {
    if (choice === 'free') setFree(true);
    else startSalon();
  };

  /** Back one screen: out of the salon to the main menu, out of the editor to the hand and foot cards. */
  const leave = () => {
    if (salon !== null) setFree(false);
    setPart(null);
    setSalon(null);
  };

  const inFreeChoice = showSalon && free && part === null;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

  return (
    <>
      <header className="app-header panel">
        {(part !== null || inFreeChoice) && (
          <button type="button" className="back" onClick={part !== null ? leave : () => setFree(false)}>
            {inFreeChoice ? '← Menu' : '← Kies opnieuw'}
          </button>
        )}
        <h1 className="title">NailSalon</h1>
      </header>
      <main>
        {part === null ? (
          showSalon && !free ? <MainMenu onChoose={chooseFromMenu} /> : <StartScreen onChoose={setPart} />
        ) : salon !== null && 'error' in salon ? (
          <p className="loading" role="alert">
            {salon.error}
          </p>
        ) : (
          <Editor
            key={salon ? `salon-${salon.customer.id}` : part}
            part={part}
            {...(salon && {
              salon: {
                customer: salon.customer,
                wish: wishText(salon.wish, salon.customer.id, lengthLimit(salon.wish.part)),
                checklist: salon.wish.requirements.map((requirement) => checklistLine(requirement, lengthLimit(salon.wish.part), salon.wish.part)),
                onDone: () => {
                  const result = scoreWish(salon.wish, history.present);
                  setSalon({ ...salon, result, best: Math.max(salon.best, result.stars) as Stars });
                },
                ...(salon.result && {
                  outcome: {
                    stars: salon.result.stars,
                    panel: (
                      <SalonResult
                        customer={salon.customer}
                        wish={salon.wish}
                        result={salon.result}
                        best={salon.best}
                        onSave={async () => {
                          await repository.save(newId(), history.present, false);
                        }}
                        onRetry={() => setSalon({ ...salon, result: null })}
                        onNext={() => receive(salon.customers, salon.customer, salon.best >= 2 ? (Math.min(MAX_DIFFICULTY, salon.difficulty + 1) as Difficulty) : salon.difficulty)}
                      />
                    ),
                  },
                }),
              },
            })}
            history={history}
            dispatch={dispatch}
            theme={theme}
            onThemeChange={setTheme}
            skin={skin}
            onSkinChange={setSkin}
            repository={repository}
            designer={designer}
            newId={newId}
            saved={saved}
            onSavedChange={setSaved}
          />
        )}
      </main>
    </>
  );
}
