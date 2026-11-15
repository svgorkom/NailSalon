import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME, SCENE_LIGHT, THEME_LABELS, THEMES, parseTheme } from '../../src/ui/theme';

describe('theme', () => {
  it('starts with the five themes of TriominosTheGame', () => {
    expect(THEMES.slice(0, 5)).toEqual(['classic', 'modern', 'playful', 'midnight', 'porcelain']);
  });

  it('has the festive themes of NailSalon', () => {
    expect(THEMES.slice(5)).toEqual(['christmas', 'sinterklaas', 'confetti', 'pink', 'rainbow']);
  });

  it('parses the new themes', () => {
    expect(parseTheme('Sinterklaas')).toBe('sinterklaas');
    expect(parseTheme('rainbow')).toBe('rainbow');
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

describe('scene light', () => {
  it('has a lamp and sky colour for every theme', () => {
    for (const theme of THEMES) {
      expect(SCENE_LIGHT[theme].sun).toMatch(/^#[0-9a-f]{6}$/);
      expect(SCENE_LIGHT[theme].sky).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
