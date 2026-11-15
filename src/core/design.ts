/** Fingers in order from thumb to little finger. */
export const FINGERS = ['thumb', 'index', 'middle', 'ring', 'little'] as const;
export type Finger = (typeof FINGERS)[number];

export const NAIL_SHAPES = ['round', 'oval', 'almond', 'square', 'squoval', 'stiletto', 'coffin'] as const;
export type NailShape = (typeof NAIL_SHAPES)[number];

export const FINISHES = ['gloss', 'matte', 'glitter', 'metallic', 'chrome'] as const;
export type Finish = (typeof FINISHES)[number];

/** Free edge length beyond the fingertip: 0 is short, 1 is extra long. */
export const MIN_LENGTH = 0;
export const MAX_LENGTH = 1;

/** A colour as `#rrggbb`. */
export type HexColor = string;

export interface Nail {
  readonly shape: NailShape;
  readonly length: number;
  readonly color: HexColor;
  readonly finish: Finish;
}

export interface Design {
  readonly name: string;
  readonly nails: Readonly<Record<Finger, Nail>>;
}

export const DEFAULT_NAIL: Nail = { shape: 'almond', length: 0.3, color: '#e8a0b4', finish: 'gloss' };

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

/** A new design with the default nail on every finger. */
export function createDesign(name: string): Design {
  const nails = Object.fromEntries(FINGERS.map((finger) => [finger, DEFAULT_NAIL])) as Record<Finger, Nail>;
  return { name, nails };
}
