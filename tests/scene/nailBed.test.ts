import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { FINGERS, TOES } from '../../src/core';
import { findNailAnchors, NAIL_ANCHOR_NAMES, readNailBed } from '../../src/scene/nailBed';

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
    const anchors = findNailAnchors(hand(Object.values(NAIL_ANCHOR_NAMES)), FINGERS);
    expect(anchors.little.node.name).toBe('NailBed_Pinky');
    expect(anchors.thumb.bed.width).toBe(0.008);
  });

  it('finds the anchor of every toe, and asks a hand model for no toes', () => {
    const anchors = findNailAnchors(hand(['NailBed_BigToe', 'NailBed_SecondToe', 'NailBed_ThirdToe', 'NailBed_FourthToe', 'NailBed_LittleToe']), TOES);
    expect(anchors.littleToe.node.name).toBe('NailBed_LittleToe');
    expect(() => findNailAnchors(hand(['NailBed_Thumb']), TOES)).toThrow(/NailBed_BigToe/);
  });

  it('throws when an anchor is missing', () => {
    expect(() => findNailAnchors(hand(['NailBed_Thumb']), FINGERS)).toThrow(/NailBed_Index/);
  });
});
