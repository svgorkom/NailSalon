import type { HexColor } from '../design';

/** The colour names a customer can ask for. Gold and silver are not colours here: they are yellow or grey with a metallic finish. */
export const COLOR_FAMILIES = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown', 'white', 'black', 'gray'] as const;
export type ColorFamily = (typeof COLOR_FAMILIES)[number];

// Lightness and saturation limits (0 to 1) that separate black, white and grey from the coloured families.
const BLACK_LIGHTNESS = 0.14;
const WHITE_LIGHTNESS = 0.9;
const GRAY_SATURATION = 0.12;
// Dark orange is brown, light red is pink.
const BROWN_LIGHTNESS = 0.42;
const DARK_YELLOW_LIGHTNESS = 0.3;
const PINK_LIGHTNESS = 0.72;

/** Pairs of families that are close enough for half the points. */
const NEIGHBOURS: readonly (readonly [ColorFamily, ColorFamily])[] = [
  ['red', 'pink'],
  ['red', 'orange'],
  ['red', 'brown'],
  ['orange', 'yellow'],
  ['orange', 'brown'],
  ['yellow', 'green'],
  ['green', 'blue'],
  ['blue', 'purple'],
  ['purple', 'pink'],
  ['gray', 'white'],
  ['gray', 'black'],
];

interface Hsl {
  /** Degrees, 0 (inclusive) to 360 (exclusive). */
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

function toHsl(color: HexColor): Hsl {
  const r = parseInt(color.slice(1, 3), 16) / 255;
  const g = parseInt(color.slice(3, 5), 16) / 255;
  const b = parseInt(color.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;
  if (delta === 0) return { h: 0, s: 0, l };
  const s = delta / (1 - Math.abs(2 * l - 1));
  let sector: number;
  if (max === r) sector = ((g - b) / delta) % 6;
  else if (max === g) sector = (b - r) / delta + 2;
  else sector = (r - g) / delta + 4;
  const h = sector * 60;
  return { h: h < 0 ? h + 360 : h, s, l };
}

function classifyHue(h: number, l: number): ColorFamily {
  if (h >= 345 || h < 12) return l >= PINK_LIGHTNESS ? 'pink' : 'red';
  if (h < 45) return l < BROWN_LIGHTNESS ? 'brown' : 'orange';
  if (h < 70) return l < DARK_YELLOW_LIGHTNESS ? 'brown' : 'yellow';
  if (h < 170) return 'green';
  if (h < 260) return 'blue';
  if (h < 310) return 'purple';
  return 'pink';
}

/** The colour name of a `#rrggbb` colour. */
export function classifyColor(color: HexColor): ColorFamily {
  const { h, s, l } = toHsl(color);
  if (l < BLACK_LIGHTNESS) return 'black';
  if (l >= WHITE_LIGHTNESS) return 'white';
  if (s < GRAY_SATURATION) return 'gray';
  return classifyHue(h, l);
}

/** 1 when the colour is in the family, 0.5 when it is in a neighbouring family, 0 otherwise. */
export function colorFamilyMatch(color: HexColor, family: ColorFamily): number {
  const actual = classifyColor(color);
  if (actual === family) return 1;
  return NEIGHBOURS.some(([a, b]) => (a === actual && b === family) || (b === actual && a === family)) ? 0.5 : 0;
}
