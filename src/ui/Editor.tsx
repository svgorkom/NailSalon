import { lazy, Suspense, useReducer, useState } from 'react';
import { canRedo, canUndo, type Command, createDesign, createHistory, execute, type Finger, FINISHES, type History, redo, undo } from '../core';
import { FINGER_LABELS, FINISH_LABELS, PALETTE } from './labels';

const HandScene = lazy(() => import('../scene/HandScene').then((module) => ({ default: module.HandScene })));

type Action = { readonly type: 'command'; readonly command: Command } | { readonly type: 'undo' } | { readonly type: 'redo' };

function reducer(history: History, action: Action): History {
  switch (action.type) {
    case 'command':
      return execute(history, action.command);
    case 'undo':
      return undo(history);
    case 'redo':
      return redo(history);
  }
}

export function Editor() {
  const [history, dispatch] = useReducer(reducer, undefined, () => createHistory(createDesign('Mijn ontwerp')));
  const [selected, setSelected] = useState<Finger | null>(null);
  const [allNails, setAllNails] = useState(false);
  const design = history.present;
  const target = allNails ? 'all' : selected;

  const send = (command: Command) => dispatch({ type: 'command', command });

  return (
    <div className="editor">
      <div className="viewer">
        <Suspense fallback={<p className="loading">Hand laden…</p>}>
          <HandScene design={design} selected={allNails ? null : selected} onSelect={setSelected} />
        </Suspense>
      </div>
      <aside className="tools" aria-label="Gereedschap">
        <div className="row">
          <button type="button" onClick={() => dispatch({ type: 'undo' })} disabled={!canUndo(history)}>
            ↶ Ongedaan
          </button>
          <button type="button" onClick={() => dispatch({ type: 'redo' })} disabled={!canRedo(history)}>
            ↷ Opnieuw
          </button>
        </div>
        <label className="row">
          <input type="checkbox" checked={allNails} onChange={(event) => setAllNails(event.target.checked)} />
          Alle nagels tegelijk
        </label>
        <p className="status" role="status">
          {target === null ? 'Tik op een nagel om te beginnen.' : target === 'all' ? 'Alle nagels' : FINGER_LABELS[target]}
        </p>
        <fieldset disabled={target === null}>
          <legend>Kleur</legend>
          <div className="swatches">
            {PALETTE.map(({ color, name }) => (
              <button
                key={color}
                type="button"
                className="swatch"
                style={{ background: color }}
                title={name}
                aria-label={name}
                onClick={() => target && send({ type: 'setColor', target, color })}
              />
            ))}
          </div>
        </fieldset>
        <fieldset disabled={target === null}>
          <legend>Afwerking</legend>
          <div className="choices">
            {FINISHES.map((finish) => (
              <button key={finish} type="button" onClick={() => target && send({ type: 'setFinish', target, finish })}>
                {FINISH_LABELS[finish]}
              </button>
            ))}
          </div>
        </fieldset>
      </aside>
    </div>
  );
}
