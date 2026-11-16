import { type Command, execute, type History, redo, undo } from '../core';

export type Action = { readonly type: 'command'; readonly command: Command } | { readonly type: 'undo' } | { readonly type: 'redo' };

export function historyReducer(history: History, action: Action): History {
  switch (action.type) {
    case 'command':
      return execute(history, action.command);
    case 'undo':
      return undo(history);
    case 'redo':
      return redo(history);
  }
}
