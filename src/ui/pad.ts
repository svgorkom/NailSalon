import { TEXTURE_HEIGHT, TEXTURE_WIDTH } from '../scene/nailPaint';

export interface NailPoint {
  readonly x: number;
  readonly y: number;
}

export interface PadRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** A point is only added to a stroke when it moved at least this far, as a fraction of the nail width. */
const MIN_STEP = 0.004;

/** A new sponge dab comes after the pointer moved this fraction of the dab size, so dabs overlap and blend. */
const SPONGE_SPACING = 0.3;

/** How far the pointer must move before the next sponge dab. */
export function spongeStep(size: number): number {
  return size * SPONGE_SPACING;
}

/** Pointer position to a position on the nail: 0 to 1, rounded so a stroke stays small. */
export function toNailPoint(clientX: number, clientY: number, rect: PadRect): NailPoint {
  const unit = (value: number) => Math.min(1, Math.max(0, Math.round(value * 1000) / 1000));
  return { x: unit((clientX - rect.left) / rect.width), y: unit((clientY - rect.top) / rect.height) };
}

/** Distance in fractions of the nail width, so that x and y count the same. */
export function distance(a: NailPoint, b: NailPoint): number {
  return Math.hypot(a.x - b.x, ((a.y - b.y) * TEXTURE_HEIGHT) / TEXTURE_WIDTH);
}

export function movedEnough(from: NailPoint, to: NailPoint, step: number = MIN_STEP): boolean {
  return distance(from, to) >= step;
}

/** The topmost sticker or gem under the point, or undefined. Each counts as a circle that fits in its size. */
export function stickerAt<T extends NailPoint & { readonly size: number }>(items: readonly T[], point: NailPoint): T | undefined {
  return items.findLast((item) => distance(item, point) <= item.size / 2);
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
