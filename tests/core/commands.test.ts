import { describe, expect, it } from 'vitest';
import { apply, createDesign, FINGERS } from '../../src/core';

describe('apply', () => {
  it('changes only the targeted nail', () => {
    const design = createDesign('Test');
    const next = apply(design, { type: 'setShape', target: 'ring', shape: 'coffin' });

    expect(next.nails.ring.shape).toBe('coffin');
    for (const finger of FINGERS.filter((f) => f !== 'ring')) {
      expect(next.nails[finger]).toEqual(design.nails[finger]);
    }
  });

  it('changes every nail for target all', () => {
    const next = apply(createDesign('Test'), { type: 'setFinish', target: 'all', finish: 'chrome' });

    expect(FINGERS.every((finger) => next.nails[finger].finish === 'chrome')).toBe(true);
  });

  it('does not change the input design', () => {
    const design = createDesign('Test');
    const snapshot = structuredClone(design);

    apply(design, { type: 'setColor', target: 'all', color: '#112233' });

    expect(design).toEqual(snapshot);
  });

  it('normalises colours to lower case', () => {
    const next = apply(createDesign('Test'), { type: 'setColor', target: 'thumb', color: '#AABBCC' });

    expect(next.nails.thumb.color).toBe('#aabbcc');
  });

  it.each(['red', '#abc', '#gggggg', ''])('rejects colour %j', (color) => {
    expect(() => apply(createDesign('Test'), { type: 'setColor', target: 'thumb', color })).toThrow(RangeError);
  });

  it.each([-0.01, 1.01, Number.NaN])('rejects length %d', (length) => {
    expect(() => apply(createDesign('Test'), { type: 'setLength', target: 'thumb', length })).toThrow(RangeError);
  });

  it('accepts the length bounds', () => {
    const short = apply(createDesign('Test'), { type: 'setLength', target: 'thumb', length: 0 });
    const long = apply(short, { type: 'setLength', target: 'thumb', length: 1 });

    expect(long.nails.thumb.length).toBe(1);
  });

  it('trims names and rejects empty ones', () => {
    expect(apply(createDesign('Test'), { type: 'rename', name: '  Zomer  ' }).name).toBe('Zomer');
    expect(() => apply(createDesign('Test'), { type: 'rename', name: '   ' })).toThrow(RangeError);
  });
});
