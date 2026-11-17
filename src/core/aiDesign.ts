import { GEM_KINDS, MAX_FRENCH_DEPTH, MAX_GEM_SIZE, MAX_STICKER_SIZE, MIN_FRENCH_DEPTH, MIN_GEM_SIZE, MIN_STICKER_SIZE, normaliseRotation, STICKER_KINDS } from './decoration';
import { type Design, type Finger, FINGERS, FINISHES, MAX_LENGTH, MAX_NAME_LENGTH, MIN_LENGTH, type Nail, NAIL_SHAPES, type Toe, TOE_MAX_LENGTH, TOE_SHAPES, TOES } from './design';
import { parseDesign } from './parseDesign';

/**
 * The AI mode: a language model fills in a small "AI design" for the hand or the foot, and these functions turn it
 * into a real design. The model only chooses from the options of the app; it never draws strokes and never makes ids.
 */

/** Which set of nails the AI designs: the fingernails or the toenails. */
export type AiPart = 'hand' | 'foot';

/** At most this many stickers and gems per nail; more is cut off, so a busy answer still works. */
export const AI_MAX_DECORATIONS = 5;

/** Longest explanation the AI may give with its design. */
export const AI_MAX_MESSAGE_LENGTH = 300;

/** Longest wish the user can type. */
export const AI_MAX_WISH_LENGTH = 300;

/** Earlier chat messages sent along, so a wish like "make it darker" knows what "it" is. */
export const AI_MAX_HISTORY = 10;

