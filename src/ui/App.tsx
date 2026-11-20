import { useEffect, useReducer, useState } from 'react';
import { createDesign, createHistory } from '../core';
import type { CustomerEntry } from '../scene/customerManifest';
import { httpAiDesigner } from '../data/aiDesigner';
import { httpDesignRepository } from '../data/designRepository';
import { Editor, type Part } from './Editor';
import { historyReducer } from './historyReducer';
import { type SavedState, startState } from './saving';
import { loadSkin, saveSkin } from './skin';
import { salonEnabled } from './flags';
import { loadCustomers, nextCustomer, TEST_WISH } from './salon';
import { MainMenu, type MenuChoice } from './MainMenu';
import { StartScreen } from './StartScreen';
import { loadTheme, saveTheme } from './theme';

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
  const [salon, setSalon] = useState<{ readonly customers: readonly CustomerEntry[]; readonly customer: CustomerEntry; readonly done: boolean } | { readonly error: string } | null>(null);
  const [history, dispatch] = useReducer(historyReducer, undefined, () => createHistory(createDesign('Mijn ontwerp')));
  /** The saved copy of the open design; kept here so it survives switching between hand and foot. */
  const [saved, setSaved] = useState<SavedState>(() => startState(history.present));

  useEffect(() => saveSkin(skin), [skin]);

  /** Brings in the next customer with a fresh design. */
  const receive = (customers: readonly CustomerEntry[], current: CustomerEntry | null) => {
    const customer = nextCustomer(customers, current, Math.random);
    if (customer === null) return;
    dispatch({ type: 'load', design: createDesign(`Klant ${customer.name}`) });
    setSalon({ customers, customer, done: false });
  };

  const startSalon = () => {
    setPart('hand');
    setSalon(null);
    loadCustomers().then(
      (customers) => receive(customers, null),
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
        ) : salon !== null && salon.done ? (
          <section className="start viewer" aria-labelledby="done-title">
            <h2 id="done-title" className="start-title">
              Klaar! {salon.customer.name} is blij.
            </h2>
            <p className="salon-wish">Een beoordeling met sterren komt later.</p>
            <button type="button" className="salon-done" onClick={() => receive(salon.customers, salon.customer)}>
              Volgende klant
            </button>
          </section>
        ) : (
          <Editor
            key={salon ? `salon-${salon.customer.id}` : part}
            part={part}
            {...(salon && { salon: { customer: salon.customer, wish: TEST_WISH, onDone: () => setSalon({ ...salon, done: true }) } })}
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
