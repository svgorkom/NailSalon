export type Point = readonly [number, number, number];

/**
 * The digit whose nail is nearest to `point`, or null if none is within `maxDistance`.
 * Lets a tap on the fingertip or toe select a nail, which is small on a phone.
 */
export function nearestDigit<D extends string>(point: Point, nails: Readonly<Record<D, Point>>, maxDistance: number): D | null {
  let best: D | null = null;
  let bestDistance = maxDistance;
  for (const digit of Object.keys(nails) as D[]) {
    const [x, y, z] = nails[digit];
    const distance = Math.hypot(point[0] - x, point[1] - y, point[2] - z);
    if (distance <= bestDistance) {
      best = digit;
      bestDistance = distance;
    }
  }
  return best;
}
