import { describe, expect, it } from 'vitest';
import { apply, createDesign, createHistory, execute, FINGERS, type Gem, type Sticker, type Stroke, undo } from '../../src/core';

const stroke: Stroke = { color: '#AA0000', size: 0.05, erase: false, points: [0.1, 0.2, 0.3, 0.4] };
const sticker: Sticker = { id: 's1', kind: 'heart', color: '#ff00aa', x: 0.5, y: 0.5, size: 0.4, rotation: 0 };

describe('strokes', () => {
  it('adds a stroke to the targeted nail only, in order', () => {
    const design = createDesign('Test');
    const next = apply(apply(design, { type: 'addStroke', target: 'ring', stroke }), { type: 'addStroke', target: 'ring', stroke: { ...stroke, erase: true } });

    expect(next.nails.ring.strokes.map((s) => s.erase)).toEqual([false, true]);
    expect(next.nails.index.strokes).toEqual([]);
  });

  it('adds the stroke to every nail for target all and lower-cases the colour', () => {
    const next = apply(createDesign('Test'), { type: 'addStroke', target: 'fingers', stroke });

    expect(FINGERS.every((finger) => next.nails[finger].strokes[0]?.color === '#aa0000')).toBe(true);
  });

  it('does not change the input', () => {
    const design = createDesign('Test');
    const snapshot = structuredClone(design);

    apply(design, { type: 'addStroke', target: 'fingers', stroke });

    expect(design).toEqual(snapshot);
  });

  it.each([
    ['colour', { color: 'red' }],
    ['size too small', { size: 0.001 }],
    ['size too large', { size: 0.5 }],
    ['no points', { points: [] }],
    ['odd points', { points: [0.1, 0.2, 0.3] }],
    ['point outside', { points: [0.1, 1.2] }],
    ['NaN point', { points: [Number.NaN, 0.2] }],
  ])('rejects a stroke with bad %s', (_name, change) => {
    expect(() => apply(createDesign('Test'), { type: 'addStroke', target: 'thumb', stroke: { ...stroke, ...change } })).toThrow(RangeError);
  });

  it('accepts a single point (a dot)', () => {
    const next = apply(createDesign('Test'), { type: 'addStroke', target: 'thumb', stroke: { ...stroke, points: [0.5, 0.5] } });

    expect(next.nails.thumb.strokes).toHaveLength(1);
  });

  it('clears the drawing and records nothing when there is none', () => {
    const drawn = apply(createDesign('Test'), { type: 'addStroke', target: 'thumb', stroke });
    const history = createHistory(createDesign('Test'));

    expect(apply(drawn, { type: 'clearDrawing', target: 'thumb' }).nails.thumb.strokes).toEqual([]);
    expect(execute(history, { type: 'clearDrawing', target: 'fingers' })).toBe(history);
  });

  it('undoes one stroke at a time', () => {
    let history = createHistory(createDesign('Test'));
    history = execute(history, { type: 'addStroke', target: 'thumb', stroke });
    history = execute(history, { type: 'addStroke', target: 'thumb', stroke });

    expect(undo(history).present.nails.thumb.strokes).toHaveLength(1);
  });
});

