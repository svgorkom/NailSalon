import { describe, expect, it } from 'vitest';
import { headAngles, MOTION_SECONDS, type Motion, motionFor, nextIdleDelay } from '../../src/scene/customerMotion';

const MOTIONS = Object.keys(MOTION_SECONDS) as Motion[];

describe('headAngles', () => {
  it.each(MOTIONS)('%s starts and ends at rest', (motion) => {
    expect(headAngles(motion, 0, 1)).toEqual({ pitch: 0, yaw: 0, roll: 0 });
    expect(headAngles(motion, MOTION_SECONDS[motion], 1)).toEqual({ pitch: 0, yaw: 0, roll: 0 });
    expect(headAngles(motion, MOTION_SECONDS[motion] + 5, 1)).toEqual({ pitch: 0, yaw: 0, roll: 0 });
  });

  it.each(MOTIONS)('%s moves the head in between, but never further than a gentle 0.2 rad (about 11 degrees)', (motion) => {
    let largest = 0;
    for (let t = 0.01; t < MOTION_SECONDS[motion]; t += 0.01) {
      const { pitch, yaw, roll } = headAngles(motion, t, 1);
      largest = Math.max(largest, Math.abs(pitch), Math.abs(yaw), Math.abs(roll));
    }
    expect(largest).toBeGreaterThan(0.05);
    expect(largest).toBeLessThanOrEqual(0.2);
  });

  it('a glance goes to the side it is given', () => {
    expect(headAngles('glance', MOTION_SECONDS.glance / 2, 1).yaw).toBeGreaterThan(0);
    expect(headAngles('glance', MOTION_SECONDS.glance / 2, -1).yaw).toBeLessThan(0);
  });

  it('a nod goes down (positive pitch) and the cheer nods twice', () => {
    expect(headAngles('nod', MOTION_SECONDS.nod / 2, 1).pitch).toBeGreaterThan(0.1);
    const pitches = Array.from({ length: 180 }, (_, i) => headAngles('cheer', (i / 180) * MOTION_SECONDS.cheer, 1).pitch);
    const peaks = pitches.filter((p, i) => p > 0.05 && p >= (pitches[i - 1] ?? Infinity) && p > (pitches[i + 1] ?? Infinity));
    expect(peaks).toHaveLength(2);
  });

  it('is deterministic', () => {
    expect(headAngles('droop', 0.9, 1)).toEqual(headAngles('droop', 0.9, 1));
  });
});

describe('motionFor', () => {
  it('gives every star count its own reaction', () => {
    expect(new Set([0, 1, 2, 3].map((stars) => motionFor(stars as 0 | 1 | 2 | 3))).size).toBe(4);
    expect(motionFor(3)).toBe('cheer');
    expect(motionFor(0)).toBe('droop');
  });
});

describe('nextIdleDelay', () => {
  it('waits 5 to 9 seconds, from the injected random number', () => {
    expect(nextIdleDelay(() => 0)).toBe(5);
    expect(nextIdleDelay(() => 1)).toBe(9);
  });
});
