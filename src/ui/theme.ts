/**
 * The looks of the app, shared with TriominosTheGame: same five themes, same names.
 * The colours live in src/styles.css (`data-theme` on the document element).
 */
export const THEMES = ['classic', 'modern', 'playful', 'midnight', 'porcelain'] as const;

export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = 'classic';

/** Dutch user-facing names. */
export const THEME_LABELS: Readonly<Record<Theme, string>> = {
  classic: 'Klassiek',
  modern: 'Modern',
  playful: 'Speels',
  midnight: 'Middernacht',
  porcelain: 'Porselein',
};

/** Also read by the inline script in index.html, which sets the theme before the first paint. */
const STORAGE_KEY = 'nailsalon.theme';

/** The theme with this name (any letter case); the default for anything that is not a theme. */
export function parseTheme(value: string | null | undefined): Theme {
  const name = value?.toLowerCase();
  return THEMES.find((theme) => theme === name) ?? DEFAULT_THEME;
}

export function loadTheme(): Theme {
  try {
    return parseTheme(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage can be blocked; the theme then lasts until the page closes.
  }
}
