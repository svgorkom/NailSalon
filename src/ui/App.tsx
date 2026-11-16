import { useEffect, useReducer, useState } from 'react';
import { createDesign, createHistory } from '../core';
import { Editor, type Part } from './Editor';
import { historyReducer } from './historyReducer';
import { loadSkin, saveSkin } from './skin';
import { StartScreen } from './StartScreen';
import { loadTheme, saveTheme } from './theme';

export function App() {
  const [theme, setTheme] = useState(loadTheme);

  const [skin, setSkin] = useState(loadSkin);
  /** What is being painted; null shows the start screen. The design stays when you go back to choose again. */
  const [part, setPart] = useState<Part | null>(null);
  const [history, dispatch] = useReducer(historyReducer, undefined, () => createHistory(createDesign('Mijn ontwerp')));

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
          <Editor key={part} part={part} history={history} dispatch={dispatch} theme={theme} onThemeChange={setTheme} skin={skin} onSkinChange={setSkin} />
        )}
      </main>
    </>
  );
}
