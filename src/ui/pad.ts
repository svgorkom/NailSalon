import type { Sticker } from '../core';
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

/** Pointer position to a position on the nail: 0 to 1, rounded so a stroke stays small. */
export function toNailPoint(clientX: number, clientY: number, rect: PadRect): NailPoint {
  const unit = (value: number) => Math.min(1, Math.max(0, Math.round(value * 1000) / 1000));
  return { x: unit((clientX - rect.left) / rect.width), y: unit((clientY - rect.top) / rect.height) };
}

/** Distance in fractions of the nail width, so that x and y count the same. */
export function distance(a: NailPoint, b: NailPoint): number {
  return Math.hypot(a.x - b.x, ((a.y - b.y) * TEXTURE_HEIGHT) / TEXTURE_WIDTH);
}

export function movedEnough(from: NailPoint, to: NailPoint): boolean {
  return distance(from, to) >= MIN_STEP;
}

/** The topmost sticker under the point, or undefined. A sticker counts as a circle that fits in its size. */
export function stickerAt(stickers: readonly Sticker[], point: NailPoint): Sticker | undefined {
  return stickers.findLast((sticker) => distance(sticker, point) <= sticker.size / 2);
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
