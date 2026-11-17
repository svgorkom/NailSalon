import { describe, expect, it } from 'vitest';
import { apply, createDesign } from '../../src/core';
import { RepositoryError } from '../../src/data/designRepository';
import { errorText, isUnsaved, startState } from '../../src/ui/saving';

describe('saving', () => {
  it('sees a new design as saved until it changes', () => {
    const design = createDesign('Mijn ontwerp');
    const state = startState(design);
    expect(isUnsaved(design, state)).toBe(false);
    expect(isUnsaved(apply(design, { type: 'setShape', target: 'thumb', shape: 'square' }), state)).toBe(true);
  });

  it('explains each kind of failure in Dutch', () => {
    expect(errorText(new RepositoryError('unavailable', ''))).toContain('online');
    expect(errorText(new RepositoryError('signedOut', ''))).toContain('Herlaad');
    expect(errorText(new RepositoryError('tooLarge', ''))).toContain('te groot');
    expect(errorText(new RepositoryError('notConfigured', ''))).toContain('niet klaar');
    expect(errorText(new Error('x'))).toContain('Probeer');
  });
});
