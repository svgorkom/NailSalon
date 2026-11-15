import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { findNailAnchors, mirrorNailBed, NAIL_ANCHOR_NAMES, readNailBed } from '../../src/scene/nailBed';

const EXTRAS = { nailWidth: 0.008, bedLength: 0.012, gx: 0.1, gy: 0.2, gxx: -30, gxy: 5, gyy: -2 };

describe('readNailBed', () => {
  it('reads the measurements of an anchor', () => {
    expect(readNailBed(EXTRAS)).toEqual({ width: 0.008, length: 0.012, curve: { gx: 0.1, gy: 0.2, gxx: -30, gxy: 5, gyy: -2 } });
  });

  it('throws when a property is missing or not a number', () => {
    expect(() => readNailBed({ ...EXTRAS, gxy: undefined })).toThrow(TypeError);
    expect(() => readNailBed({ ...EXTRAS, gx: '0.1' })).toThrow(TypeError);
    expect(() => readNailBed({ ...EXTRAS, gyy: Number.NaN })).toThrow(TypeError);
  });

  it('throws for a width or length that is not positive', () => {
    expect(() => readNailBed({ ...EXTRAS, nailWidth: 0 })).toThrow(RangeError);
    expect(() => readNailBed({ ...EXTRAS, bedLength: -1 })).toThrow(RangeError);
  });
});

describe('findNailAnchors', () => {
  const hand = (names: readonly string[]): Object3D => {
    const root = new Object3D();
    for (const name of names) {
      const node = new Object3D();
      node.name = name;
      node.userData = { ...EXTRAS };
      root.add(node);
    }
    return root;
  };

  it('finds the anchor of every finger', () => {
    const anchors = findNailAnchors(hand(Object.values(NAIL_ANCHOR_NAMES)));
    expect(anchors.little.node.name).toBe('NailBed_Pinky');
    expect(anchors.thumb.bed.width).toBe(0.008);
  });

  it('throws when an anchor is missing', () => {
    expect(() => findNailAnchors(hand(['NailBed_Thumb']))).toThrow(/NailBed_Index/);
  });
});

describe('mirrorNailBed', () => {
  const bed = readNailBed(EXTRAS);

  it('changes the sign of the terms that are odd in x only', () => {
    expect(mirrorNailBed(bed)).toEqual({ width: 0.008, length: 0.012, curve: { gx: -0.1, gy: 0.2, gxx: -30, gxy: -5, gyy: -2 } });
  });

  it('is its own inverse and leaves its argument alone', () => {
    expect(mirrorNailBed(mirrorNailBed(bed))).toEqual(bed);
    expect(bed.curve.gx).toBe(0.1);
  });

  it('keeps a point on the surface when x is flipped', () => {
    const height = (b: typeof bed, x: number, y: number) => b.curve.gx * x + b.curve.gy * y + b.curve.gxx * x * x + b.curve.gxy * x * y + b.curve.gyy * y * y;
    expect(height(mirrorNailBed(bed), -0.003, 0.01)).toBeCloseTo(height(bed, 0.003, 0.01), 12);
  });
});
