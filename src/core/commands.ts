import { type Design, type Finger, type Finish, FINGERS, type HexColor, isHexColor, MAX_LENGTH, MIN_LENGTH, type Nail, type NailShape } from './design';

/** Which nails a command applies to: one finger, or all of them. */
export type Target = Finger | 'all';

export type Command =
  | { readonly type: 'setShape'; readonly target: Target; readonly shape: NailShape }
  | { readonly type: 'setLength'; readonly target: Target; readonly length: number }
  | { readonly type: 'setColor'; readonly target: Target; readonly color: HexColor }
  | { readonly type: 'setFinish'; readonly target: Target; readonly finish: Finish }
  | { readonly type: 'rename'; readonly name: string };

/** Applies a command and returns a new design; the input is never changed. Throws on invalid input. */
export function apply(design: Design, command: Command): Design {
  switch (command.type) {
    case 'rename': {
      const name = command.name.trim();
      if (name.length === 0) throw new RangeError('Name must not be empty.');
      return { ...design, name };
    }
    case 'setShape':
      return updateNails(design, command.target, (nail) => ({ ...nail, shape: command.shape }));
    case 'setLength': {
      const { length } = command;
      if (!Number.isFinite(length) || length < MIN_LENGTH || length > MAX_LENGTH) {
        throw new RangeError(`Length must be between ${MIN_LENGTH} and ${MAX_LENGTH}.`);
      }
      return updateNails(design, command.target, (nail) => ({ ...nail, length }));
    }
    case 'setColor': {
      if (!isHexColor(command.color)) throw new RangeError('Colour must be #rrggbb.');
      const color = command.color.toLowerCase();
      return updateNails(design, command.target, (nail) => ({ ...nail, color }));
    }
    case 'setFinish':
      return updateNails(design, command.target, (nail) => ({ ...nail, finish: command.finish }));
  }
}

function updateNails(design: Design, target: Target, update: (nail: Nail) => Nail): Design {
  const fingers = target === 'all' ? FINGERS : [target];
  const nails = { ...design.nails };
  for (const finger of fingers) nails[finger] = update(nails[finger]);
  return { ...design, nails };
}
