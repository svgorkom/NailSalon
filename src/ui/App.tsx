import { useEffect, useReducer, useState } from 'react';
import { createDesign, createHistory } from '../core';
import { httpDesignRepository } from '../data/designRepository';
import { Editor, type Part } from './Editor';
import { historyReducer } from './historyReducer';
import { type SavedState, startState } from './saving';
import { loadSkin, saveSkin } from './skin';
import { StartScreen } from './StartScreen';
import { loadTheme, saveTheme } from './theme';

const repository = httpDesignRepository((url, init) => fetch(url, init));
const newId = () => crypto.randomUUID();

export function App() {
  const [theme, setTheme] = useState(loadTheme);

  const [skin, setSkin] = useState(loadSkin);
  /** What is being painted; null shows the start screen. The design stays when you go back to choose again. */
  const [part, setPart] = useState<Part | null>(null);
  const [history, dispatch] = useReducer(historyReducer, undefined, () => createHistory(createDesign('Mijn ontwerp')));
  /** The saved copy of the open design; kept here so it survives switching between hand and foot. */
  const [saved, setSaved] = useState<SavedState>(() => startState(history.present));

  useEffect(() => saveSkin(skin), [skin]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

  return (
    <>
      <header className="app-header panel">
        {part !== null && (
          <button type="button" className="back" onClick={() => setPart(null)}>
            ← Kies opnieuw
          </button>
        )}
        <h1 className="title">NailSalon</h1>
      </header>
      <main>
        {part === null ? (
          <StartScreen onChoose={setPart} />
        ) : (
          <Editor key={part} part={part} history={history} dispatch={dispatch} theme={theme} onThemeChange={setTheme} skin={skin} onSkinChange={setSkin} repository={repository} newId={newId} saved={saved} onSavedChange={setSaved} />
        )}
      </main>
    </>
  );
}
