import { describe, expect, it } from 'vitest';
import { AI_MAX_DECORATIONS, aiAnswerSchema, apply, createDesign, type Design, FINGERS, parseAiAnswer, TOES } from '../../src/core';

/** Plain JSON data; tests change it freely. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON of any shape
type Data = any;

function aiNail(): Data {
  return {
    shape: 'squoval',
    length: 0.2,
    color: '#7B2CBF',
    finish: 'glitter',
    french: { color: '#ffffff', depth: 0.2 },
    stickers: [{ kind: 'star', color: '#ffd700', x: 0.5, y: 0.5, size: 0.3, rotation: 15 }],
    gems: [{ kind: 'diamond', color: '#ffffff', clear: true, x: 0.5, y: 0.8, size: 0.15, rotation: 0 }],
  };
}

function answer(digits: readonly string[], change: (data: Data) => void = () => {}): unknown {
  const data: Data = { name: 'Paarse sterren', message: 'Paars met gouden sterren.', nails: Object.fromEntries(digits.map((digit) => [digit, aiNail()])) };
  change(data);
  return data;
}

function counter(): () => string {
  let next = 0;
  return () => `ai${++next}`;
}

function drawn(): Design {
  return apply(createDesign('Mijn ontwerp'), { type: 'addStroke', target: 'index', stroke: { color: '#c8102e', size: 0.06, erase: false, points: [0.1, 0.2, 0.3, 0.4] } });
}

describe('aiAnswerSchema', () => {
  it('asks for every finger of the hand', () => {
    const schema: Data = aiAnswerSchema('hand');
    expect(schema.properties.nails.required).toEqual(FINGERS);
    expect(schema.properties.nails.properties.thumb.properties.shape.enum).toContain('stiletto');
  });

  it('asks for every toe of the foot, with toenail shapes and length', () => {
    const toenail: Data = (aiAnswerSchema('foot') as Data).properties.nails.properties.bigToe;
    expect((aiAnswerSchema('foot') as Data).properties.nails.required).toEqual(TOES);
    expect(toenail.properties.shape.enum).not.toContain('stiletto');
    expect(toenail.properties.length.maximum).toBe(0.3);
  });

  it('never lets the AI make strokes or ids', () => {
    const nail: Data = (aiAnswerSchema('hand') as Data).properties.nails.properties.thumb;
    expect(nail.properties.strokes).toBeUndefined();
    expect(nail.properties.stickers.items.properties.id).toBeUndefined();
    expect(nail.properties.gems.items.properties.id).toBeUndefined();
  });
});

describe('parseAiAnswer', () => {
  it('turns the answer into a design for the hand', () => {
    const { design, message } = parseAiAnswer(answer(FINGERS), createDesign('Oud'), 'hand', counter());
    expect(message).toBe('Paars met gouden sterren.');
    expect(design.name).toBe('Paarse sterren');
    expect(design.nails.thumb).toMatchObject({ shape: 'squoval', color: '#7b2cbf', finish: 'glitter', french: { color: '#ffffff', depth: 0.2 } });
    expect(design.nails.thumb.stickers[0]).toEqual({ id: 'ai1', kind: 'star', color: '#ffd700', x: 0.5, y: 0.5, size: 0.3, rotation: 15 });
    expect(design.nails.thumb.gems[0]).toMatchObject({ id: 'ai2', kind: 'diamond', clear: true });
  });

  it('keeps the drawing and the other part', () => {
    const current = drawn();
    const { design } = parseAiAnswer(answer(FINGERS), current, 'hand', counter());
    expect(design.nails.index.strokes).toEqual(current.nails.index.strokes);
    expect(design.toenails).toEqual(current.toenails);
  });

  it('only changes the toenails for the foot', () => {
    const current = drawn();
    const { design } = parseAiAnswer(answer(TOES, (data) => (data.nails.bigToe.length = 0.25)), current, 'foot', counter());
    expect(design.nails).toEqual(current.nails);
    expect(design.toenails.bigToe.length).toBe(0.25);
  });

  it('brings numbers just outside their range inside it', () => {
    const { design } = parseAiAnswer(
      answer(FINGERS, (data) => {
        data.nails.thumb.length = 1.2;
        data.nails.thumb.french.depth = 0.9;
        Object.assign(data.nails.thumb.stickers[0], { x: -0.1, size: 3, rotation: 370 });
        data.nails.thumb.gems[0].size = 0.01;
      }),
      createDesign('Oud'),
      'hand',
      counter(),
    );
    expect(design.nails.thumb.length).toBe(1);
    expect(design.nails.thumb.french?.depth).toBe(0.5);
    expect(design.nails.thumb.stickers[0]).toMatchObject({ x: 0, size: 1, rotation: 10 });
    expect(design.nails.thumb.gems.at(0)?.size).toBe(0.06);
  });

  it('keeps at most five stickers and gems on a nail', () => {
    const many = answer(FINGERS, (data) => (data.nails.thumb.stickers = Array.from({ length: 8 }, () => aiNail().stickers[0])));
    expect(parseAiAnswer(many, createDesign('Oud'), 'hand', counter()).design.nails.thumb.stickers).toHaveLength(AI_MAX_DECORATIONS);
  });

  it('keeps the current name when the AI gives none, and accepts a missing French tip', () => {
    const { design } = parseAiAnswer(
      answer(FINGERS, (data) => {
        data.name = ' ';
        delete data.nails.thumb.french;
      }),
      createDesign('Oud'),
      'hand',
      counter(),
    );
    expect(design.name).toBe('Oud');
    expect(design.nails.thumb.french).toBeNull();
  });

  it.each<[string, () => unknown, 'hand' | 'foot']>([
    ['no object', () => 'hallo', 'hand'],
    ['a missing finger', () => answer(FINGERS, (data) => delete data.nails.little), 'hand'],
    ['an unknown shape', () => answer(FINGERS, (data) => (data.nails.thumb.shape = 'blob')), 'hand'],
    ['a pointed toenail', () => answer(TOES, (data) => (data.nails.bigToe.shape = 'stiletto')), 'foot'],
    ['an unknown finish', () => answer(FINGERS, (data) => (data.nails.thumb.finish = 'neon')), 'hand'],
    ['an unknown sticker', () => answer(FINGERS, (data) => (data.nails.thumb.stickers[0].kind = 'skull')), 'hand'],
    ['a colour that is not #rrggbb', () => answer(FINGERS, (data) => (data.nails.thumb.color = 'purple')), 'hand'],
    ['a length that is text', () => answer(FINGERS, (data) => (data.nails.thumb.length = '0.5')), 'hand'],
    ['a missing message', () => answer(FINGERS, (data) => delete data.message), 'hand'],
  ])('rejects %s', (_, make, part) => {
    expect(() => parseAiAnswer(make(), createDesign('Oud'), part, counter())).toThrow(RangeError);
  });
});
