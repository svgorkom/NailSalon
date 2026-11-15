import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apply, createDesign, type Design, FINGERS, type Sticker, type Stroke } from '../../src/core';
import { NailPaint, paintFrenchTip, paintGem, paintNail, paintStroke, TEXTURE_HEIGHT, TEXTURE_WIDTH } from '../../src/scene/nailPaint';

/** A canvas context that records what is called and set, in order. */
function recorder() {
  const log: string[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (_target, name: string) => (...args: unknown[]) => log.push(`${name}(${args.map(String).join(',')})`),
    set: (_target, name: string, value: unknown) => {
      log.push(`${name}=${String(value)}`);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, log };
}

function fakeCanvas(): HTMLCanvasElement {
  const { ctx } = recorder();
  return { width: 0, height: 0, getContext: () => ctx } as unknown as HTMLCanvasElement;
}

const stroke: Stroke = { color: '#112233', size: 0.1, erase: false, points: [0.1, 0.1, 0.2, 0.3, 0.4, 0.5] };
const sticker: Sticker = { id: 's1', kind: 'heart', color: '#ff00aa', x: 0.5, y: 0.5, size: 0.4, rotation: 90 };

beforeEach(() => {
  vi.stubGlobal('Path2D', function Path2D() {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('paintStroke', () => {
  it('draws a line through the points scaled to the texture', () => {
    const { ctx, log } = recorder();
    paintStroke(ctx, stroke);

    expect(log).toContain(`moveTo(${0.1 * TEXTURE_WIDTH},${0.1 * TEXTURE_HEIGHT})`);
    expect(log).toContain(`lineTo(${0.4 * TEXTURE_WIDTH},${0.5 * TEXTURE_HEIGHT})`);
    expect(log).toContain(`lineWidth=${0.1 * TEXTURE_WIDTH}`);
    expect(log).toContain('globalCompositeOperation=source-over');
  });

  it('removes paint for an eraser stroke', () => {
    const { ctx, log } = recorder();
    paintStroke(ctx, { ...stroke, erase: true });

    expect(log).toContain('globalCompositeOperation=destination-out');
  });

  it('draws a single point as a dot', () => {
    const { ctx, log } = recorder();
    paintStroke(ctx, { ...stroke, points: [0.5, 0.5] });

    expect(log.some((entry) => entry.startsWith('arc('))).toBe(true);
    expect(log.some((entry) => entry.startsWith('lineTo('))).toBe(false);
  });
});

describe('paintNail', () => {
  it('paints the base colour, then the drawing, then the stickers, over the whole texture', () => {
    const { ctx, log } = recorder();
    const nail = { ...createDesign('T').nails.thumb, color: '#abcdef', stickers: [sticker] };
    paintNail(ctx, nail, {} as CanvasImageSource);

    const order = ['fillStyle=#abcdef', 'fillRect(', 'drawImage(', 'rotate(', 'fill('].map((part) => log.findIndex((entry) => entry.startsWith(part)));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('rotates a sticker clockwise by its angle', () => {
    const { ctx, log } = recorder();
    paintNail(ctx, { ...createDesign('T').nails.thumb, stickers: [sticker] }, {} as CanvasImageSource);

    expect(log).toContain(`rotate(${Math.PI / 2})`);
  });

  it('paints the French tip after the base colour and before the drawing', () => {
    const { ctx, log } = recorder();
    paintNail(ctx, { ...createDesign('T').nails.thumb, color: '#abcdef', french: { color: '#ffffff', depth: 0.25 } }, {} as CanvasImageSource);

    const order = ['fillStyle=#abcdef', 'fillStyle=#ffffff', 'drawImage('].map((part) => log.indexOf(log.find((entry) => entry.startsWith(part)) ?? ''));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('does not paint gems on the texture', () => {
    const { ctx, log } = recorder();
    const gem = { ...sticker, kind: 'diamond' as const, color: '#00ff00', clear: false };
    paintNail(ctx, { ...createDesign('T').nails.thumb, gems: [gem] }, {} as CanvasImageSource);

    expect(log).not.toContain('fillStyle=#00ff00');
  });
});

describe('paintGem', () => {
  const gem = { id: 'g1', kind: 'diamond' as const, color: '#3366ff', clear: false, x: 0.5, y: 0.25, size: 0.2, rotation: 0 };

  it('draws the gem in its colour at its place, solid unless it is clear', () => {
    const solid = recorder();
    paintGem(solid.ctx, gem);
    const clear = recorder();
    paintGem(clear.ctx, { ...gem, clear: true });

    expect(solid.log).toContain(`translate(${0.5 * TEXTURE_WIDTH},${0.25 * TEXTURE_HEIGHT})`);
    expect(solid.log).toContain('fillStyle=#3366ff');
    expect(solid.log.find((entry) => entry.startsWith('globalAlpha='))).toBe('globalAlpha=1');
    expect(clear.log.find((entry) => entry.startsWith('globalAlpha='))).not.toBe('globalAlpha=1');
  });
});

describe('paintFrenchTip', () => {
  it('ends deepest at the sides, with a smile line that is shallower in the middle', () => {
    const { ctx, log } = recorder();
    paintFrenchTip(ctx, { color: '#ffffff', depth: 0.25 });

    const side = 0.25 * TEXTURE_HEIGHT;
    expect(log).toContain(`lineTo(${TEXTURE_WIDTH},${side})`);
    const curve = log.find((entry) => entry.startsWith('quadraticCurveTo('));
    const [, controlY, endX, endY] = (curve ?? '').slice('quadraticCurveTo('.length, -1).split(',').map(Number);
    expect([endX, endY]).toEqual([0, side]);
    // The curve's middle lies halfway between its ends and its control point.
    expect(((controlY ?? 0) + side) / 2).toBeLessThan(side);
    expect(((controlY ?? 0) + side) / 2).toBeGreaterThan(0);
  });
});

describe('NailPaint', () => {
  const design = createDesign('T');

  it('gives the same canvas for a nail every time', () => {
    const paint = new NailPaint(fakeCanvas);

    expect(paint.canvas('thumb')).toBe(paint.canvas('thumb'));
    expect(paint.canvas('thumb')).not.toBe(paint.canvas('index'));
  });

  it('paints every nail on the first sync and only changed nails after that', () => {
    const paint = new NailPaint(fakeCanvas);
    const changed: string[] = [];
    paint.subscribe((finger) => changed.push(finger));

    paint.sync(design);
    expect(changed).toEqual([...FINGERS]);

    changed.length = 0;
    paint.sync(design);
    expect(changed).toEqual([]);

    paint.sync(apply(design, { type: 'setColor', target: 'ring', color: '#010203' }));
    expect(changed).toEqual(['ring']);
  });

  it('shows a live stroke at once and repaints from the design afterwards', () => {
    const paint = new NailPaint(fakeCanvas);
    paint.sync(design);
    const changed: string[] = [];
    paint.subscribe((finger) => changed.push(finger));

    paint.extendStroke(design, ['thumb', 'index'], stroke);
    expect(changed).toEqual(['thumb', 'index']);

    changed.length = 0;
    paint.sync(design);
    expect(changed).toEqual(['thumb', 'index']);
  });

  it('stops notifying after unsubscribe', () => {
    const paint = new NailPaint(fakeCanvas);
    const changed: string[] = [];
    const stop = paint.subscribe((finger) => changed.push(finger));
    stop();

    paint.sync(design as Design);

    expect(changed).toEqual([]);
  });
});
