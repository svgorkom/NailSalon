import type { StickerKind } from '../core';

/**
 * Stickers are drawn from SVG path data, in a box from -50 to 50 around the centre. Original shapes, so no
 * asset licence applies. Filled with the nonzero rule: a subpath in the opposite direction cuts a hole.
 */

function circle(cx: number, cy: number, r: number, sweep: 0 | 1): string {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 ${sweep} ${2 * r} 0a${r} ${r} 0 1 ${sweep} ${-2 * r} 0Z`;
}

function ellipse(cx: number, cy: number, rx: number, ry: number, sweep: 0 | 1): string {
  return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 ${sweep} ${2 * rx} 0a${rx} ${ry} 0 1 ${sweep} ${-2 * rx} 0Z`;
}

function starPoints(points: number, outer: number, inner: number): string {
  const vertices = Array.from({ length: points * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = (Math.PI * index) / points - Math.PI / 2;
    return `${(radius * Math.cos(angle)).toFixed(2)} ${(radius * Math.sin(angle)).toFixed(2)}`;
  });
  return `M${vertices.join('L')}Z`;
}

function flower(): string {
  const petals = Array.from({ length: 5 }, (_, index) => {
    const angle = (2 * Math.PI * index) / 5 - Math.PI / 2;
    return circle(Number((28 * Math.cos(angle)).toFixed(2)), Number((28 * Math.sin(angle)).toFixed(2)), 17, 1);
  });
  return petals.join('') + circle(0, 0, 9, 0);
}

export const STICKER_PATHS: Readonly<Record<StickerKind, string>> = {
  heart: 'M0 42C-62 -4-42 -46-16 -39C-6 -36 0 -29 0 -22C0 -29 6 -36 16 -39C42 -46 62 -4 0 42Z',
  star: starPoints(5, 50, 21),
  flower: flower(),
  sparkle: 'M0 -50Q4 -4 50 0Q4 4 0 50Q-4 4 -50 0Q-4 -4 0 -50Z',
  moon: 'M25 -46A47 47 0 1 0 25 46A49 49 0 0 1 25 -46Z',
  butterfly:
    'M6 -4C10 -44 52 -52 48 -20C46 -4 22 2 6 -4ZM6 2C22 2 42 12 36 34C30 52 8 42 6 10Z' +
    'M-6 -4C-10 -44 -52 -52 -48 -20C-46 -4 -22 2 -6 -4ZM-6 2C-22 2 -42 12 -36 34C-30 52 -8 42 -6 10Z' +
    ellipse(0, 4, 3.5, 30, 1),
};
