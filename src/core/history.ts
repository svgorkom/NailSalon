import { apply, type Command } from './commands';
import type { Design } from './design';

/** Immutable undo/redo history of a design. */
export interface History {
  readonly past: readonly Design[];
  readonly present: Design;
  readonly future: readonly Design[];
}

export function createHistory(design: Design): History {
  return { past: [], present: design, future: [] };
}

/** Applies a command; a command that changes nothing is not recorded. Clears the redo stack. */
export function execute(history: History, command: Command): History {
  const next = apply(history.present, command);
  if (JSON.stringify(next) === JSON.stringify(history.present)) return history;
  return { past: [...history.past, history.present], present: next, future: [] };
}

export function canUndo(history: History): boolean {
  return history.past.length > 0;
}

export function canRedo(history: History): boolean {
  return history.future.length > 0;
}

export function undo(history: History): History {
  const previous = history.past.at(-1);
  if (previous === undefined) return history;
  return { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] };
}

export function redo(history: History): History {
  const [next, ...rest] = history.future;
  if (next === undefined) return history;
  return { past: [...history.past, history.present], present: next, future: rest };
}
