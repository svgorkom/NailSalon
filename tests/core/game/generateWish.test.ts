import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, generateWish, scoreWish, TOE_MAX_LENGTH, TOE_SHAPES, validateWish, type Wish, type WishPart } from '../../../src/core';
import { solve } from './solve';

const PARTS: readonly WishPart[] = ['hand', 'foot'];
const SEEDS = Array.from({ length: 300 }, (_, index) => index * 7919);
const valid: Wish = { part: 'hand', difficulty: 2, requirements: [{ kind: 'finish', scope: 'all', finish: 'glitter' }] };

describe('generating wishes', () => {
  it('always gives the same wish for the same seed, and other wishes for other seeds', () => {
    expect(generateWish(42, 'hand', 3)).toEqual(generateWish(42, 'hand', 3));
    const distinct = new Set(SEEDS.map((seed) => JSON.stringify(generateWish(seed, 'hand', 3))));
    expect(distinct.size).toBeGreaterThan(100);
  });

  it('asks for more as the difficulty goes up', () => {
    const sizes = DIFFICULTIES.map((difficulty) => generateWish(1, 'hand', difficulty).requirements.length);
    expect(sizes).toEqual([1, 2, 3, 3, 5]);
  });

  it('asks for a decoration on a single nail at difficulty 4 and 5', () => {
    for (const seed of SEEDS) {
      for (const difficulty of [4, 5] as const) {
        const single = generateWish(seed, 'hand', difficulty).requirements.filter((requirement) => requirement.scope !== 'all');
        expect(single).toHaveLength(1);
        expect(['stickers', 'gems']).toContain(single[0]?.kind);
      }
    }
  });

  it('only gives valid wishes, and a design that meets every one of them scores full marks', () => {
    for (const part of PARTS) {
      for (const difficulty of DIFFICULTIES) {
        for (const seed of SEEDS) {
          const wish = generateWish(seed, part, difficulty);
          expect(() => validateWish(wish)).not.toThrow();
          expect(scoreWish(wish, solve(wish))).toMatchObject({ score: 1, stars: 3 });
        }
      }
    }
  });

  it('keeps toe wishes to what toenails can be', () => {
    for (const seed of SEEDS) {
      for (const requirement of generateWish(seed, 'foot', 5).requirements) {
        if (requirement.kind === 'shape') expect(TOE_SHAPES).toContain(requirement.shape);
        if (requirement.kind === 'length') expect(Math.max(requirement.min ?? 0, requirement.max ?? 0)).toBeLessThanOrEqual(TOE_MAX_LENGTH);
        if (requirement.scope !== 'all') expect(['bigToe', 'secondToe', 'thirdToe', 'fourthToe', 'littleToe']).toContain(requirement.scope);
      }
    }
  });
});

describe('validating wishes', () => {
  it('accepts a good wish and rejects an empty one', () => {
    expect(() => validateWish(valid)).not.toThrow();
    expect(() => validateWish({ ...valid, requirements: [] })).toThrow(RangeError);
  });

  it('rejects a nail of the other part, a toe shape on a finger wish the other way round, and too long toenails', () => {
    expect(() => validateWish({ ...valid, requirements: [{ kind: 'french', scope: 'bigToe', on: true }] })).toThrow(RangeError);
    expect(() => validateWish({ part: 'foot', difficulty: 1, requirements: [{ kind: 'shape', scope: 'all', shape: 'stiletto' }] })).toThrow(RangeError);
    expect(() => validateWish({ part: 'foot', difficulty: 1, requirements: [{ kind: 'length', scope: 'all', min: 0.5 }] })).toThrow(RangeError);
  });

  it('rejects bad ranges and counts', () => {
    expect(() => validateWish({ ...valid, requirements: [{ kind: 'length', scope: 'all' }] })).toThrow(RangeError);
    expect(() => validateWish({ ...valid, requirements: [{ kind: 'length', scope: 'all', min: 0.8, max: 0.2 }] })).toThrow(RangeError);
    expect(() => validateWish({ ...valid, requirements: [{ kind: 'gems', scope: 'all', min: 3, max: 2 }] })).toThrow(RangeError);
    expect(() => validateWish({ ...valid, requirements: [{ kind: 'stickers', scope: 'all', min: 0, max: 6 }] })).toThrow(RangeError);
    expect(() => validateWish({ ...valid, requirements: [{ kind: 'stickers', scope: 'all', min: 1, max: 1, kinds: [] }] })).toThrow(RangeError);
  });

  it('rejects two requirements about the same thing on the same nail', () => {
    const matte = { kind: 'finish', scope: 'all', finish: 'matte' } as const;
    expect(() => validateWish({ ...valid, requirements: [matte, { kind: 'finish', scope: 'ring', finish: 'glitter' }] })).toThrow(RangeError);
    expect(() => validateWish({ ...valid, requirements: [{ ...matte, scope: 'index' }, { kind: 'finish', scope: 'ring', finish: 'glitter' }] })).not.toThrow();
  });
});
