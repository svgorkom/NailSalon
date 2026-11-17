import { type HexColor, isHexColor } from './design';

/**
 * Positions on a nail are normalised: x runs from the left (0) to the right (1) edge of the nail,
 * y from the free edge (0) to the cuticle (1), seen from above. Sizes are fractions of the nail width.
 */

export const MIN_BRUSH_SIZE = 0.01;
export const MAX_BRUSH_SIZE = 0.2;

/** A sponge dab is much bigger than a brush stroke. */
export const MIN_SPONGE_SIZE = 0.15;
export const MAX_SPONGE_SIZE = 0.6;

/** How much colour one dab leaves: 1 is almost solid, low values need several dabs to build up. */
export const MIN_SPONGE_OPACITY = 0.1;
export const MAX_SPONGE_OPACITY = 1;

/** The upper bound (exclusive) of a sponge seed: seeds are unsigned 32-bit integers. */
export const SPONGE_SEED_LIMIT = 2 ** 32;

/** What turns a stroke into a series of sponge dabs. */
export interface Sponge {
  /** Makes the pattern of the dabs repeatable, so undo, redo and loading show exactly the same sponge marks. */
  readonly seed: number;
  /** Colour left by one dab, from MIN_SPONGE_OPACITY to MAX_SPONGE_OPACITY. */
  readonly opacity: number;
}

/**
 * A brush, eraser or sponge stroke. `points` is flat: x0, y0, x1, y1, ...
 * With `sponge` set the stroke is not a line: each point is the centre of one dab, and `size` is the size of a dab.
 */
export interface Stroke {
  readonly color: HexColor;
  readonly size: number;
  readonly erase: boolean;
  readonly points: readonly number[];
  readonly sponge?: Sponge;
}

export const STICKER_KINDS = [
  // The original six, drawn for this project; library stickers follow (tools/stickers/generate.mjs).
  'heart',
  'star',
  'flower',
  'sparkle',
  'moon',
  'butterfly',
  // Love and smileys
  'heart-half',
  'heart-break',
  'hand-heart',
  'smiley',
  'smiley-wink',
  'smiley-sticker',
  'smiley-melting',
  'smiley-x-eyes',
  'hand-peace',
  'hand-waving',
  'thumbs-up',
  'peace',
  'yin-yang',
  'infinity',
  // Animals
  'cat',
  'dog',
  'paw-print',
  'bird',
  'fish',
  'fish-simple',
  'horse',
  'rabbit',
  'cow',
  'bug',
  'bug-beetle',
  'feather',
  // Nature
  'flower-lotus',
  'flower-tulip',
  'leaf',
  'plant',
  'potted-plant',
  'tree',
  'tree-palm',
  'tree-evergreen',
  'cactus',
  'clover',
  'mountains',
  'drop',
  // Sky and weather
  'star-four',
  'moon-stars',
  'shooting-star',
  'sun',
  'sun-horizon',
  'cloud',
  'cloud-sun',
  'cloud-rain',
  'cloud-lightning',
  'lightning',
  'snowflake',
  'rainbow',
  'rainbow-cloud',
  'umbrella',
  'planet',
  'rocket',
  'fire',
  // Food
  'ice-cream',
  'popsicle',
  'cake',
  'cookie',
  'pizza',
  'hamburger',
  'popcorn',
  'cherries',
  'orange-slice',
  'avocado',
  'carrot',
  'coffee',
  // Party
  'gift',
  'balloon',
  'confetti',
  'crown',
  'crown-simple',
  'diamond',
  'music-note',
  'music-notes',
  'microphone',
  'headphones',
  'trophy',
  'medal',
  'ticket',
  'mask-happy',
  'magic-wand',
  // Spooky
  'skull',
  'ghost',
  'bone',
  'alien',
  'ufo',
  'eye',
  'broom',
  'mask-sad',
  'spiral',
  // Hobby and sport
  'soccer-ball',
  'basketball',
  'tennis-ball',
  'guitar',
  'piano-keys',
  'paint-brush',
  'palette',
  'camera',
  'game-controller',
  'book',
  'sneaker',
  'dress',
  'high-heel',
  'handbag',
  'sunglasses',
  'bicycle',
  'airplane',
  'anchor',
  // Shapes and things
  'circle',
  'triangle',
  'square',
  'hexagon',
  'club',
  'spade',
  'puzzle-piece',
  'lightbulb',
  'key',
  'castle-turret',
] as const;
export type StickerKind = (typeof STICKER_KINDS)[number];

export const MIN_STICKER_SIZE = 0.1;
export const MAX_STICKER_SIZE = 1;

export interface Sticker {
  /** Unique within a nail. */
  readonly id: string;
  readonly kind: StickerKind;
  readonly color: HexColor;
  /** Centre of the sticker. */
  readonly x: number;
  readonly y: number;
  /** Diameter as a fraction of the nail width. */
  readonly size: number;
  /** Clockwise, in degrees, from 0 (inclusive) to 360 (exclusive). */
  readonly rotation: number;
}

/** The part of a sticker or gem that can change after it was placed. */
export type StickerPlacement = Pick<Sticker, 'x' | 'y' | 'size' | 'rotation'>;

/** Rhinestones in several cuts and pearls glued on the nail. Unlike stickers they are 3D objects on top of the nail. */
export const GEM_KINDS = ['diamond', 'pearl', 'heart', 'square', 'drop', 'star'] as const;
export type GemKind = (typeof GEM_KINDS)[number];

export const MIN_GEM_SIZE = 0.06;
export const MAX_GEM_SIZE = 0.5;

