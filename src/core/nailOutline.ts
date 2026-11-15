import { MAX_LENGTH, MIN_LENGTH, type NailShape } from './design';

/** Free edge as a multiple of the nail bed length: a short nail barely passes the fingertip, an extra long one is 1.5 times the nail bed. */
const MIN_FREE_EDGE = 0.08;
const MAX_FREE_EDGE = 1.5;

/** How far the free edge extends beyond the nail bed, as a multiple of the nail bed length. Throws `RangeError` for a length outside 0..1. */
export function freeEdgeRatio(length: number): number {
  if (!Number.isFinite(length) || length < MIN_LENGTH || length > MAX_LENGTH) {
    throw new RangeError(`Length must be between ${MIN_LENGTH} and ${MAX_LENGTH}.`);
  }
  const fraction = (length - MIN_LENGTH) / (MAX_LENGTH - MIN_LENGTH);
  return MIN_FREE_EDGE + (MAX_FREE_EDGE - MIN_FREE_EDGE) * fraction;
}

/**
 * Outline of the free edge: the width at position `s` along it, as a fraction of the full nail width.
 * `s` is 0 where the free edge starts (full width) and 1 at its tip; values outside are clamped.
 */
export function tipWidth(shape: NailShape, s: number): number {
  const t = Math.min(Math.max(s, 0), 1);
  switch (shape) {
    case 'round':
      return Math.sqrt(1 - t ** 2.2);
    case 'oval':
      return (1 - 0.12 * t) * Math.sqrt(1 - t ** 1.7);
    case 'almond':
      return (1 - 0.55 * t ** 1.5) * Math.sqrt(1 - t ** 7);
    case 'square':
      return 1 - 0.1 * t ** 10;
    case 'squoval': {
      // Straight sides, then rounded corners over the last 40%, ending in a flat tip.
      if (t <= 0.6) return 1;
      const corner = (t - 0.6) / 0.4;
      return 1 - 0.55 * (1 - Math.sqrt(1 - corner ** 2));
    }
    case 'stiletto':
      return (1 - t) ** 0.85;
    case 'coffin':
      return (1 - 0.5 * t ** 1.2) * (1 - 0.06 * t ** 12);
  }
}
