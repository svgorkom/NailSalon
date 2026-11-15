import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_HAND_SIDE, HAND_SIDE_LABELS, HAND_SIDES, handSideOf, loadHandSide, saveHandSide } from '../../src/ui/handSide';

describe('handSide', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('has a label for every side', () => {
    for (const side of HAND_SIDES) expect(HAND_SIDE_LABELS[side]).not.toBe('');
  });

  it('starts with the right hand, the model as it is', () => {
    expect(DEFAULT_HAND_SIDE).toBe('right');
  });

  it('falls back to the default for a missing or unknown id', () => {
    expect(handSideOf(null)).toBe(DEFAULT_HAND_SIDE);
    expect(handSideOf('both')).toBe(DEFAULT_HAND_SIDE);
    expect(handSideOf('left')).toBe('left');
  });

  it('keeps the choice between visits', () => {
    expect(loadHandSide()).toBe('right');
    saveHandSide('left');
    expect(loadHandSide()).toBe('left');
  });
});
