import type { Object3D } from 'three';
import type { Digit } from '../core';

/**
 * The nail bed of one finger, measured on the hand model, in metres. Coordinates are in the frame of the anchor node:
 * x across the nail, y from the cuticle towards the tip, z up from the nail.
 */
export interface NailBed {
  /** Width of the nail. */
  readonly width: number;
  /** Length of the nail bed, from the cuticle to the fingertip end of the nail plate. */
  readonly length: number;
  /** Height of the nail surface: `gx·x + gy·y + gxx·x² + gxy·x·y + gyy·y²`. */
  readonly curve: { readonly gx: number; readonly gy: number; readonly gxx: number; readonly gxy: number; readonly gyy: number };
}

/** Node names of the nail anchors in `hand.glb` and `foot.glb`: one empty per finger or toe, a child of its last bone. */
export const NAIL_ANCHOR_NAMES: Readonly<Record<Digit, string>> = {
  thumb: 'NailBed_Thumb',
  index: 'NailBed_Index',
  middle: 'NailBed_Middle',
  ring: 'NailBed_Ring',
  little: 'NailBed_Pinky',
  bigToe: 'NailBed_BigToe',
  secondToe: 'NailBed_SecondToe',
  thirdToe: 'NailBed_ThirdToe',
  fourthToe: 'NailBed_FourthToe',
  littleToe: 'NailBed_LittleToe',
};

/** Reads the nail bed from the custom properties (`extras`) of an anchor node. Throws if one is missing or not a finite number. */
export function readNailBed(extras: Readonly<Record<string, unknown>>): NailBed {
  const number = (key: string): number => {
    const value = extras[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`Nail anchor property "${key}" must be a finite number.`);
    return value;
  };
  const length = number('bedLength');
  const width = number('nailWidth');
  if (length <= 0 || width <= 0) throw new RangeError('Nail anchor width and bed length must be positive.');
  return { width, length, curve: { gx: number('gx'), gy: number('gy'), gxx: number('gxx'), gxy: number('gxy'), gyy: number('gyy') } };
}

/** An anchor node of the model and the nail bed measured there. */
export interface NailAnchor {
  readonly node: Object3D;
  readonly bed: NailBed;
}

/** Finds the nail anchor of each of the given digits below `root`. Throws if one is missing. */
export function findNailAnchors<D extends Digit>(root: Object3D, digits: readonly D[]): Readonly<Record<D, NailAnchor>> {
  const anchors = {} as Record<D, NailAnchor>;
  for (const digit of digits) {
    const node = root.getObjectByName(NAIL_ANCHOR_NAMES[digit]);
    if (!node) throw new Error(`Model has no nail anchor "${NAIL_ANCHOR_NAMES[digit]}".`);
    anchors[digit] = { node, bed: readNailBed(node.userData) };
  }
  return anchors;
}
