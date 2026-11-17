import type { FrenchTip, Gem, Sticker, Stroke } from './decoration';

/** Fingers in order from thumb to little finger. */
export const FINGERS = ['thumb', 'index', 'middle', 'ring', 'little'] as const;
export type Finger = (typeof FINGERS)[number];

/** Toes in order from the big toe to the little toe. */
export const TOES = ['bigToe', 'secondToe', 'thirdToe', 'fourthToe', 'littleToe'] as const;
export type Toe = (typeof TOES)[number];

/** A finger or a toe: the place of one nail. */
export type Digit = Finger | Toe;

export function isToe(digit: Digit): digit is Toe {
  return (TOES as readonly string[]).includes(digit);
}

export const NAIL_SHAPES = ['round', 'oval', 'almond', 'square', 'squoval', 'stiletto', 'coffin'] as const;
export type NailShape = (typeof NAIL_SHAPES)[number];

export const FINISHES = ['gloss', 'matte', 'glitter', 'metallic', 'chrome'] as const;
export type Finish = (typeof FINISHES)[number];

/** Free edge length beyond the fingertip: 0 is short, 1 is extra long. */
export const MIN_LENGTH = 0;
export const MAX_LENGTH = 1;

/** Longest name a design may have. */
export const MAX_NAME_LENGTH = 60;

/** Toenails are short and not pointed: fewer shapes and a lower maximum length than fingernails. */
export const TOE_SHAPES: readonly NailShape[] = ['round', 'oval', 'square', 'squoval'];
export const TOE_MAX_LENGTH = 0.3;

/** A colour as `#rrggbb`. */
export type HexColor = string;

export interface Nail {
  readonly shape: NailShape;
  readonly length: number;
  readonly color: HexColor;
  readonly finish: Finish;
  /** Painted over the base colour, under the drawing; null for none. */
  readonly french: FrenchTip | null;
  /** Free drawing, oldest first. */
  readonly strokes: readonly Stroke[];
  /** Stickers, bottom first. */
  readonly stickers: readonly Sticker[];
  /** Rhinestones and pearls, on top of everything. */
  readonly gems: readonly Gem[];
}

export interface Design {
  readonly name: string;
  /** The fingernails of the hand. */
  readonly nails: Readonly<Record<Finger, Nail>>;
  /** The toenails of the foot. */
  readonly toenails: Readonly<Record<Toe, Nail>>;
}

export const DEFAULT_NAIL: Nail = { shape: 'almond', length: 0.3, color: '#e8a0b4', finish: 'gloss', french: null, strokes: [], stickers: [], gems: [] };

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

export const DEFAULT_TOENAIL: Nail = { ...DEFAULT_NAIL, shape: 'squoval', length: 0.1 };

/** A new design with the default nail on every finger and every toe. */
export function createDesign(name: string): Design {
  const nails = Object.fromEntries(FINGERS.map((finger) => [finger, DEFAULT_NAIL])) as Record<Finger, Nail>;
  const toenails = Object.fromEntries(TOES.map((toe) => [toe, DEFAULT_TOENAIL])) as Record<Toe, Nail>;
  return { name, nails, toenails };
}

/** The nail at a finger or a toe. */
export function nailAt(design: Design, digit: Digit): Nail {
  return isToe(digit) ? design.toenails[digit] : design.nails[digit];
}
