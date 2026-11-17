import { type Command, createHistory, type Design, execute, type History, redo, replace, undo } from '../core';

export type Action =
  | { readonly type: 'command'; readonly command: Command }
  | { readonly type: 'undo' }
  | { readonly type: 'redo' }
  /** A whole new design, such as one made by the AI; one undo step brings back the old one. */
  | { readonly type: 'replace'; readonly design: Design }
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
    case 'replace':
      return replace(history, action.design);
    case 'load':
      return createHistory(action.design);
  }
}
