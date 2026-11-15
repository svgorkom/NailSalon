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
