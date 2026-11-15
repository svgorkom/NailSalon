import { describe, expect, it } from 'vitest';
import { NAIL_SHAPES } from '../../src/core';
import type { NailBed } from '../../src/scene/nailBed';
import { buildNailMesh, createNailGeometry, surfaceFrame } from '../../src/scene/nailGeometry';

/** The index finger of the hand model. */
const BED: NailBed = { width: 0.00816, length: 0.01245, curve: { gx: -0.0883, gy: 0.1588, gxx: -45.17, gxy: 11.91, gyy: -5.71 } };
const FLAT: NailBed = { width: 0.008, length: 0.012, curve: { gx: 0, gy: 0, gxx: 0, gxy: 0, gyy: 0 } };

function extent(positions: Float32Array, axis: 0 | 1 | 2): [number, number] {
  let [min, max] = [Infinity, -Infinity];
  for (let i = axis; i < positions.length; i += 3) {
    min = Math.min(min, positions[i] ?? 0);
    max = Math.max(max, positions[i] ?? 0);
  }
  return [min, max];
}

describe('buildNailMesh', () => {
  it.each(NAIL_SHAPES)('builds a closed, finite mesh for %s', (shape) => {
    for (const length of [0, 0.3, 1]) {
      const { positions, uvs, indices } = buildNailMesh(shape, length, BED);
      expect(positions.length / 3).toBe(uvs.length / 2);
      expect(positions.every(Number.isFinite)).toBe(true);
      expect(uvs.every((value) => value >= 0 && value <= 1)).toBe(true);
      expect(indices.length % 3).toBe(0);
      expect(Math.max(...indices)).toBeLessThan(positions.length / 3);
    }
  });

  it('starts at the cuticle and ends beyond the nail bed by the free edge', () => {
    const { positions } = buildNailMesh('square', 1, FLAT);
    const [minY, maxY] = extent(positions, 1);
    expect(minY).toBeGreaterThanOrEqual(0);
    expect(minY).toBeLessThan(0.001);
    expect(maxY).toBeCloseTo(0.012 * 2.5, 4);
  });

  it('gets longer with the length', () => {
    const tips = [0, 0.25, 0.5, 0.75, 1].map((length) => extent(buildNailMesh('almond', length, BED).positions, 1)[1]);
    for (let i = 1; i < tips.length; i++) expect(tips[i] ?? 0).toBeGreaterThan(tips[i - 1] ?? 0);
  });

  it('is as wide as the nail bed at the base and never wider', () => {
    const { positions } = buildNailMesh('square', 0.5, FLAT);
    const [minX, maxX] = extent(positions, 0);
    expect(maxX - minX).toBeLessThanOrEqual(0.008 + 1e-9);
    expect(maxX - minX).toBeGreaterThan(0.0075);
  });

  it('tapers to a point for stiletto and stays wide for square', () => {
    const tipWidthOf = (shape: 'stiletto' | 'square'): number => {
      const { positions } = buildNailMesh(shape, 1, FLAT);
      const tipY = 0.012 * 2.5;
      const xs: number[] = [];
      for (let i = 0; i < positions.length; i += 3) if ((positions[i + 1] ?? 0) > tipY - 1e-6) xs.push(positions[i] ?? 0);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(tipWidthOf('stiletto')).toBeLessThan(0.0005);
    expect(tipWidthOf('square')).toBeGreaterThan(0.006);
  });

  it('lies on the skin: the top is above the flat bed and the underside is a plate thickness lower', () => {
    const { positions } = buildNailMesh('round', 0.3, FLAT);
    const [minZ, maxZ] = extent(positions, 2);
    expect(maxZ).toBeGreaterThan(0);
    expect(minZ).toBeLessThan(0);
    expect(maxZ - minZ).toBeLessThan(0.002);
  });

  it('throws for an invalid length', () => {
    expect(() => buildNailMesh('round', 2, BED)).toThrow(RangeError);
  });
});

describe('createNailGeometry', () => {
  it.each(NAIL_SHAPES)('has finite normals for %s, also at a pointed tip', (shape) => {
    const geometry = createNailGeometry(shape, 1, BED);
    const normals = geometry.getAttribute('normal');
    expect(normals.count).toBe(geometry.getAttribute('position').count);
    expect(Array.from(normals.array).every(Number.isFinite)).toBe(true);
    geometry.dispose();
  });
});

describe('surfaceFrame', () => {
  it('lies on the top of the mesh at the same texture position', () => {
    const { positions, uvs } = buildNailMesh('oval', 0.5, BED);
    // Vertex 5 of row 6 (on the nail bed) and of row 20 (on the free edge).
    for (const index of [6 * 13 + 5, 20 * 13 + 5]) {
      const [u, v] = [uvs[index * 2] ?? 0, uvs[index * 2 + 1] ?? 0];
      const { position } = surfaceFrame('oval', 0.5, BED, u, v);
      for (const axis of [0, 1, 2]) expect(position[axis]).toBeCloseTo(positions[index * 3 + axis] ?? 0, 6);
    }
  });

  it('points straight up on a flat nail bed', () => {
    const { normal } = surfaceFrame('square', 0.3, FLAT, 0.5, 0.3);

    expect(normal[0]).toBeCloseTo(0, 6);
    expect(normal[1]).toBeCloseTo(0, 6);
    expect(normal[2]).toBeCloseTo(1, 6);
  });

  it('tilts outwards towards the sides of a curved nail', () => {
    const left = surfaceFrame('oval', 0.3, BED, 0.1, 0.3).normal;
    const right = surfaceFrame('oval', 0.3, BED, 0.9, 0.3).normal;

    expect(left[0]).toBeLessThan(0);
    expect(right[0]).toBeGreaterThan(0);
  });

  it('stays finite at the pointed tip of a stiletto', () => {
    const { position, normal } = surfaceFrame('stiletto', 1, BED, 0.5, 1);

    expect([...position, ...normal].every(Number.isFinite)).toBe(true);
  });
});
