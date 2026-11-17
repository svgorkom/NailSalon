import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apply, createDesign, type Design, FINGERS, type Sticker, type Stroke, TOES } from '../../src/core';
import { NailPaint, paintDab, paintFrenchTip, paintGem, paintNail, paintStroke, TEXTURE_HEIGHT, TEXTURE_WIDTH } from '../../src/scene/nailPaint';

/** A canvas context that records what is called and set, in order. */
function recorder() {
  const log: string[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (_target, name: string) => (...args: unknown[]) => {
      log.push(`${name}(${args.map(String).join(',')})`);
      // A gradient is an object with its own methods; its colour stops are logged too.
      return name === 'createRadialGradient' ? { addColorStop: (...stop: unknown[]) => log.push(`addColorStop(${stop.map(String).join(',')})`) } : undefined;
    },
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

describe('sponge strokes', () => {
  const sponge: Stroke = { color: '#112233', size: 0.4, erase: false, points: [0.3, 0.3, 0.5, 0.5, 0.7, 0.4], sponge: { seed: 99, opacity: 0.4 } };
  const dabLog = (change: Partial<Stroke>, index: number) => {
    const { ctx, log } = recorder();
    paintDab(ctx, { ...sponge, ...change }, index);
    return log;
  };

  it('draws one dab for every point, instead of a line', () => {
    const { ctx, log } = recorder();
    paintStroke(ctx, sponge);

    expect(log.filter((entry) => entry.startsWith('createRadialGradient('))).toHaveLength(3);
    expect(log.some((entry) => entry.startsWith('lineTo('))).toBe(false);
    expect(log).toContain('globalCompositeOperation=source-over');
  });

  it('centres each dab on its point and fades the body out to a transparent colour', () => {
    const log = dabLog({}, 1);

    expect(log.find((entry) => entry.startsWith('createRadialGradient('))).toBe(`createRadialGradient(${0.5 * TEXTURE_WIDTH},${0.5 * TEXTURE_HEIGHT},0,${0.5 * TEXTURE_WIDTH},${0.5 * TEXTURE_HEIGHT},${0.4 * TEXTURE_WIDTH / 2})`);
    expect(log).toContain('addColorStop(1,#11223300)');
  });

  it('repeats exactly for the same seed and dab', () => {
    expect(dabLog({}, 2)).toEqual(dabLog({}, 2));
  });

  it('makes a different pattern for another seed and for another dab', () => {
    // Use the points of the same dab so only the random pores can differ.
    const pores = (log: string[]) => log.filter((entry) => entry.startsWith('arc(')).slice(1);
    const here = { points: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5] };

    expect(pores(dabLog({ ...here, sponge: { seed: 100, opacity: 0.4 } }, 0))).not.toEqual(pores(dabLog(here, 0)));
    expect(pores(dabLog(here, 1))).not.toEqual(pores(dabLog(here, 0)));
  });

  it('leaves less colour per dab at a lower opacity', () => {
    const alphas = (log: string[]) => log.filter((entry) => entry.startsWith('globalAlpha=')).map((entry) => Number(entry.slice('globalAlpha='.length)));

    expect(Math.max(...alphas(dabLog({ sponge: { seed: 99, opacity: 0.2 } }, 0)))).toBeLessThan(Math.max(...alphas(dabLog({ sponge: { seed: 99, opacity: 0.8 } }, 0))));
  });

  it('draws nothing for a stroke that is not a sponge stroke', () => {
    const { ctx, log } = recorder();
    paintDab(ctx, stroke, 0);

    expect(log).toEqual([]);
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

describe('paintGem outlines', () => {
  const gem = { id: 'g1', color: '#3366ff', clear: false, x: 0.5, y: 0.25, size: 0.2, rotation: 0 };

  it.each(['square', 'drop', 'star'] as const)('draws a %s as a closed polygon, with the free edge at the top', (kind) => {
    const { ctx, log } = recorder();
    paintGem(ctx, { ...gem, kind });

    const radius = (0.2 * TEXTURE_WIDTH) / 2;
    expect(log.some((entry) => entry.startsWith('lineTo('))).toBe(true);
    expect(log).toContain('closePath()');
    // The free edge is up (negative y) on the pad, and every outline reaches roughly the size of the gem.
    const ys = log.filter((entry) => /^(moveTo|lineTo)\(/.test(entry)).map((entry) => Number(entry.slice(0, -1).split(',')[1]));
    expect(Math.min(...ys)).toBeLessThan(-radius * 0.9);
    expect(Math.max(...ys)).toBeGreaterThan(radius * 0.8);
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
    expect(changed).toEqual([...FINGERS, ...TOES]);

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

  it('adds only the newest dab of a live sponge stroke, with the pattern it has in the finished stroke', () => {
    const logs: string[][] = [];
    const paint = new NailPaint(() => {
      const { ctx, log } = recorder();
      logs.push(log);
      return { width: 0, height: 0, getContext: () => ctx } as unknown as HTMLCanvasElement;
    });
    const live: Stroke = { color: '#112233', size: 0.4, erase: false, points: [0.3, 0.3, 0.5, 0.5, 0.7, 0.4], sponge: { seed: 99, opacity: 0.4 } };

    paint.extendStroke(design, ['thumb'], live);

    const expected = recorder();
    paintDab(expected.ctx, live, 2);
    // The first canvas that was made is the drawing layer of the thumb.
    expect(logs[0]).toEqual(expected.log);
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
