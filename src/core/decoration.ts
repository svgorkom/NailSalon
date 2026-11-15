import { type HexColor, isHexColor } from './design';

/**
 * Positions on a nail are normalised: x runs from the left (0) to the right (1) edge of the nail,
 * y from the free edge (0) to the cuticle (1), seen from above. Sizes are fractions of the nail width.
 */

export const MIN_BRUSH_SIZE = 0.01;
export const MAX_BRUSH_SIZE = 0.2;

/** A brush or eraser stroke. `points` is flat: x0, y0, x1, y1, ... */
export interface Stroke {
  readonly color: HexColor;
  readonly size: number;
  readonly erase: boolean;
  readonly points: readonly number[];
}

export const STICKER_KINDS = ['heart', 'star', 'flower', 'sparkle', 'moon', 'butterfly'] as const;
export type StickerKind = (typeof STICKER_KINDS)[number];

export const MIN_STICKER_SIZE = 0.1;
export const MAX_STICKER_SIZE = 1;

export interface Sticker {
  /** Unique within a nail. */
  readonly id: string;
  readonly kind: StickerKind;
  readonly color: HexColor;
  /** Centre of the sticker. */
  readonly x: number;
  readonly y: number;
  /** Diameter as a fraction of the nail width. */
  readonly size: number;
  /** Clockwise, in degrees, from 0 (inclusive) to 360 (exclusive). */
  readonly rotation: number;
}

/** The part of a sticker that can change after it was placed. */
export type StickerPlacement = Pick<Sticker, 'x' | 'y' | 'size' | 'rotation'>;

function isUnit(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

/** Throws RangeError unless the stroke is complete and inside the nail. */
export function assertStroke(stroke: Stroke): void {
  if (!isHexColor(stroke.color)) throw new RangeError('Stroke colour must be #rrggbb.');
  if (!Number.isFinite(stroke.size) || stroke.size < MIN_BRUSH_SIZE || stroke.size > MAX_BRUSH_SIZE) {
    throw new RangeError(`Brush size must be between ${MIN_BRUSH_SIZE} and ${MAX_BRUSH_SIZE}.`);
  }
  if (stroke.points.length < 2 || stroke.points.length % 2 !== 0) {
    throw new RangeError('A stroke needs at least one point, given as x and y.');
  }
  if (!stroke.points.every(isUnit)) throw new RangeError('Stroke points must be between 0 and 1.');
}

/** Throws RangeError unless the sticker is valid. */
export function assertSticker(sticker: Sticker): void {
  if (sticker.id.length === 0) throw new RangeError('Sticker id must not be empty.');
  if (!STICKER_KINDS.includes(sticker.kind)) throw new RangeError('Unknown sticker.');
  if (!isHexColor(sticker.color)) throw new RangeError('Sticker colour must be #rrggbb.');
  assertPlacement(sticker);
}

/** Throws RangeError unless the placement is valid. */
export function assertPlacement(placement: StickerPlacement): void {
  if (!isUnit(placement.x) || !isUnit(placement.y)) throw new RangeError('Sticker position must be between 0 and 1.');
  if (!Number.isFinite(placement.size) || placement.size < MIN_STICKER_SIZE || placement.size > MAX_STICKER_SIZE) {
    throw new RangeError(`Sticker size must be between ${MIN_STICKER_SIZE} and ${MAX_STICKER_SIZE}.`);
  }
  if (!Number.isFinite(placement.rotation)) throw new RangeError('Sticker rotation must be a number.');
}

/** Brings a rotation in degrees into 0 (inclusive) to 360 (exclusive). */
export function normaliseRotation(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}
