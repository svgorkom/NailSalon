import type { Stars } from '../core';

/** The small head movements of a customer: now and then a glance (alive), and one reaction to the result. */
export type Motion = 'glance' | 'cheer' | 'nod' | 'tilt' | 'droop';

/** How long each movement lasts, in seconds. */
export const MOTION_SECONDS = { glance: 2.2, cheer: 1.8, nod: 1.1, tilt: 1.6, droop: 2.4 } as const satisfies Record<Motion, number>;

/** A rotation of the head in the axes of the customer model: pitch about x (positive = nodding down), yaw about y, roll about z; radians. */
export interface HeadAngles {
  readonly pitch: number;
  readonly yaw: number;
  readonly roll: number;
}

const REST: HeadAngles = { pitch: 0, yaw: 0, roll: 0 };

/** 0 → 1 → 0 over `u` in 0..1, smooth at both ends. */
const bump = (u: number) => Math.sin(Math.PI * u);

/** 0 → 1 in the first 30%, 1 until 70%, → 0 at the end: a head that stays down for a moment. */
function plateau(u: number): number {
  const edge = (x: number) => x * x * (3 - 2 * x);
  return u < 0.3 ? edge(u / 0.3) : u > 0.7 ? edge((1 - u) / 0.3) : 1;
}

/**
 * The head rotation `seconds` after the start of a movement. Zero before the start and after the end, so the customer always comes back
 * to the pose of the model. `side` (1 or -1) is the direction of a glance. Only the head turns: the arm and the hand on the table stay still.
 */
export function headAngles(motion: Motion, seconds: number, side: 1 | -1): HeadAngles {
  const duration = MOTION_SECONDS[motion];
  if (seconds <= 0 || seconds >= duration) return REST;
  const u = seconds / duration;
  switch (motion) {
    case 'glance':
      return { pitch: 0.04 * bump(u), yaw: 0.14 * side * bump(u), roll: 0 };
    case 'cheer':
      return { pitch: 0.15 * Math.sin(4 * Math.PI * u) * bump(u) ** 0.5, yaw: 0, roll: 0.05 * Math.sin(2 * Math.PI * u) };
    case 'nod':
      return { pitch: 0.14 * bump(u), yaw: 0, roll: 0 };
    case 'tilt':
      return { pitch: 0.03 * bump(u), yaw: 0, roll: 0.12 * bump(u) };
    case 'droop':
      return { pitch: 0.12 * plateau(u), yaw: 0, roll: 0.1 * plateau(u) };
  }
}

/** The reaction of a customer to the stars she gave. */
export function motionFor(stars: Stars): Motion {
  return (['droop', 'tilt', 'nod', 'cheer'] as const)[stars];
}

/** Seconds until the next glance, from a random number in 0..1 (injected, so tests need no randomness). */
export function nextIdleDelay(random: () => number): number {
  return 5 + 4 * random();
}
