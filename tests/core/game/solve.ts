import { apply, type ColorFamily, type Command, createDesign, type Design, type Gem, type NailScope, type Requirement, type Sticker, type Stroke, type Wish, lengthLimit } from '../../../src/core';

/** A colour that lies well inside each family. */
export const CANONICAL_COLORS: Readonly<Record<ColorFamily, string>> = {
  red: '#e0201a',
  orange: '#ff8000',
  yellow: '#ffe000',
  green: '#20a030',
  blue: '#2060e0',
  purple: '#8030c0',
  pink: '#ff69b4',
  brown: '#7a4a28',
  white: '#ffffff',
  black: '#000000',
  gray: '#808080',
};

function target(part: Wish['part'], scope: NailScope) {
  if (scope !== 'all') return scope;
  return part === 'hand' ? 'fingers' : 'toes';
}

function commandsFor(part: Wish['part'], requirement: Requirement): Command[] {
  const at = target(part, requirement.scope);
  switch (requirement.kind) {
    case 'colorFamily':
      return [{ type: 'setColor', target: at, color: CANONICAL_COLORS[requirement.family] }];
    case 'finish':
      return [{ type: 'setFinish', target: at, finish: requirement.finish }];
    case 'shape':
      return [{ type: 'setShape', target: at, shape: requirement.shape }];
    case 'length': {
      const low = requirement.min ?? 0;
      const high = requirement.max ?? lengthLimit(part);
      return [{ type: 'setLength', target: at, length: (low + high) / 2 }];
    }
    case 'french':
      return [{ type: 'setFrench', target: at, french: requirement.on ? { color: '#ffffff', depth: 0.2 } : null }];
    case 'sponge': {
      const stroke: Stroke = { color: CANONICAL_COLORS[requirement.family ?? 'pink'], size: 0.3, erase: false, points: [0.5, 0.4, 0.5, 0.6], sponge: { seed: 1, opacity: 0.4 } };
      return [{ type: 'addStroke', target: at, stroke }];
    }
    case 'stickers':
      return Array.from({ length: requirement.min }, (_, index): Command => {
        const sticker: Sticker = { id: `s${index}`, kind: requirement.kinds?.[0] ?? 'heart', color: '#ffffff', x: 0.5, y: 0.2 + index * 0.2, size: 0.2, rotation: 0 };
        return { type: 'addSticker', target: at, sticker };
      });
    case 'gems':
      return Array.from({ length: requirement.min }, (_, index): Command => {
        const gem: Gem = { id: `g${index}`, kind: requirement.kinds?.[0] ?? 'diamond', color: '#ffffff', clear: true, x: 0.5, y: 0.2 + index * 0.2, size: 0.15, rotation: 0 };
        return { type: 'addGem', target: at, gem };
      });
  }
}

/** The test oracle: builds a design that meets every requirement of the wish, so a perfect score must be possible. */
export function solve(wish: Wish): Design {
  return wish.requirements.flatMap((requirement) => commandsFor(wish.part, requirement)).reduce(apply, createDesign('Oracle'));
}
