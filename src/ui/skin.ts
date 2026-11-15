import { readSetting, writeSetting } from './storage';

/** Skin tones of the hand. Names are Dutch, colours are the base colour of the skin material. */
export const SKIN_TONES = [
  { id: 'very-light', name: 'Heel licht', color: '#f3cdb6' },
  { id: 'light', name: 'Licht', color: '#e9b9a0' },
  { id: 'medium', name: 'Middel', color: '#d9a07c' },
  { id: 'golden', name: 'Goudbruin', color: '#b9805a' },
  { id: 'brown', name: 'Bruin', color: '#8d5a3b' },
  { id: 'dark', name: 'Donker', color: '#5e3a26' },
] as const;

export type SkinToneId = (typeof SKIN_TONES)[number]['id'];

const DEFAULT_TONE = SKIN_TONES[1];

export const DEFAULT_SKIN: SkinToneId = DEFAULT_TONE.id;

const STORAGE_KEY = 'nailsalon.skin';

/** The skin tone with this id; the default for anything that is not one. */
export function skinToneOf(id: string | null | undefined): (typeof SKIN_TONES)[number] {
  return SKIN_TONES.find((tone) => tone.id === id) ?? DEFAULT_TONE;
}

export function loadSkin(): SkinToneId {
  return skinToneOf(readSetting(STORAGE_KEY)).id;
}

export function saveSkin(id: SkinToneId): void {
  writeSetting(STORAGE_KEY, id);
}

/** Average colour of the skin texture of the hand model (`public/assets/hand/hand.glb`), which the tint is relative to. */
const TEXTURE_AVERAGE = '#dba388';

/** sRGB channel (0..1) to linear light. */
function toLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function linearChannels(hex: string): readonly [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => toLinear(channel / 255)) as unknown as readonly [number, number, number];
}

/**
 * Linear RGB factors that turn the skin texture of the hand model into the given skin colour (`#rrggbb`).
 * A factor above 1 lightens that channel: the texture is a light-medium skin, lighter tones need a little more than 1.
 */
export function skinTint(color: string): readonly [number, number, number] {
  const [r, g, b] = linearChannels(color);
  const [ar, ag, ab] = linearChannels(TEXTURE_AVERAGE);
  return [r / ar, g / ag, b / ab];
}
