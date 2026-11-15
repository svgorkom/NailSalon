import { type Finger, FINGERS } from '../core';

export type Point = readonly [number, number, number];

/**
 * The finger whose nail is nearest to `point`, or null if none is within `maxDistance`.
 * Lets a tap on the fingertip select a nail, which is small on a phone.
 */
export function nearestFinger(point: Point, nails: Readonly<Record<Finger, Point>>, maxDistance: number): Finger | null {
  let best: Finger | null = null;
  let bestDistance = maxDistance;
  for (const finger of FINGERS) {
    const [x, y, z] = nails[finger];
    const distance = Math.hypot(point[0] - x, point[1] - y, point[2] - z);
    if (distance <= bestDistance) {
      best = finger;
      bestDistance = distance;
    }
  }
  return best;
}
