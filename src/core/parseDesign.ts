import { assertFrenchTip, assertGem, assertSticker, assertStroke, type FrenchTip, type Gem, GEM_KINDS, type Sticker, STICKER_KINDS, type Stroke } from './decoration';
import { type Design, type Digit, type Finger, FINGERS, FINISHES, isToe, MAX_LENGTH, MAX_NAME_LENGTH, MIN_LENGTH, type Nail, NAIL_SHAPES, type Toe, TOE_MAX_LENGTH, TOE_SHAPES, TOES } from './design';

type Fields = Readonly<Record<string, unknown>>;

/**
 * Checks data that comes from outside (storage, the network) and returns it as a design.
 * Throws RangeError when anything is missing, of the wrong type or outside the rules.
 */
export function parseDesign(value: unknown): Design {
  const fields = record(value, 'Design');
  const name = text(fields.name, 'Design name').trim();
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) throw new RangeError(`Design name must be 1 to ${MAX_NAME_LENGTH} characters.`);
  const nails = record(fields.nails, 'Nails');
  const toenails = record(fields.toenails, 'Toenails');
  return {
    name,
    nails: Object.fromEntries(FINGERS.map((finger) => [finger, parseNail(nails[finger], finger)])) as Record<Finger, Nail>,
    toenails: Object.fromEntries(TOES.map((toe) => [toe, parseNail(toenails[toe], toe)])) as Record<Toe, Nail>,
  };
}

function parseNail(value: unknown, digit: Digit): Nail {
  const fields = record(value, `Nail ${digit}`);
  const toe = isToe(digit);
  const shape = oneOf(fields.shape, toe ? TOE_SHAPES : NAIL_SHAPES, 'Nail shape');
  const finish = oneOf(fields.finish, FINISHES, 'Finish');
  const length = number(fields.length, 'Length');
  const maxLength = toe ? TOE_MAX_LENGTH : MAX_LENGTH;
  if (length < MIN_LENGTH || length > maxLength) throw new RangeError(`Length must be between ${MIN_LENGTH} and ${maxLength}.`);
  const color = colour(fields.color, 'Nail colour');
  const french = fields.french === null ? null : parseFrench(fields.french);
  const strokes = list(fields.strokes, 'Strokes').map(parseStroke);
  const stickers = unique(list(fields.stickers, 'Stickers').map(parseSticker), 'Sticker');
  const gems = unique(list(fields.gems, 'Gems').map(parseGem), 'Gem');
  return { shape, length, color, finish, french, strokes, stickers, gems };
}

function parseFrench(value: unknown): FrenchTip {
  const fields = record(value, 'French tip');
  const french = { color: colour(fields.color, 'French tip colour'), depth: number(fields.depth, 'French tip depth') };
  assertFrenchTip(french);
  return french;
}

function parseStroke(value: unknown): Stroke {
  const fields = record(value, 'Stroke');
  const points = list(fields.points, 'Stroke points').map((point) => number(point, 'Stroke point'));
  const erase = fields.erase;
  if (typeof erase !== 'boolean') throw new RangeError('Stroke erase must be true or false.');
  const stroke = { color: colour(fields.color, 'Stroke colour'), size: number(fields.size, 'Brush size'), erase, points };
  assertStroke(stroke);
  return stroke;
}

function parseSticker(value: unknown): Sticker {
  const fields = record(value, 'Sticker');
  const sticker = { id: text(fields.id, 'Sticker id'), kind: oneOf(fields.kind, STICKER_KINDS, 'Sticker'), color: colour(fields.color, 'Sticker colour'), ...placement(fields) };
  assertSticker(sticker);
  return sticker;
}

function parseGem(value: unknown): Gem {
  const fields = record(value, 'Gem');
  const clear = fields.clear;
  if (typeof clear !== 'boolean') throw new RangeError('Gem clear must be true or false.');
  const gem = { id: text(fields.id, 'Gem id'), kind: oneOf(fields.kind, GEM_KINDS, 'Gem'), color: colour(fields.color, 'Gem colour'), clear, ...placement(fields) };
  assertGem(gem);
  return gem;
}

function placement(fields: Fields) {
  const rotation = number(fields.rotation, 'Rotation');
  if (rotation < 0 || rotation >= 360) throw new RangeError('Rotation must be from 0 up to 360.');
  return { x: number(fields.x, 'Position x'), y: number(fields.y, 'Position y'), size: number(fields.size, 'Size'), rotation };
}

function unique<T extends { readonly id: string }>(items: readonly T[], what: string): readonly T[] {
  if (new Set(items.map(({ id }) => id)).size !== items.length) throw new RangeError(`${what} ids must be unique on a nail.`);
  return items;
}

function record(value: unknown, what: string): Fields {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new RangeError(`${what} must be an object.`);
  return value as Fields;
}

function list(value: unknown, what: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new RangeError(`${what} must be a list.`);
  return value;
}

function text(value: unknown, what: string): string {
  if (typeof value !== 'string') throw new RangeError(`${what} must be text.`);
  return value;
}

function number(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new RangeError(`${what} must be a number.`);
  return value;
}

/** Colours are stored in lower case, as the commands write them. */
function colour(value: unknown, what: string): string {
  const color = text(value, what);
  if (!/^#[0-9a-f]{6}$/.test(color)) throw new RangeError(`${what} must be #rrggbb in lower case.`);
  return color;
}

function oneOf<T extends string>(value: unknown, options: readonly T[], what: string): T {
  if (typeof value !== 'string' || !(options as readonly string[]).includes(value)) throw new RangeError(`Unknown ${what.toLowerCase()}.`);
  return value as T;
}
