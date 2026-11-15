import type { GemKind } from '../core';

/**
 * Flat outlines of the faceted gems that are not round, as closed polygons in a box one unit wide around the centre.
 * x runs to the right, y towards the free edge of the nail. The 3D gem and the picture on the pad use the same points.
 * Original shapes made in code, so no asset licence applies.
 */

export type Outline = readonly (readonly [number, number])[];

/** A square with cut corners, like a princess-cut stone. */
function square(): Outline {
  const half = 0.5;
  const cut = 0.14;
  return [
    [-half + cut, half],
    [half - cut, half],
    [half, half - cut],
    [half, -half + cut],
    [half - cut, -half],
    [-half + cut, -half],
    [-half, -half + cut],
    [-half, half - cut],
  ];
}

/** A teardrop with its point towards the free edge: a round belly and two straight sides that meet at the tip. */
function drop(): Outline {
  const radius = 0.5;
  const centreY = -0.15;
  const tipY = 0.55;
  // The sides touch the circle where the angle at its centre is acos(radius / distance) away from the tip direction.
  const reach = Math.acos(radius / (tipY - centreY));
  const steps = 20;
  const belly = Array.from({ length: steps + 1 }, (_, index): [number, number] => {
    const angle = Math.PI / 2 + reach + ((2 * Math.PI - 2 * reach) * index) / steps;
    return [radius * Math.cos(angle), centreY + radius * Math.sin(angle)];
  });
  return [[0, tipY], ...belly];
}

/** A five-pointed star with a point towards the free edge. */
function star(): Outline {
  const outer = 0.5 / Math.sin((2 * Math.PI) / 5);
  const inner = 0.4 * outer;
  return Array.from({ length: 10 }, (_, index): [number, number] => {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = Math.PI / 2 + (Math.PI * index) / 5;
    return [radius * Math.cos(angle), radius * Math.sin(angle)];
  });
}

/** Gems that are cut from a flat outline. The others (diamond, pearl, heart) have a shape of their own. */
export const GEM_OUTLINES: Readonly<Partial<Record<GemKind, Outline>>> = { square: square(), drop: drop(), star: star() };
