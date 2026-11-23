import { GEM_KINDS, type StickerKind } from '../decoration';
import { FINISHES, NAIL_SHAPES, TOE_SHAPES } from '../design';
import { COLOR_FAMILIES } from './colorFamily';
import { type Difficulty, lengthLimit, partDigits, type Requirement, validateWish, type Wish, type WishPart } from './wish';

type Kind = Requirement['kind'];

/** The requirements every wish can draw from. */
const BASE_KINDS = ['colorFamily', 'finish', 'shape', 'french', 'sponge'] as const satisfies readonly Kind[];
const DECORATION_KINDS = ['stickers', 'gems'] as const satisfies readonly Kind[];

/** Stickers a customer names; the rest of the library is too hard to ask for in words. */
const FRIENDLY_STICKERS: readonly StickerKind[] = ['heart', 'star', 'flower', 'butterfly', 'moon', 'sparkle'];

/** The same seed always gives the same numbers (mulberry32). `seed` is an unsigned 32-bit integer. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Random = () => number;

function pickOne<T>(random: Random, items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) throw new RangeError('Nothing to pick from.');
  return item;
}

function pickDistinct<T>(random: Random, items: readonly T[], count: number): T[] {
  return items
    .map((item) => ({ item, key: random() }))
    .sort((a, b) => a.key - b.key)
    .slice(0, count)
    .map(({ item }) => item);
}

function randomInt(random: Random, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

function makeRequirement(random: Random, part: WishPart, kind: Kind, scope: Requirement['scope']): Requirement {
  switch (kind) {
    case 'colorFamily':
      return { kind, scope, family: pickOne(random, COLOR_FAMILIES) };
    case 'finish':
      return { kind, scope, finish: pickOne(random, FINISHES) };
    case 'shape':
      return { kind, scope, shape: pickOne(random, part === 'hand' ? NAIL_SHAPES : TOE_SHAPES) };
    case 'french':
      return { kind, scope, on: true };
    case 'sponge':
      return random() < 0.5 ? { kind, scope, family: pickOne(random, COLOR_FAMILIES) } : { kind, scope };
    case 'length': {
      const limit = lengthLimit(part);
      return random() < 0.5 ? { kind, scope, max: 0.4 * limit } : { kind, scope, min: 0.6 * limit };
    }
    case 'stickers': {
      const count = randomInt(random, 1, 2);
      const base = { kind, scope, min: count, max: count } as const;
      return random() < 0.5 ? { ...base, kinds: [pickOne(random, FRIENDLY_STICKERS)] } : base;
    }
    case 'gems': {
      const count = randomInt(random, 1, 2);
      const base = { kind, scope, min: count, max: count } as const;
      return random() < 0.5 ? { ...base, kinds: [pickOne(random, GEM_KINDS)] } : base;
    }
  }
}

/** One extra decoration on a single nail: "only on the ring finger a gem". */
function makeAccent(random: Random, part: WishPart): Requirement {
  return makeRequirement(random, part, pickOne(random, DECORATION_KINDS), pickOne(random, partDigits(part)));
}

/**
 * Decorations on `count` different nails, stickers and gems taking turns. With `combo` the first of those nails gets both a sticker and a gem.
 * Requirements of one kind never share a nail, so these never clash with each other.
 */
function makeAccents(random: Random, part: WishPart, count: number, combo: boolean): Requirement[] {
  const digits = pickDistinct(random, partDigits(part), count);
  const offset = randomInt(random, 0, 1);
  const accents = digits.map((digit, index) => makeRequirement(random, part, DECORATION_KINDS[(index + offset) % 2] ?? 'stickers', digit));
  const first = digits[0];
  if (!combo || first === undefined) return accents;
  const other = DECORATION_KINDS[(offset + 1) % 2] ?? 'gems';
  return [...accents, makeRequirement(random, part, other, first)];
}

function requirementsFor(random: Random, part: WishPart, difficulty: Difficulty): Requirement[] {
  const forAll = (kinds: readonly Kind[]) => kinds.map((kind) => makeRequirement(random, part, kind, 'all'));
  switch (difficulty) {
    case 1:
      return forAll(pickDistinct(random, BASE_KINDS, 1));
    case 2:
      return forAll(pickDistinct(random, BASE_KINDS, 2));
    case 3:
      return forAll(pickDistinct(random, [...BASE_KINDS, ...DECORATION_KINDS], 3));
    case 4:
      return [...forAll(pickDistinct(random, BASE_KINDS, 2)), makeAccent(random, part)];
    case 5:
      return [...forAll([...pickDistinct(random, BASE_KINDS, 3), 'length']), makeAccent(random, part)];
    case 6:
      return [...forAll([...pickDistinct(random, BASE_KINDS, 3), 'length']), ...makeAccents(random, part, 2, false)];
    case 7:
      return [...forAll([...pickDistinct(random, BASE_KINDS, 3), 'length']), ...makeAccents(random, part, 3, true)];
  }
}

/**
 * A wish for a customer. The same seed, part and difficulty always give the same wish, so a day of customers can be repeated.
 * 1: one thing; 2: two things; 3: three things, decorations included; 4: two things and one decoration on a single nail;
 * 5: three things, a length and one decoration on a single nail;
 * 6: the same, with decorations on two different nails;
 * 7: the same, with decorations on three different nails, one of them with a sticker and a gem together.
 */
export function generateWish(seed: number, part: WishPart, difficulty: Difficulty): Wish {
  const wish: Wish = { part, difficulty, requirements: requirementsFor(createRandom(seed), part, difficulty) };
  validateWish(wish);
  return wish;
}
