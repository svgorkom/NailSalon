import { readSetting, writeSetting } from './storage';

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

/** Colour of the lamp and of the light from above in the 3D scene: the same as the table lights of TriominosTheGame. */
export const SCENE_LIGHT: Readonly<Record<Theme, { readonly sun: string; readonly sky: string }>> = {
  classic: { sun: '#ffe9c7', sky: '#fff2dc' },
  modern: { sun: '#f3f6ff', sky: '#f2f5ff' },
  playful: { sun: '#fff1d2', sky: '#fff6e6' },
  midnight: { sun: '#e6ecff', sky: '#e8eeff' },
  porcelain: { sun: '#fffaf0', sky: '#ffffff' },
};

/** Also read by the inline script in index.html, which sets the theme before the first paint. */
const STORAGE_KEY = 'nailsalon.theme';

/** The theme with this name (any letter case); the default for anything that is not a theme. */
export function parseTheme(value: string | null | undefined): Theme {
  const name = value?.toLowerCase();
  return THEMES.find((theme) => theme === name) ?? DEFAULT_THEME;
}

export function loadTheme(): Theme {
  return parseTheme(readSetting(STORAGE_KEY));
}

export function saveTheme(theme: Theme): void {
  writeSetting(STORAGE_KEY, theme);
}
