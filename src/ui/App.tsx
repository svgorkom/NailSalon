import { useEffect, useState } from 'react';
import { Editor } from './Editor';
import { loadTheme, saveTheme } from './theme';

export function App() {
  const [theme, setTheme] = useState(loadTheme);

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
        <Editor theme={theme} onThemeChange={setTheme} />
      </main>
    </>
  );
}
