import { describe, expect, it } from 'vitest';
import { freeEdgeRatio, NAIL_SHAPES, tipWidth } from '../../src/core';

describe('freeEdgeRatio', () => {
  it('grows from short to extra long', () => {
    expect(freeEdgeRatio(0)).toBeCloseTo(0.08);
    expect(freeEdgeRatio(1)).toBeCloseTo(1.5);
    expect(freeEdgeRatio(0.5)).toBeGreaterThan(freeEdgeRatio(0.25));
  });

  it('throws for a length outside 0..1', () => {
    expect(() => freeEdgeRatio(-0.1)).toThrow(RangeError);
    expect(() => freeEdgeRatio(1.1)).toThrow(RangeError);
    expect(() => freeEdgeRatio(Number.NaN)).toThrow(RangeError);
  });
});

describe('tipWidth', () => {
  const steps = Array.from({ length: 101 }, (_, i) => i / 100);

  it.each(NAIL_SHAPES)('%s starts at full width and never widens again', (shape) => {
    expect(tipWidth(shape, 0)).toBeCloseTo(1);
    for (let i = 1; i < steps.length; i++) {
      const [before, after] = [tipWidth(shape, steps[i - 1] ?? 0), tipWidth(shape, steps[i] ?? 1)];
      expect(after).toBeLessThanOrEqual(before + 1e-9);
      expect(after).toBeGreaterThanOrEqual(0);
    }
  });

  it('clamps positions outside the free edge', () => {
    expect(tipWidth('almond', -1)).toBe(tipWidth('almond', 0));
    expect(tipWidth('almond', 2)).toBe(tipWidth('almond', 1));
  });

  it('ends in a point for stiletto, round, oval and almond, and flat for square, squoval and coffin', () => {
    for (const shape of ['stiletto', 'round', 'oval', 'almond'] as const) expect(tipWidth(shape, 1)).toBeLessThan(0.1);
    expect(tipWidth('square', 1)).toBeGreaterThan(0.85);
    expect(tipWidth('squoval', 1)).toBeCloseTo(0.45);
    expect(tipWidth('coffin', 1)).toBeCloseTo(0.47, 1);
  });

  it('keeps the sides of a squoval straight for the first 60%', () => {
    expect(tipWidth('squoval', 0.6)).toBe(1);
    expect(tipWidth('squoval', 0.9)).toBeLessThan(1);
  });

  it('tapers more for stiletto than for almond, and more for almond than for round', () => {
    expect(tipWidth('stiletto', 0.5)).toBeLessThan(tipWidth('almond', 0.5));
    expect(tipWidth('almond', 0.5)).toBeLessThan(tipWidth('round', 0.5));
  });
});
