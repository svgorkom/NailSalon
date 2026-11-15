import { Box3, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { GEM_KINDS } from '../../src/core';
import { createGemGeometries, gemOrientation } from '../../src/scene/gems';

describe('createGemGeometries', () => {
  it.each(GEM_KINDS)('makes %s one unit wide, standing on the surface', (kind) => {
    const geometry = createGemGeometries()[kind];
    const box = new Box3().setFromBufferAttribute(geometry.getAttribute('position') as never);

    expect(box.max.x - box.min.x).toBeGreaterThan(0.85);
    expect(box.max.x - box.min.x).toBeLessThanOrEqual(1.01);
    expect(box.min.z).toBeGreaterThanOrEqual(-1e-6);
    expect(box.max.z).toBeGreaterThan(0.1);
    expect(box.max.z).toBeLessThan(0.5);
    geometry.dispose();
  });
});

describe('gemOrientation', () => {
  const turn = (quaternion: readonly number[], vector: Vector3) => vector.clone().applyQuaternion(new Quaternion(...quaternion));

  it('stands the gem along the surface normal', () => {
    const normal = new Vector3(0.3, 0, 1).normalize();
    const up = turn(gemOrientation({ position: [0, 0, 0], normal: [normal.x, normal.y, normal.z] }, 45), new Vector3(0, 0, 1));

    expect(up.distanceTo(normal)).toBeLessThan(1e-6);
  });

  it('turns clockwise as seen on the pad, where the free edge (+y) is at the top', () => {
    const right = turn(gemOrientation({ position: [0, 0, 0], normal: [0, 0, 1] }, 90), new Vector3(1, 0, 0));

    // Clockwise by 90 degrees, right becomes down: towards the cuticle (-y).
    expect(right.y).toBeCloseTo(-1, 6);
  });
});
