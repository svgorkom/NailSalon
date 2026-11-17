import { describe, expect, it } from 'vitest';
import { apply, createDesign, type Design, parseDesign } from '../../src/core';

function decorated(): Design {
  let design = createDesign('Zomer');
  design = apply(design, { type: 'setFrench', target: 'fingers', french: { color: '#f7f3ee', depth: 0.25 } });
  design = apply(design, { type: 'addStroke', target: 'index', stroke: { color: '#C8102E', size: 0.06, erase: false, points: [0.1, 0.2, 0.3, 0.4] } });
  design = apply(design, { type: 'addSticker', target: 'thumb', sticker: { id: 's1', kind: 'heart', color: '#ffffff', x: 0.5, y: 0.5, size: 0.3, rotation: -90 } });
  design = apply(design, { type: 'setColor', target: 'toes', color: '#C8102E' });
  return apply(design, { type: 'addGem', target: 'ring', gem: { id: 'g2', kind: 'pearl', color: '#f7f3ee', clear: false, x: 0.5, y: 0.6, size: 0.2, rotation: 0 } });
}

/** Plain JSON data; tests change it freely. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON of any shape
type Data = any;

/** A copy of the design as plain data, with one field changed by `change`. */
function broken(change: (data: Data) => void): unknown {
  const data = JSON.parse(JSON.stringify(decorated()));
  change(data);
  return data;
}

describe('parseDesign', () => {
  it('returns a design that went through JSON unchanged', () => {
    const design = decorated();
    expect(parseDesign(JSON.parse(JSON.stringify(design)))).toEqual(design);
  });

  it('trims the name', () => {
    expect(parseDesign(broken((data) => (data.name = '  Zomer  '))).name).toBe('Zomer');
  });

  it.each([
    ['no object', () => null],
    ['an empty name', () => broken((data) => (data.name = ' '))],
    ['a name that is too long', () => broken((data) => (data.name = 'x'.repeat(61)))],
    ['a missing finger', () => broken((data) => delete data.nails.little)],
    ['missing toenails', () => broken((data) => delete data.toenails)],
    ['a pointed toenail', () => broken((data) => (data.toenails.bigToe.shape = 'stiletto'))],
    ['a long toenail', () => broken((data) => (data.toenails.bigToe.length = 0.5))],
    ['an unknown shape', () => broken((data) => (data.nails.thumb.shape = 'blob'))],
    ['a length out of range', () => broken((data) => (data.nails.thumb.length = 2))],
    ['a colour in upper case', () => broken((data) => (data.nails.thumb.color = '#FFFFFF'))],
    ['a bad French tip', () => broken((data) => (data.nails.thumb.french = { color: '#ffffff', depth: 0.9 }))],
    ['a stroke point outside the nail', () => broken((data) => (data.nails.index.strokes[0].points = [0.1, 1.5]))],
    ['a stroke point that is text', () => broken((data) => (data.nails.index.strokes[0].points = ['0.1', 0.2]))],
    ['an unknown sticker', () => broken((data) => (data.nails.thumb.stickers[0].kind = 'skull'))],
    ['a rotation of 360', () => broken((data) => (data.nails.thumb.stickers[0].rotation = 360))],
    ['two gems with one id', () => broken((data) => data.nails.ring.gems.push(data.nails.ring.gems[0]))],
    ['strokes that are not a list', () => broken((data) => (data.nails.index.strokes = {}))],
  ])('rejects %s', (_, make) => {
    expect(() => parseDesign(make())).toThrow(RangeError);
  });
});
