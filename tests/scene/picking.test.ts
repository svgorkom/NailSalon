import { describe, expect, it } from 'vitest';
import type { Finger } from '../../src/core';
import { nearestDigit, type Point } from '../../src/scene/picking';

const NAILS: Record<Finger, Point> = {
  thumb: [-0.04, 0.04, 0],
  index: [-0.02, 0.17, 0],
  middle: [0, 0.18, 0],
  ring: [0.019, 0.17, 0],
  little: [0.036, 0.13, 0],
};

describe('nearestDigit', () => {
  it('picks the digit whose nail is nearest', () => {
    expect(nearestDigit([0.001, 0.17, 0.002], NAILS, 0.03)).toBe('middle');
    expect(nearestDigit([0.03, 0.14, 0], NAILS, 0.03)).toBe('little');
  });

  it('picks nothing when no nail is within reach, for example a tap on the palm', () => {
    expect(nearestDigit([0, 0.05, 0], NAILS, 0.03)).toBeNull();
  });

  it('picks a nail exactly at the maximum distance, not one beyond it', () => {
    const far: Record<Finger, Point> = { thumb: [0, 0, 0], index: [8, 0, 0], middle: [8, 0, 0], ring: [8, 0, 0], little: [8, 0, 0] };
    expect(nearestDigit([0.5, 0, 0], far, 0.5)).toBe('thumb');
    expect(nearestDigit([0.75, 0, 0], far, 0.5)).toBeNull();
  });
});
