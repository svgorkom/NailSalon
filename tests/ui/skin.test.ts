import { describe, expect, it } from 'vitest';
import { DEFAULT_SKIN, SKIN_TONES, skinToneOf } from '../../src/ui/skin';

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
});