describe('stickers', () => {
  it('adds a sticker with a normalised colour and rotation', () => {
    const next = apply(createDesign('Test'), { type: 'addSticker', target: 'middle', sticker: { ...sticker, color: '#FF00AA', rotation: -90 } });

    expect(next.nails.middle.stickers).toEqual([{ ...sticker, rotation: 270 }]);
  });

  it('adds the same sticker to all nails', () => {
    const next = apply(createDesign('Test'), { type: 'addSticker', target: 'fingers', sticker });

    expect(FINGERS.every((finger) => next.nails[finger].stickers.length === 1)).toBe(true);
  });

  it('rejects a duplicate id on a nail', () => {
    const design = apply(createDesign('Test'), { type: 'addSticker', target: 'thumb', sticker });

    expect(() => apply(design, { type: 'addSticker', target: 'thumb', sticker })).toThrow(RangeError);
  });

  it.each([
    ['id', { id: '' }],
    ['kind', { kind: 'unicorn' as never }],
    ['colour', { color: 'pink' }],
    ['x', { x: -0.1 }],
    ['y', { y: 1.1 }],
    ['size', { size: 0.05 }],
    ['size too large', { size: 1.5 }],
    ['rotation', { rotation: Number.POSITIVE_INFINITY }],
  ])('rejects a sticker with bad %s', (_name, change) => {
    expect(() => apply(createDesign('Test'), { type: 'addSticker', target: 'thumb', sticker: { ...sticker, ...change } })).toThrow(RangeError);
  });

  it('moves, resizes and rotates a sticker', () => {
    const design = apply(createDesign('Test'), { type: 'addSticker', target: 'thumb', sticker });
    const next = apply(design, { type: 'updateSticker', target: 'thumb', id: 's1', placement: { x: 0.2, y: 0.8, size: 0.6, rotation: 375 } });

    expect(next.nails.thumb.stickers[0]).toMatchObject({ x: 0.2, y: 0.8, size: 0.6, rotation: 15, kind: 'heart' });
  });

  it('updates only the nails that have the sticker', () => {
    let design = apply(createDesign('Test'), { type: 'addSticker', target: 'thumb', sticker });
    design = apply(design, { type: 'addSticker', target: 'index', sticker });
    const next = apply(design, { type: 'updateSticker', target: 'fingers', id: 's1', placement: { x: 0.1, y: 0.1, size: 0.3, rotation: 0 } });

    expect(next.nails.thumb.stickers[0]?.x).toBe(0.1);
    expect(next.nails.index.stickers[0]?.x).toBe(0.1);
    expect(next.nails.middle.stickers).toEqual([]);
  });

  it('rejects updating or removing a sticker that does not exist', () => {
    const design = createDesign('Test');

    expect(() => apply(design, { type: 'updateSticker', target: 'thumb', id: 'x', placement: { x: 0, y: 0, size: 0.5, rotation: 0 } })).toThrow(RangeError);
    expect(() => apply(design, { type: 'removeSticker', target: 'thumb', id: 'x' })).toThrow(RangeError);
  });

  it('removes one sticker and clears all', () => {
    let design = apply(createDesign('Test'), { type: 'addSticker', target: 'thumb', sticker });
    design = apply(design, { type: 'addSticker', target: 'thumb', sticker: { ...sticker, id: 's2' } });

    expect(apply(design, { type: 'removeSticker', target: 'thumb', id: 's1' }).nails.thumb.stickers.map((s) => s.id)).toEqual(['s2']);
    expect(apply(design, { type: 'clearStickers', target: 'thumb' }).nails.thumb.stickers).toEqual([]);
  });

  it('keeps the order of stickers when one is updated', () => {
    let design = apply(createDesign('Test'), { type: 'addSticker', target: 'thumb', sticker });
    design = apply(design, { type: 'addSticker', target: 'thumb', sticker: { ...sticker, id: 's2' } });
    const next = apply(design, { type: 'updateSticker', target: 'thumb', id: 's1', placement: { x: 0.9, y: 0.9, size: 0.4, rotation: 0 } });

    expect(next.nails.thumb.stickers.map((s) => s.id)).toEqual(['s1', 's2']);
  });
});

describe('French tip', () => {
  const french = { color: '#FFFFFF', depth: 0.2 };

  it('sets a French tip with a lower-case colour on the targeted nails', () => {
    const next = apply(createDesign('Test'), { type: 'setFrench', target: 'fingers', french });

    expect(FINGERS.every((finger) => next.nails[finger].french?.color === '#ffffff')).toBe(true);
  });

  it('removes the French tip with null', () => {
    const on = apply(createDesign('Test'), { type: 'setFrench', target: 'ring', french });
    const off = apply(on, { type: 'setFrench', target: 'ring', french: null });

    expect(off.nails.ring.french).toBeNull();
  });

  it('starts without a French tip', () => {
    expect(createDesign('Test').nails.index.french).toBeNull();
  });

  it.each([0.04, 0.51, Number.NaN])('rejects depth %d', (depth) => {
    expect(() => apply(createDesign('Test'), { type: 'setFrench', target: 'thumb', french: { ...french, depth } })).toThrow(RangeError);
  });

  it('rejects an invalid colour', () => {
    expect(() => apply(createDesign('Test'), { type: 'setFrench', target: 'thumb', french: { ...french, color: 'white' } })).toThrow(RangeError);
  });
});

