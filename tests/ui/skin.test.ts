import { describe, expect, it } from 'vitest';
import { DEFAULT_SKIN, SKIN_TONES, skinTint, skinToneOf } from '../../src/ui/skin';

describe('skin', () => {
  it('has unique ids and colours', () => {
    expect(new Set(SKIN_TONES.map((tone) => tone.id)).size).toBe(SKIN_TONES.length);
    expect(new Set(SKIN_TONES.map((tone) => tone.color)).size).toBe(SKIN_TONES.length);
  });

  it('finds a tone by id', () => {
    expect(skinToneOf('brown').color).toBe('#8d5a3b');
  });

  it('falls back to the default for a missing or unknown id', () => {
    expect(skinToneOf(null).id).toBe(DEFAULT_SKIN);
    expect(skinToneOf('green').id).toBe(DEFAULT_SKIN);
  });

  describe('skinTint', () => {
    it('leaves the texture as it is for its own average colour', () => {
      for (const factor of skinTint('#dba388')) expect(factor).toBeCloseTo(1, 5);
    });

    it('darkens every channel for darker tones, from light to dark', () => {
      const brown = skinTint('#8d5a3b');
      const dark = skinTint('#5e3a26');
      brown.forEach((factor, i) => {
        expect(factor).toBeLessThan(1);
        expect(dark[i] ?? 1).toBeLessThan(factor);
      });
    });

    it('lightens the texture for the lightest tone', () => {
      expect(Math.max(...skinTint('#f3cdb6'))).toBeGreaterThan(1);
    });

    it('is finite and positive for every tone', () => {
      for (const { color } of SKIN_TONES) for (const factor of skinTint(color)) expect(factor).toBeGreaterThan(0);
    });
  });
});
