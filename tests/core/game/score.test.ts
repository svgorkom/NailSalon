import { describe, expect, it } from 'vitest';
import { apply, type Command, createDesign, type Design, scoreWish, type Sticker, type Wish } from '../../../src/core';

const handWish = (...requirements: Wish['requirements']): Wish => ({ part: 'hand', difficulty: 1, requirements });
const play = (design: Design, ...commands: Command[]) => commands.reduce(apply, design);
const sticker = (id: string, kind: Sticker['kind'] = 'heart'): Sticker => ({ id, kind, color: '#ffffff', x: 0.5, y: 0.5, size: 0.3, rotation: 0 });

describe('scoring a wish', () => {
  it('gives no points for a design that does none of it, and all for one that does', () => {
    const wish = handWish({ kind: 'finish', scope: 'all', finish: 'matte' });
    expect(scoreWish(wish, createDesign('T')).score).toBe(0);
    const done = play(createDesign('T'), { type: 'setFinish', target: 'fingers', finish: 'matte' });
    expect(scoreWish(wish, done)).toMatchObject({ score: 1, stars: 3 });
  });

  it('counts the share of nails that are right', () => {
    const wish = handWish({ kind: 'finish', scope: 'all', finish: 'matte' });
    const two = play(createDesign('T'), { type: 'setFinish', target: 'thumb', finish: 'matte' }, { type: 'setFinish', target: 'index', finish: 'matte' });
    expect(scoreWish(wish, two).score).toBeCloseTo(0.4);
  });

  it('lets a length drift away slowly: a little off is a little less', () => {
    const wish = handWish({ kind: 'length', scope: 'all', max: 0.4 });
    const at = (length: number) => scoreWish(wish, play(createDesign('T'), { type: 'setLength', target: 'fingers', length })).score;
    expect(at(0.4)).toBe(1);
    expect(at(0.475)).toBeCloseTo(0.5);
    expect(at(0.7)).toBe(0);
  });

  it('takes half the points off for every sticker too many or too few, and counts only the wanted kinds', () => {
    const wish = handWish({ kind: 'stickers', scope: 'ring', min: 2, max: 2, kinds: ['heart'] });
    const withStickers = (...stickers: Sticker[]) => scoreWish(wish, play(createDesign('T'), ...stickers.map((s): Command => ({ type: 'addSticker', target: 'ring', sticker: s })))).score;
    expect(withStickers(sticker('a'), sticker('b'))).toBe(1);
    expect(withStickers(sticker('a'))).toBe(0.5);
    expect(withStickers(sticker('a'), sticker('b'), sticker('c'))).toBe(0.5);
    expect(withStickers(sticker('a'), sticker('b', 'star'))).toBe(0.5);
    expect(withStickers()).toBe(0);
  });

  it('counts a requirement about one nail for more than one about all nails', () => {
    const wish = handWish({ kind: 'french', scope: 'all', on: true }, { kind: 'gems', scope: 'ring', min: 2, max: 2 });
    const onlyFrench = play(createDesign('T'), { type: 'setFrench', target: 'fingers', french: { color: '#ffffff', depth: 0.2 } });
    expect(scoreWish(wish, onlyFrench).score).toBeCloseTo(1 / 2.5);
  });

  it('turns the score into stars at 0.4, 0.7 and 0.9', () => {
    const wish = handWish({ kind: 'french', scope: 'all', on: true });
    const stars = (nails: number) => {
      const digits = ['thumb', 'index', 'middle', 'ring', 'little'] as const;
      const design = play(createDesign('T'), ...digits.slice(0, nails).map((d): Command => ({ type: 'setFrench', target: d, french: { color: '#ffffff', depth: 0.2 } })));
      return scoreWish(wish, design).stars;
    };
    expect([stars(1), stars(2), stars(3), stars(4), stars(5)]).toEqual([0, 1, 1, 2, 3]);
  });

  it('only looks at the nails of the part, and flags free drawing without scoring it', () => {
    const wish: Wish = { part: 'foot', difficulty: 1, requirements: [{ kind: 'finish', scope: 'all', finish: 'chrome' }] };
    const fingers = play(createDesign('T'), { type: 'setFinish', target: 'fingers', finish: 'chrome' });
    expect(scoreWish(wish, fingers)).toMatchObject({ score: 0, creative: false });
    const painted = play(createDesign('T'), { type: 'addStroke', target: 'bigToe', stroke: { color: '#ff0000', size: 0.05, erase: false, points: [0.2, 0.2, 0.6, 0.6] } });
    expect(scoreWish(wish, painted)).toMatchObject({ score: 0, creative: true });
  });
});