describe('gems', () => {
  const gem: Gem = { id: 'g1', kind: 'diamond', color: '#AABBCC', clear: false, x: 0.5, y: 0.4, size: 0.2, rotation: -30 };

  it('adds a gem with a normalised colour and rotation, apart from the stickers', () => {
    const next = apply(createDesign('Test'), { type: 'addGem', target: 'index', gem });

    expect(next.nails.index.gems).toEqual([{ ...gem, color: '#aabbcc', rotation: 330 }]);
    expect(next.nails.index.stickers).toEqual([]);
    expect(next.nails.middle.gems).toEqual([]);
  });

  it('rejects a duplicate id, an unknown kind and a size outside the range', () => {
    const once = apply(createDesign('Test'), { type: 'addGem', target: 'index', gem });

    expect(() => apply(once, { type: 'addGem', target: 'index', gem })).toThrow(RangeError);
    expect(() => apply(once, { type: 'addGem', target: 'index', gem: { ...gem, id: 'g2', kind: 'ruby' as Gem['kind'] } })).toThrow(RangeError);
    expect(() => apply(once, { type: 'addGem', target: 'index', gem: { ...gem, id: 'g2', size: 0.05 } })).toThrow(RangeError);
    expect(() => apply(once, { type: 'addGem', target: 'index', gem: { ...gem, id: 'g2', size: 0.6 } })).toThrow(RangeError);
  });

  it('moves, resizes and rotates a gem on the nails that have it', () => {
    const placed = apply(createDesign('Test'), { type: 'addGem', target: 'ring', gem });
    const next = apply(placed, { type: 'updateGem', target: 'fingers', id: 'g1', placement: { x: 0.2, y: 0.3, size: 0.3, rotation: 375 } });

    expect(next.nails.ring.gems[0]).toMatchObject({ x: 0.2, y: 0.3, size: 0.3, rotation: 15 });
    expect(next.nails.thumb).toBe(placed.nails.thumb);
  });

  it('rejects updating or removing a gem that does not exist, even if a sticker has that id', () => {
    const design = apply(createDesign('Test'), { type: 'addSticker', target: 'ring', sticker: { ...gem, kind: 'heart' } });

    expect(() => apply(design, { type: 'removeGem', target: 'ring', id: 'g1' })).toThrow(RangeError);
    expect(() => apply(design, { type: 'updateGem', target: 'ring', id: 'g1', placement: gem })).toThrow(RangeError);
  });

  it('changes the colour and clearness of a gem, keeping its place', () => {
    const placed = apply(createDesign('Test'), { type: 'addGem', target: 'fingers', gem });
    const next = apply(placed, { type: 'styleGem', target: 'fingers', id: 'g1', look: { color: '#FF0000', clear: true } });

    expect(next.nails.little.gems[0]).toEqual({ ...placed.nails.little.gems[0], color: '#ff0000', clear: true });
    expect(() => apply(placed, { type: 'styleGem', target: 'fingers', id: 'g1', look: { color: 'red', clear: true } })).toThrow(RangeError);
    expect(() => apply(placed, { type: 'styleGem', target: 'fingers', id: 'nope', look: { color: '#ff0000', clear: true } })).toThrow(RangeError);
  });

  it('changes the kind of a gem, keeping its place and look', () => {
    const placed = apply(createDesign('Test'), { type: 'addGem', target: 'fingers', gem });
    const next = apply(placed, { type: 'setGemKind', target: 'fingers', id: 'g1', kind: 'star' });

    expect(next.nails.little.gems[0]).toEqual({ ...placed.nails.little.gems[0], kind: 'star' });
    expect(() => apply(placed, { type: 'setGemKind', target: 'fingers', id: 'g1', kind: 'ruby' as Gem['kind'] })).toThrow(RangeError);
    expect(() => apply(placed, { type: 'setGemKind', target: 'fingers', id: 'nope', kind: 'star' })).toThrow(RangeError);
  });

  it('removes one gem and clears all, and clearing nothing records nothing', () => {
    const two = apply(apply(createDesign('Test'), { type: 'addGem', target: 'thumb', gem }), { type: 'addGem', target: 'thumb', gem: { ...gem, id: 'g2' } });

    expect(apply(two, { type: 'removeGem', target: 'thumb', id: 'g1' }).nails.thumb.gems.map(({ id }) => id)).toEqual(['g2']);
    expect(apply(two, { type: 'clearGems', target: 'thumb' }).nails.thumb.gems).toEqual([]);
    const history = createHistory(createDesign('Test'));
    expect(execute(history, { type: 'clearGems', target: 'fingers' })).toBe(history);
  });
});
