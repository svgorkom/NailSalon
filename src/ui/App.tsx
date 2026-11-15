import { useEffect, useState } from 'react';
import { Editor } from './Editor';
import { loadHandSide, saveHandSide } from './handSide';
import { loadSkin, saveSkin } from './skin';
import { loadTheme, saveTheme } from './theme';

export function App() {
  const [theme, setTheme] = useState(loadTheme);

  const [skin, setSkin] = useState(loadSkin);

  const [handSide, setHandSide] = useState(loadHandSide);

  useEffect(() => saveSkin(skin), [skin]);

  useEffect(() => saveHandSide(handSide), [handSide]);

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
        <Editor theme={theme} onThemeChange={setTheme} skin={skin} onSkinChange={setSkin} handSide={handSide} onHandSideChange={setHandSide} />
      </main>
    </>
  );
}
