import { describe, expect, it } from 'vitest';
import { classifyColor, COLOR_FAMILIES, colorFamilyMatch } from '../../../src/core';
import { CANONICAL_COLORS } from './solve';

describe('colour families', () => {
  it('puts the canonical colour of every family in that family', () => {
    for (const family of COLOR_FAMILIES) expect(classifyColor(CANONICAL_COLORS[family])).toBe(family);
  });

  it('knows light red is pink, dark orange is brown and pale tints are white', () => {
    expect(classifyColor('#ff9999')).toBe('pink');
    expect(classifyColor('#8b4513')).toBe('brown');
    expect(classifyColor('#fff0f5')).toBe('white');
    expect(classifyColor('#ffc0cb')).toBe('pink');
  });

  it('separates black, dark grey and grey by lightness', () => {
    expect(classifyColor('#1a1a1a')).toBe('black');
    expect(classifyColor('#333333')).toBe('gray');
    expect(classifyColor('#bbbbbb')).toBe('gray');
  });

  it('gives full points inside the family, half next to it and none far away', () => {
    expect(colorFamilyMatch('#e8a0b4', 'pink')).toBe(1);
    expect(colorFamilyMatch('#e8a0b4', 'red')).toBe(0.5);
    expect(colorFamilyMatch('#e8a0b4', 'green')).toBe(0);
    expect(colorFamilyMatch('#808080', 'white')).toBe(0.5);
  });
});
