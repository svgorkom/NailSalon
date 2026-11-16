import { useEffect, useState } from 'react';
import { httpDesignRepository } from '../data/designRepository';
import { Editor } from './Editor';
import { loadSkin, saveSkin } from './skin';
import { loadTheme, saveTheme } from './theme';

const repository = httpDesignRepository((url, init) => fetch(url, init));
const newId = () => crypto.randomUUID();

export function App() {
  const [theme, setTheme] = useState(loadTheme);

  const [skin, setSkin] = useState(loadSkin);

  useEffect(() => saveSkin(skin), [skin]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

  return (
    <>
      <header className="app-header panel">
        <h1 className="title">NailSalon</h1>
      </header>
      <main>
        <Editor theme={theme} onThemeChange={setTheme} skin={skin} onSkinChange={setSkin} repository={repository} newId={newId} />
      </main>
    </>
  );
}
