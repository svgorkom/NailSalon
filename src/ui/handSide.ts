import { readSetting, writeSetting } from './storage';

/** Which hand is shown. The model is a right hand; the left hand is its mirror image. */
export const HAND_SIDES = ['right', 'left'] as const;

export type HandSide = (typeof HAND_SIDES)[number];

export const DEFAULT_HAND_SIDE: HandSide = 'right';

export const HAND_SIDE_LABELS: Readonly<Record<HandSide, string>> = { right: '🤚 Rechterhand', left: '✋ Linkerhand' };

const STORAGE_KEY = 'nailsalon.hand';

/** The hand side with this id; the default for anything that is not one. */
export function handSideOf(id: string | null | undefined): HandSide {
  return HAND_SIDES.find((side) => side === id) ?? DEFAULT_HAND_SIDE;
}

export function loadHandSide(): HandSide {
  return handSideOf(readSetting(STORAGE_KEY));
}

export function saveHandSide(side: HandSide): void {
  writeSetting(STORAGE_KEY, side);
}
