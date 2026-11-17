import { describe, expect, it } from 'vitest';
import { apply, createDesign, createHistory, DEFAULT_TOENAIL, execute, FINGERS, nailAt, type Sticker, TOE_MAX_LENGTH, TOES } from '../../src/core';

const sticker: Sticker = { id: 's1', kind: 'heart', color: '#ff0000', x: 0.5, y: 0.5, size: 0.3, rotation: 0 };

describe('toenails', () => {
  it('a new design has a short squoval nail on every toe and the default on every finger', () => {
    const design = createDesign('Test');
    expect(TOES.every((toe) => design.toenails[toe] === DEFAULT_TOENAIL)).toBe(true);
    expect(FINGERS.every((finger) => design.nails[finger].length === 0.3)).toBe(true);
    expect(DEFAULT_TOENAIL.length).toBeLessThanOrEqual(TOE_MAX_LENGTH);
  });

  it('colours one toe and leaves the others and the fingers alone', () => {
    const design = createDesign('Test');
    const next = apply(design, { type: 'setColor', target: 'bigToe', color: '#C8102E' });
    expect(next.toenails.bigToe.color).toBe('#c8102e');
    expect(next.toenails.secondToe).toBe(design.toenails.secondToe);
    expect(next.nails).toEqual(design.nails);
    expect(design.toenails.bigToe.color).toBe('#e8a0b4');
  });

  it('"toes" changes every toenail but no fingernail, "fingers" the reverse', () => {
    const design = createDesign('Test');
    const toes = apply(design, { type: 'setFinish', target: 'toes', finish: 'matte' });
    expect(TOES.every((toe) => toes.toenails[toe].finish === 'matte')).toBe(true);
    expect(FINGERS.every((finger) => toes.nails[finger].finish === 'gloss')).toBe(true);
    const fingers = apply(design, { type: 'setFinish', target: 'fingers', finish: 'matte' });
    expect(TOES.every((toe) => fingers.toenails[toe].finish === 'gloss')).toBe(true);
  });

  it('allows only short, blunt toenail shapes', () => {
    const design = createDesign('Test');
    expect(apply(design, { type: 'setShape', target: 'toes', shape: 'round' }).toenails.littleToe.shape).toBe('round');
    expect(() => apply(design, { type: 'setShape', target: 'bigToe', shape: 'stiletto' })).toThrow(RangeError);
    expect(() => apply(design, { type: 'setShape', target: 'toes', shape: 'coffin' })).toThrow(RangeError);
    expect(apply(design, { type: 'setShape', target: 'fingers', shape: 'stiletto' }).nails.thumb.shape).toBe('stiletto');
  });

  it('limits the length of toenails but not of fingernails', () => {
    const design = createDesign('Test');
    expect(apply(design, { type: 'setLength', target: 'toes', length: TOE_MAX_LENGTH }).toenails.bigToe.length).toBe(TOE_MAX_LENGTH);
    expect(() => apply(design, { type: 'setLength', target: 'secondToe', length: TOE_MAX_LENGTH + 0.1 })).toThrow(RangeError);
    expect(apply(design, { type: 'setLength', target: 'fingers', length: 1 }).nails.index.length).toBe(1);
  });

  it('puts a sticker on a toe and finds it again by id', () => {
    const added = apply(createDesign('Test'), { type: 'addSticker', target: 'thirdToe', sticker });
    expect(nailAt(added, 'thirdToe').stickers).toHaveLength(1);
    const moved = apply(added, { type: 'updateSticker', target: 'toes', id: 's1', placement: { x: 0.2, y: 0.2, size: 0.3, rotation: 0 } });
    expect(moved.toenails.thirdToe.stickers[0]?.x).toBe(0.2);
    expect(apply(moved, { type: 'removeSticker', target: 'toes', id: 's1' }).toenails.thirdToe.stickers).toHaveLength(0);
    expect(() => apply(createDesign('Test'), { type: 'removeSticker', target: 'toes', id: 's1' })).toThrow(RangeError);
  });

  it('records toe changes in the history and skips the ones that change nothing', () => {
    const history = createHistory(createDesign('Test'));
    expect(execute(history, { type: 'clearGems', target: 'toes' })).toBe(history);
    expect(execute(history, { type: 'setFinish', target: 'toes', finish: 'matte' })).not.toBe(history);
  });
});
