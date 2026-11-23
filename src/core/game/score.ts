import { nailAt, type Design, type Nail } from '../design';
import { colorFamilyMatch } from './colorFamily';
import { lengthLimit, partDigits, type Requirement, scopeDigits, type Wish, type WishPart } from './wish';

/** Scores from which a customer gives 1, 2 or 3 stars. Below the first one the customer is disappointed. */
export const STAR_THRESHOLDS = [0.4, 0.7, 0.9] as const;
export type Stars = 0 | 1 | 2 | 3;

/** A requirement about one finger or toe counts for more than one about all of them. */
const SINGLE_NAIL_WEIGHT = 1.5;
/** A length this far outside the wanted range, as a fraction of the longest length, earns nothing. */
const LENGTH_SOFTNESS = 0.15;
/** Every item too few or too many costs half of the points. */
const COUNT_SOFTNESS = 2;
const EPSILON = 1e-9;

export interface RequirementResult {
  readonly requirement: Requirement;
  /** From 0 to 1; the mean over the nails the requirement is about. */
  readonly score: number;
}

export interface WishResult {
  /** From 0 to 1; the weighted mean of the requirements. */
  readonly score: number;
  readonly stars: Stars;
  readonly results: readonly RequirementResult[];
  /** Whether the player also used free drawing or the sponge on a nail of the part. Not part of the score. */
  readonly creative: boolean;
}

/** How well a design meets a wish. */
export function scoreWish(wish: Wish, design: Design): WishResult {
  const results = wish.requirements.map((requirement) => ({ requirement, score: scoreRequirement(wish.part, requirement, design) }));
  const weights = results.map(({ requirement }) => (requirement.scope === 'all' ? 1 : SINGLE_NAIL_WEIGHT));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const score = results.reduce((sum, { score: part }, index) => sum + part * (weights[index] ?? 0), 0) / total;
  const stars = STAR_THRESHOLDS.filter((threshold) => score >= threshold - EPSILON).length as Stars;
  const creative = partDigits(wish.part).some((digit) => nailAt(design, digit).strokes.length > 0);
  return { score, stars, results, creative };
}

function scoreRequirement(part: WishPart, requirement: Requirement, design: Design): number {
  const digits = scopeDigits(part, requirement.scope);
  const sum = digits.reduce((total, digit) => total + scoreNail(part, requirement, nailAt(design, digit)), 0);
  return sum / digits.length;
}

function scoreNail(part: WishPart, requirement: Requirement, nail: Nail): number {
  switch (requirement.kind) {
    case 'colorFamily':
      return colorFamilyMatch(nail.color, requirement.family);
    case 'finish':
      return nail.finish === requirement.finish ? 1 : 0;
    case 'shape':
      return nail.shape === requirement.shape ? 1 : 0;
    case 'length': {
      const limit = lengthLimit(part);
      return rangeScore(nail.length, requirement.min ?? 0, requirement.max ?? limit, LENGTH_SOFTNESS * limit);
    }
    case 'french':
      return (nail.french !== null) === requirement.on ? 1 : 0;
    case 'sponge': {
      const dabs = nail.strokes.filter((stroke) => stroke.sponge !== undefined && !stroke.erase);
      if (requirement.family === undefined) return dabs.length > 0 ? 1 : 0;
      const { family } = requirement;
      return Math.max(0, ...dabs.map((stroke) => colorFamilyMatch(stroke.color, family)));
    }
    case 'stickers': {
      const { kinds } = requirement;
      const count = kinds === undefined ? nail.stickers.length : nail.stickers.filter((sticker) => kinds.includes(sticker.kind)).length;
      return rangeScore(count, requirement.min, requirement.max, COUNT_SOFTNESS);
    }
    case 'gems': {
      const { kinds } = requirement;
      const count = kinds === undefined ? nail.gems.length : nail.gems.filter((gem) => kinds.includes(gem.kind)).length;
      return rangeScore(count, requirement.min, requirement.max, COUNT_SOFTNESS);
    }
  }
}

/** 1 inside the range, falling in a straight line to 0 at `softness` outside it. */
function rangeScore(value: number, min: number, max: number, softness: number): number {
  const distance = value < min ? min - value : value > max ? value - max : 0;
  return Math.max(0, 1 - distance / softness);
}
