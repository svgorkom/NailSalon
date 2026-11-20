import { describe, expect, it } from 'vitest';
import { generateWish } from '../../src/core';
import { checklistLine, requirementText, resultMark, starsText, wishText } from '../../src/ui/wishText';

describe('requirementText', () => {
  it('describes each kind of requirement', () => {
    expect(requirementText({ kind: 'colorFamily', scope: 'all', family: 'red' }, 1)).toBe('alle nagels in het rood');
    expect(requirementText({ kind: 'finish', scope: 'ring', finish: 'glitter' }, 1)).toContain('met glitter');
    expect(requirementText({ kind: 'shape', scope: 'all', shape: 'almond' }, 1)).toBe('alle nagels met vorm amandel');
    expect(requirementText({ kind: 'length', scope: 'all', max: 0.3 }, 1)).toBe('alle nagels kort');
    expect(requirementText({ kind: 'length', scope: 'all', min: 0.7 }, 1)).toBe('alle nagels lang');
    expect(requirementText({ kind: 'french', scope: 'all', on: true }, 1)).toBe('alle nagels met een french tip');
    expect(requirementText({ kind: 'french', scope: 'all', on: false }, 1)).toBe('alle nagels zonder french tip');
  });

  it('counts stickers and gems, with their kinds when given', () => {
    expect(requirementText({ kind: 'gems', scope: 'ring', min: 1, max: 1 }, 1)).toBe('de ringvinger met 1 steentje');
    expect(requirementText({ kind: 'stickers', scope: 'all', min: 2, max: 3, kinds: ['heart', 'star'] }, 1)).toBe('alle nagels met 2 tot 3 stickers (hartje of ster)');
  });

  it('capitalises the line of the card', () => {
    expect(checklistLine({ kind: 'colorFamily', scope: 'all', family: 'blue' }, 1)).toBe('Alle nagels in het blauw');
  });
});

describe('wishText', () => {
  it('is the same for the same wish and customer, and names every requirement', () => {
    const wish = generateWish(7, 'hand', 3);
    const text = wishText(wish, 'emma', 1);
    expect(wishText(wish, 'emma', 1)).toBe(text);
    expect(text.endsWith('.')).toBe(true);
    for (const requirement of wish.requirements) expect(text).toContain(requirementText(requirement, 1));
  });

  it('is written for every seed and difficulty without a missing word', () => {
    for (let seed = 0; seed < 200; seed++) {
      for (const difficulty of [1, 2, 3, 4, 5] as const) {
        expect(wishText(generateWish(seed, 'hand', difficulty), 'mei', 1)).not.toMatch(/undefined|\[object/);
      }
    }
  });
});

describe('result text', () => {
  it('shows stars and marks', () => {
    expect(starsText(2)).toBe('★★☆');
    expect(starsText(0)).toBe('☆☆☆');
    expect([resultMark(1), resultMark(0.5), resultMark(0.1)]).toEqual(['✔', '≈', '✖']);
  });
});