/** One earlier message of the chat: a wish of the user or the explanation the AI gave. */
export interface AiChatMessage {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

/** What the AI gives back: the design and one or two sentences about it. */
export interface AiAnswer {
  readonly design: Design;
  readonly message: string;
}

type Fields = Readonly<Record<string, unknown>>;
type JsonSchema = Readonly<Record<string, unknown>>;

const COLOR_SCHEMA: JsonSchema = { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' };
const UNIT_SCHEMA: JsonSchema = { type: 'number', minimum: 0, maximum: 1 };

function placementSchema(kinds: readonly string[], minSize: number, maxSize: number, extra: Readonly<Record<string, JsonSchema>>): JsonSchema {
  const properties = { kind: { type: 'string', enum: kinds }, color: COLOR_SCHEMA, ...extra, x: UNIT_SCHEMA, y: UNIT_SCHEMA, size: { type: 'number', minimum: minSize, maximum: maxSize }, rotation: { type: 'number', minimum: 0, maximum: 359 } };
  return { type: 'array', maxItems: AI_MAX_DECORATIONS, items: { type: 'object', properties, required: Object.keys(properties), additionalProperties: false } };
}

function nailSchema(part: AiPart): JsonSchema {
  const toe = part === 'foot';
  const properties = {
    shape: { type: 'string', enum: toe ? TOE_SHAPES : NAIL_SHAPES },
    length: { type: 'number', minimum: MIN_LENGTH, maximum: toe ? TOE_MAX_LENGTH : MAX_LENGTH },
    color: COLOR_SCHEMA,
    finish: { type: 'string', enum: FINISHES },
    french: {
      anyOf: [
        { type: 'null' },
        { type: 'object', properties: { color: COLOR_SCHEMA, depth: { type: 'number', minimum: MIN_FRENCH_DEPTH, maximum: MAX_FRENCH_DEPTH } }, required: ['color', 'depth'], additionalProperties: false },
      ],
    },
    stickers: placementSchema(STICKER_KINDS, MIN_STICKER_SIZE, MAX_STICKER_SIZE, {}),
    gems: placementSchema(GEM_KINDS, MIN_GEM_SIZE, MAX_GEM_SIZE, { clear: { type: 'boolean' } }),
  };
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
}

/** JSON Schema for the model's answer, built from the options of the app so it never falls behind. */
export function aiAnswerSchema(part: AiPart): JsonSchema {
  const digits: readonly string[] = part === 'foot' ? TOES : FINGERS;
  const nail = nailSchema(part);
  const nails = { type: 'object', properties: Object.fromEntries(digits.map((digit) => [digit, nail])), required: digits, additionalProperties: false };
  return {
    type: 'object',
    properties: { name: { type: 'string', maxLength: MAX_NAME_LENGTH }, message: { type: 'string', maxLength: AI_MAX_MESSAGE_LENGTH }, nails },
    required: ['name', 'message', 'nails'],
    additionalProperties: false,
  };
}

/**
 * Turns the model's answer into a design for `part`, based on `current`: the other part, and the drawing strokes of
 * every nail, stay as they are. Numbers just outside their range are brought inside it, colours go to lower case and
 * extra decorations are dropped. Ids come from `newId`. Throws RangeError when the answer cannot be used, such as an
 * unknown sticker or a missing nail; the caller can then ask the model again.
 */
export function parseAiAnswer(value: unknown, current: Design, part: AiPart, newId: () => string): AiAnswer {
  const fields = record(value, 'Answer');
  const answerNails = record(fields.nails, 'Nails');
  const name = text(fields.name, 'Name').trim().slice(0, MAX_NAME_LENGTH);
  const message = text(fields.message, 'Message').trim().slice(0, AI_MAX_MESSAGE_LENGTH);
  const toe = part === 'foot';
  const nailFor = (digit: Finger | Toe, nail: Nail) => aiNail(answerNails[digit], nail, toe, newId);
  const design: Design = {
    name: name.length > 0 ? name : current.name,
    nails: toe ? current.nails : (Object.fromEntries(FINGERS.map((finger) => [finger, nailFor(finger, current.nails[finger])])) as Record<Finger, Nail>),
    toenails: toe ? (Object.fromEntries(TOES.map((t) => [t, nailFor(t, current.toenails[t])])) as Record<Toe, Nail>) : current.toenails,
  };
  return { design: parseDesign(design), message };
}

function aiNail(value: unknown, current: Nail, toe: boolean, newId: () => string): Nail {
  const fields = record(value, 'Nail');
  const french = fields.french === null || fields.french === undefined ? null : record(fields.french, 'French tip');
  return {
    shape: text(fields.shape, 'Shape') as Nail['shape'],
    length: clamp(number(fields.length, 'Length'), MIN_LENGTH, toe ? TOE_MAX_LENGTH : MAX_LENGTH),
    color: colour(fields.color),
    finish: text(fields.finish, 'Finish') as Nail['finish'],
    french: french === null ? null : { color: colour(french.color), depth: clamp(number(french.depth, 'French tip depth'), MIN_FRENCH_DEPTH, MAX_FRENCH_DEPTH) },
    strokes: current.strokes,
    stickers: decorations(fields.stickers, 'Stickers').map((sticker) => ({
      id: newId(),
      kind: text(sticker.kind, 'Sticker') as (typeof STICKER_KINDS)[number],
      color: colour(sticker.color),
      ...placement(sticker, MIN_STICKER_SIZE, MAX_STICKER_SIZE),
    })),
    gems: decorations(fields.gems, 'Gems').map((gem) => ({
      id: newId(),
      kind: text(gem.kind, 'Gem') as (typeof GEM_KINDS)[number],
      color: colour(gem.color),
      clear: gem.clear === true,
      ...placement(gem, MIN_GEM_SIZE, MAX_GEM_SIZE),
    })),
  };
}

function decorations(value: unknown, what: string): readonly Fields[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new RangeError(`${what} must be a list.`);
  return value.slice(0, AI_MAX_DECORATIONS).map((item) => record(item, what));
}

function placement(fields: Fields, minSize: number, maxSize: number) {
  return {
    x: clamp(number(fields.x, 'Position x'), 0, 1),
    y: clamp(number(fields.y, 'Position y'), 0, 1),
    size: clamp(number(fields.size, 'Size'), minSize, maxSize),
    rotation: normaliseRotation(number(fields.rotation, 'Rotation')),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function colour(value: unknown): string {
  return text(value, 'Colour').toLowerCase();
}

function record(value: unknown, what: string): Fields {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new RangeError(`${what} must be an object.`);
  return value as Fields;
}

function text(value: unknown, what: string): string {
  if (typeof value !== 'string') throw new RangeError(`${what} must be text.`);
  return value;
}

function number(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new RangeError(`${what} must be a number.`);
  return value;
}
