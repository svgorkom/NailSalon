import { describe, expect, it } from 'vitest';
import type { Sticker } from '../../src/core';
import { movedEnough, stickerAt, toNailPoint } from '../../src/ui/pad';

const rect = { left: 100, top: 50, width: 200, height: 250 };
const sticker = (id: string, x: number, y: number, size: number): Sticker => ({ id, kind: 'star', color: '#ffffff', x, y, size, rotation: 0 });

describe('toNailPoint', () => {
  it('maps the pad to 0..1 and rounds to three decimals', () => {
    expect(toNailPoint(200, 175, rect)).toEqual({ x: 0.5, y: 0.5 });
    expect(toNailPoint(101, 51, rect)).toEqual({ x: 0.005, y: 0.004 });
  });

  it('clamps points outside the pad', () => {
    expect(toNailPoint(0, 1000, rect)).toEqual({ x: 0, y: 1 });
  });
});

describe('movedEnough', () => {
  it('ignores tiny moves', () => {
    expect(movedEnough({ x: 0.5, y: 0.5 }, { x: 0.501, y: 0.5 })).toBe(false);
    expect(movedEnough({ x: 0.5, y: 0.5 }, { x: 0.52, y: 0.5 })).toBe(true);
  });

  it('counts a step along the nail as longer than the same step across it', () => {
    expect(movedEnough({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5036 })).toBe(true);
    expect(movedEnough({ x: 0.5, y: 0.5 }, { x: 0.5036, y: 0.5 })).toBe(false);
  });
});

describe('stickerAt', () => {
  it('finds the topmost sticker under the point', () => {
    const stickers = [sticker('a', 0.5, 0.5, 0.4), sticker('b', 0.5, 0.5, 0.2)];

    expect(stickerAt(stickers, { x: 0.5, y: 0.5 })?.id).toBe('b');
    expect(stickerAt(stickers, { x: 0.65, y: 0.5 })?.id).toBe('a');
  });

  it('finds nothing away from every sticker', () => {
    expect(stickerAt([sticker('a', 0.2, 0.2, 0.2)], { x: 0.8, y: 0.8 })).toBeUndefined();
  });
});
