import type { ColorFamily, Requirement, Stars, Wish, WishPart } from '../core';
import { DIGIT_LABELS, FINISH_LABELS, GEM_LABELS, SHAPE_LABELS, STICKER_LABELS } from './labels';

const COLOR_NAMES: Readonly<Record<ColorFamily, string>> = {
  red: 'rood',
  orange: 'oranje',
  yellow: 'geel',
  green: 'groen',
  blue: 'blauw',
  purple: 'paars',
  pink: 'roze',
  brown: 'bruin',
  white: 'wit',
  black: 'zwart',
  gray: 'grijs',
};

const FINISH_PHRASES: Readonly<Record<keyof typeof FINISH_LABELS, string>> = {
  gloss: 'glanzend',
  matte: 'mat',
  glitter: 'met glitter',
  metallic: 'metallic',
  chrome: 'in chroom',
};

/** Where a customer starts her wish. Which one she uses depends on who she is, so the same customer always talks the same way. */
const OPENERS = ['Hoi! Ik wil graag', 'Kun jij voor mij maken:', 'Ik hoop dat je dit kunt:', 'Fijn dat je er bent! Ik wil graag'] as const;

/** "alle nagels", "alle teennagels" or "de ringvinger". */
function scopeText(requirement: Requirement, part: WishPart): string {
  if (requirement.scope === 'all') return part === 'hand' ? 'alle nagels' : 'alle teennagels';
  return `de ${DIGIT_LABELS[requirement.scope].toLowerCase()}`;
}

function countText(min: number, max: number, one: string, many: string, kinds: readonly string[] | undefined): string {
  const amount = min === max ? `${min} ${min === 1 ? one : many}` : `${min} tot ${max} ${many}`;
  return kinds === undefined ? amount : `${amount} (${kinds.join(' of ').toLowerCase()})`;
}

function lengthText(min: number | undefined, max: number | undefined, limit: number): string {
  if (max !== undefined && max <= limit * 0.4) return 'kort';
  if (min !== undefined && min >= limit * 0.6) return 'lang';
  return 'niet te kort en niet te lang';
}

/** One requirement in Dutch, without a capital: "alle nagels in het rood", "de ringvinger met 1 steentje". */
export function requirementText(requirement: Requirement, lengthLimit: number, part: WishPart): string {
  const scope = scopeText(requirement, part);
  switch (requirement.kind) {
    case 'colorFamily':
      return `${scope} in het ${COLOR_NAMES[requirement.family]}`;
    case 'finish':
      return `${scope} ${FINISH_PHRASES[requirement.finish]}`;
    case 'shape':
      return `${scope} met vorm ${SHAPE_LABELS[requirement.shape].toLowerCase()}`;
    case 'length':
      return `${scope} ${lengthText(requirement.min, requirement.max, lengthLimit)}`;
    case 'french':
      return `${scope} ${requirement.on ? 'met een' : 'zonder'} french tip`;
    case 'stickers':
      return `${scope} met ${countText(requirement.min, requirement.max, 'sticker', 'stickers', requirement.kinds?.map((kind) => STICKER_LABELS[kind]))}`;
    case 'gems':
      return `${scope} met ${countText(requirement.min, requirement.max, 'steentje', 'steentjes', requirement.kinds?.map((kind) => GEM_LABELS[kind]))}`;
  }
}

/** The line of the wish card for a requirement, with a capital. */
export function checklistLine(requirement: Requirement, lengthLimit: number, part: WishPart): string {
  const text = requirementText(requirement, lengthLimit, part);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The wish as a short friendly text, from the requirements only. `customerId` picks her way of starting. */
export function wishText(wish: Wish, customerId: string, lengthLimit: number): string {
  const opener = OPENERS[[...customerId].reduce((sum, char) => sum + char.charCodeAt(0), 0) % OPENERS.length] ?? OPENERS[0];
  const parts = wish.requirements.map((requirement) => requirementText(requirement, lengthLimit, wish.part));
  const list = parts.length === 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} en ${parts[parts.length - 1] ?? ''}`;
  return `${opener} ${list}.`;
}

/** What the customer says about the result. */
export const REACTIONS: Readonly<Record<Stars, string>> = {
  3: 'Wauw, precies wat ik wilde!',
  2: 'Mooi gedaan, bijna perfect!',
  1: 'Het is oké, maar niet helemaal wat ik vroeg.',
  0: 'Oei, dit is niet wat ik wilde…',
};

/** ★★☆ for 2 of 3 stars. */
export function starsText(stars: Stars): string {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}

/** The mark in front of a requirement in the result: met (✔), partly met (≈) or missed (✖). */
export function resultMark(score: number): '✔' | '≈' | '✖' {
  return score >= 0.9 ? '✔' : score >= 0.4 ? '≈' : '✖';
}
