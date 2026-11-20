import { type GemKind, GEM_KINDS, type StickerKind, STICKER_KINDS } from '../decoration';
import { type Digit, FINGERS, type Finish, FINISHES, MAX_LENGTH, MIN_LENGTH, type NailShape, NAIL_SHAPES, TOE_MAX_LENGTH, TOE_SHAPES, TOES } from '../design';
import { COLOR_FAMILIES, type ColorFamily } from './colorFamily';

/** Where a customer wants a design: on the hand or on the foot. */
export type WishPart = 'hand' | 'foot';

/** Which nails a requirement is about: every nail of the part, or one finger or toe. */
export type NailScope = 'all' | Digit;

export const DIFFICULTIES = [1, 2, 3, 4, 5] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Most stickers or gems a customer asks for on one nail. */
export const MAX_WISH_ITEMS = 5;

/**
 * One measurable thing a customer wants. Free drawing and sponge work cannot be measured, so there is no requirement for them.
 * `min` and `max` of the count requirements are the number of items on one nail, both inclusive.
 */
export type Requirement =
  | { readonly kind: 'colorFamily'; readonly scope: NailScope; readonly family: ColorFamily }
  | { readonly kind: 'finish'; readonly scope: NailScope; readonly finish: Finish }
  | { readonly kind: 'shape'; readonly scope: NailScope; readonly shape: NailShape }
  /** At least one of `min` and `max`. Fingernails run from 0 to 1, toenails from 0 to 0.3. */
  | { readonly kind: 'length'; readonly scope: NailScope; readonly min?: number; readonly max?: number }
  | { readonly kind: 'french'; readonly scope: NailScope; readonly on: boolean }
  /** Only stickers of the given kinds count; without `kinds` every sticker does. */
  | { readonly kind: 'stickers'; readonly scope: NailScope; readonly min: number; readonly max: number; readonly kinds?: readonly StickerKind[] }
  | { readonly kind: 'gems'; readonly scope: NailScope; readonly min: number; readonly max: number; readonly kinds?: readonly GemKind[] };

export interface Wish {
  readonly part: WishPart;
  readonly difficulty: Difficulty;
  readonly requirements: readonly Requirement[];
}

/** The nails a part has: five fingers or five toes. */
export function partDigits(part: WishPart): readonly Digit[] {
  return part === 'hand' ? FINGERS : TOES;
}

/** The nails a requirement is about. */
export function scopeDigits(part: WishPart, scope: NailScope): readonly Digit[] {
  return scope === 'all' ? partDigits(part) : [scope];
}

/** The longest length a nail of this part can have. */
export function lengthLimit(part: WishPart): number {
  return part === 'hand' ? MAX_LENGTH : TOE_MAX_LENGTH;
}

/** Throws RangeError unless the wish can be met: valid values, nails of the right part and no two requirements about the same thing. */
export function validateWish(wish: Wish): void {
  if (!DIFFICULTIES.includes(wish.difficulty)) throw new RangeError('Unknown difficulty.');
  if (wish.requirements.length === 0) throw new RangeError('A wish needs at least one requirement.');
  for (const requirement of wish.requirements) assertRequirement(wish.part, requirement);
  assertNoOverlap(wish.requirements);
}

function assertRequirement(part: WishPart, requirement: Requirement): void {
  if (requirement.scope !== 'all' && !partDigits(part).includes(requirement.scope)) {
    throw new RangeError(`${requirement.scope} is not a nail of the ${part}.`);
  }
  switch (requirement.kind) {
    case 'colorFamily':
      if (!COLOR_FAMILIES.includes(requirement.family)) throw new RangeError('Unknown colour.');
      return;
    case 'finish':
      if (!FINISHES.includes(requirement.finish)) throw new RangeError('Unknown finish.');
      return;
    case 'shape':
      if (!(part === 'hand' ? NAIL_SHAPES : TOE_SHAPES).includes(requirement.shape)) throw new RangeError(`The ${part} cannot have the shape ${requirement.shape}.`);
      return;
    case 'length':
      assertLength(part, requirement.min, requirement.max);
      return;
    case 'french':
      if (typeof requirement.on !== 'boolean') throw new RangeError('French must be true or false.');
      return;
    case 'stickers':
      assertCount(requirement.min, requirement.max);
      assertKinds(requirement.kinds, STICKER_KINDS);
      return;
    case 'gems':
      assertCount(requirement.min, requirement.max);
      assertKinds(requirement.kinds, GEM_KINDS);
      return;
  }
}

function assertLength(part: WishPart, min: number | undefined, max: number | undefined): void {
  if (min === undefined && max === undefined) throw new RangeError('A length requirement needs a minimum or a maximum.');
  const limit = lengthLimit(part);
  for (const bound of [min, max]) {
    if (bound !== undefined && (!Number.isFinite(bound) || bound < MIN_LENGTH || bound > limit)) {
      throw new RangeError(`Length must be between ${MIN_LENGTH} and ${limit}.`);
    }
  }
  if (min !== undefined && max !== undefined && min > max) throw new RangeError('The minimum length must not be above the maximum.');
}

function assertCount(min: number, max: number): void {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max > MAX_WISH_ITEMS || min > max || max === 0) {
    throw new RangeError(`Counts must be whole numbers, at most ${MAX_WISH_ITEMS}, with a minimum that is not above the maximum.`);
  }
}

function assertKinds<T extends string>(kinds: readonly T[] | undefined, allowed: readonly T[]): void {
  if (kinds === undefined) return;
  if (kinds.length === 0 || !kinds.every((kind) => allowed.includes(kind))) throw new RangeError('Unknown kind.');
}

function assertNoOverlap(requirements: readonly Requirement[]): void {
  requirements.forEach((a, index) => {
    for (const b of requirements.slice(index + 1)) {
      if (a.kind === b.kind && (a.scope === 'all' || b.scope === 'all' || a.scope === b.scope)) {
        throw new RangeError(`Two ${a.kind} requirements are about the same nail.`);
      }
    }
  });
}
