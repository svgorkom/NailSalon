import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME, THEME_LABELS, THEMES, parseTheme } from '../../src/ui/theme';

describe('theme', () => {
  it('knows the five themes of TriominosTheGame', () => {
    expect(THEMES).toEqual(['classic', 'modern', 'playful', 'midnight', 'porcelain']);
  });

  it('has a Dutch label for every theme', () => {
    for (const theme of THEMES) expect(THEME_LABELS[theme]).not.toBe('');
  });

  it('parses a theme name in any letter case', () => {
    expect(parseTheme('midnight')).toBe('midnight');
    expect(parseTheme('Porcelain')).toBe('porcelain');
  });

  it('falls back to the default for a missing or unknown name', () => {
    expect(parseTheme(null)).toBe(DEFAULT_THEME);
    expect(parseTheme(undefined)).toBe(DEFAULT_THEME);
    expect(parseTheme('neon')).toBe(DEFAULT_THEME);
    expect(parseTheme('toString')).toBe(DEFAULT_THEME);
  });
});
