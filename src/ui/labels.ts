import type { Finger, Finish, NailShape } from '../core';

/** Dutch user-facing names. */
export const FINGER_LABELS: Readonly<Record<Finger, string>> = {
  thumb: 'Duim',
  index: 'Wijsvinger',
  middle: 'Middelvinger',
  ring: 'Ringvinger',
  little: 'Pink',
};

export const SHAPE_LABELS: Readonly<Record<NailShape, string>> = {
  round: 'Rond',
  oval: 'Ovaal',
  almond: 'Amandel',
  square: 'Vierkant',
  squoval: 'Zacht vierkant',
  stiletto: 'Stiletto',
  coffin: 'Ballerina',
};

export const FINISH_LABELS: Readonly<Record<Finish, string>> = {
  gloss: 'Glans',
  matte: 'Mat',
  glitter: 'Glitter',
  metallic: 'Metallic',
  chrome: 'Chroom',
};

export const PALETTE: readonly { color: string; name: string }[] = [
  { color: '#e8a0b4', name: 'Roze' },
  { color: '#c8102e', name: 'Rood' },
  { color: '#7b2d8e', name: 'Paars' },
  { color: '#2a6fdb', name: 'Blauw' },
  { color: '#2bb673', name: 'Groen' },
  { color: '#f5c518', name: 'Geel' },
  { color: '#111111', name: 'Zwart' },
  { color: '#f7f3ee', name: 'Wit' },
];
