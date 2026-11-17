import { type Command, createHistory, type Design, execute, type History, redo, undo } from '../core';

export type Action =
  | { readonly type: 'command'; readonly command: Command }
  | { readonly type: 'undo' }
  | { readonly type: 'redo' }
  /** An opened or new design; undo does not go back past it. */
  | { readonly type: 'load'; readonly design: Design };

export function historyReducer(history: History, action: Action): History {
  switch (action.type) {
    case 'command':
      return execute(history, action.command);
    case 'undo':
      return undo(history);
    case 'redo':
      return redo(history);
    case 'load':
      return createHistory(action.design);
  }
}