/** A gem has the same placement as a sticker; positions and sizes use the same fractions of the nail. */
export interface Gem extends StickerPlacement {
  /** Unique among the gems of a nail. */
  readonly id: string;
  readonly kind: GemKind;
  readonly color: HexColor;
  /** Clear glass that lets the nail show through, tinted by the colour; otherwise solid. */
  readonly clear: boolean;
}

/** The part of a gem's look that can change after it was placed. */
export type GemLook = Pick<Gem, 'color' | 'clear'>;

/** Depth of a French tip, measured from the free edge, as a fraction of the whole nail length. */
export const MIN_FRENCH_DEPTH = 0.05;
export const MAX_FRENCH_DEPTH = 0.5;

/** A French tip: the free edge in its own colour, ending in a curved smile line. */
export interface FrenchTip {
  readonly color: HexColor;
  readonly depth: number;
}

interface SizeLimits {
  readonly min: number;
  readonly max: number;
}

const STICKER_SIZES: SizeLimits = { min: MIN_STICKER_SIZE, max: MAX_STICKER_SIZE };
const GEM_SIZES: SizeLimits = { min: MIN_GEM_SIZE, max: MAX_GEM_SIZE };

function isUnit(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

/** Throws RangeError unless the stroke is complete and inside the nail. */
export function assertStroke(stroke: Stroke): void {
  if (!isHexColor(stroke.color)) throw new RangeError('Stroke colour must be #rrggbb.');
  const { sponge } = stroke;
  const [min, max, what] = sponge === undefined ? [MIN_BRUSH_SIZE, MAX_BRUSH_SIZE, 'Brush'] : [MIN_SPONGE_SIZE, MAX_SPONGE_SIZE, 'Sponge'];
  if (!Number.isFinite(stroke.size) || stroke.size < min || stroke.size > max) {
    throw new RangeError(`${what} size must be between ${min} and ${max}.`);
  }
  if (sponge !== undefined) assertSponge(stroke, sponge);
  if (stroke.points.length < 2 || stroke.points.length % 2 !== 0) {
    throw new RangeError('A stroke needs at least one point, given as x and y.');
  }
  if (!stroke.points.every(isUnit)) throw new RangeError('Stroke points must be between 0 and 1.');
}

function assertSponge(stroke: Stroke, sponge: Sponge): void {
  if (stroke.erase) throw new RangeError('A sponge cannot erase.');
  if (!Number.isInteger(sponge.seed) || sponge.seed < 0 || sponge.seed >= SPONGE_SEED_LIMIT) {
    throw new RangeError('Sponge seed must be an unsigned 32-bit integer.');
  }
  if (!Number.isFinite(sponge.opacity) || sponge.opacity < MIN_SPONGE_OPACITY || sponge.opacity > MAX_SPONGE_OPACITY) {
    throw new RangeError(`Sponge opacity must be between ${MIN_SPONGE_OPACITY} and ${MAX_SPONGE_OPACITY}.`);
  }
}

/** Throws RangeError unless the sticker is valid. */
export function assertSticker(sticker: Sticker): void {
  if (sticker.id.length === 0) throw new RangeError('Sticker id must not be empty.');
  if (!STICKER_KINDS.includes(sticker.kind)) throw new RangeError('Unknown sticker.');
  if (!isHexColor(sticker.color)) throw new RangeError('Sticker colour must be #rrggbb.');
  assertPlacement(sticker);
}

/** Throws RangeError unless the gem is valid. */
export function assertGem(gem: Gem): void {
  if (gem.id.length === 0) throw new RangeError('Gem id must not be empty.');
  assertGemKind(gem.kind);
  assertGemLook(gem);
  assertGemPlacement(gem);
}

/** Throws RangeError unless the kind is one of the gem kinds. */
export function assertGemKind(kind: GemKind): void {
  if (!GEM_KINDS.includes(kind)) throw new RangeError('Unknown gem.');
}

/** Throws RangeError unless the colour is valid and `clear` is a boolean. */
export function assertGemLook(look: GemLook): void {
  if (!isHexColor(look.color)) throw new RangeError('Gem colour must be #rrggbb.');
  if (typeof look.clear !== 'boolean') throw new RangeError('Gem clear must be true or false.');
}

/** Throws RangeError unless the placement is valid for a sticker. */
export function assertPlacement(placement: StickerPlacement): void {
  checkPlacement(placement, STICKER_SIZES, 'Sticker');
}

/** Throws RangeError unless the placement is valid for a gem. */
export function assertGemPlacement(placement: StickerPlacement): void {
  checkPlacement(placement, GEM_SIZES, 'Gem');
}

function checkPlacement(placement: StickerPlacement, sizes: SizeLimits, what: string): void {
  if (!isUnit(placement.x) || !isUnit(placement.y)) throw new RangeError(`${what} position must be between 0 and 1.`);
  if (!Number.isFinite(placement.size) || placement.size < sizes.min || placement.size > sizes.max) {
    throw new RangeError(`${what} size must be between ${sizes.min} and ${sizes.max}.`);
  }
  if (!Number.isFinite(placement.rotation)) throw new RangeError(`${what} rotation must be a number.`);
}

/** Throws RangeError unless the French tip is valid. */
export function assertFrenchTip(french: FrenchTip): void {
  if (!isHexColor(french.color)) throw new RangeError('French tip colour must be #rrggbb.');
  if (!Number.isFinite(french.depth) || french.depth < MIN_FRENCH_DEPTH || french.depth > MAX_FRENCH_DEPTH) {
    throw new RangeError(`French tip depth must be between ${MIN_FRENCH_DEPTH} and ${MAX_FRENCH_DEPTH}.`);
  }
}

/** Brings a rotation in degrees into 0 (inclusive) to 360 (exclusive). */
export function normaliseRotation(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}
