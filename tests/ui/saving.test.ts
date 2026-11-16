import { describe, expect, it } from 'vitest';
import { apply, createDesign } from '../../src/core';
import { RepositoryError } from '../../src/data/designRepository';
import { errorText, highestItemNumber, isUnsaved, startState } from '../../src/ui/saving';

describe('saving', () => {
  it('sees a new design as saved until it changes', () => {
    const design = createDesign('Mijn ontwerp');
    const state = startState(design);
    expect(isUnsaved(design, state)).toBe(false);
    expect(isUnsaved(apply(design, { type: 'setShape', target: 'thumb', shape: 'square' }), state)).toBe(true);
  });

  it('finds the highest sticker or gem number', () => {
    let design = createDesign('Test');
    expect(highestItemNumber(design)).toBe(0);
    design = apply(design, { type: 'addSticker', target: 'thumb', sticker: { id: 's3', kind: 'star', color: '#ffffff', x: 0.5, y: 0.5, size: 0.3, rotation: 0 } });
    design = apply(design, { type: 'addGem', target: 'all', gem: { id: 'g12', kind: 'diamond', color: '#ffffff', clear: true, x: 0.5, y: 0.5, size: 0.2, rotation: 0 } });
    expect(highestItemNumber(design)).toBe(12);
  });

  it('explains each kind of failure in Dutch', () => {
    expect(errorText(new RepositoryError('unavailable', ''))).toContain('online');
    expect(errorText(new RepositoryError('signedOut', ''))).toContain('Herlaad');
    expect(errorText(new RepositoryError('tooLarge', ''))).toContain('te groot');
    expect(errorText(new Error('x'))).toContain('Probeer');
  });
});
