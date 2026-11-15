import { lazy, Suspense, useReducer, useState } from 'react';
import { canRedo, canUndo, type Command, createDesign, createHistory, execute, type Finger, FINISHES, type History, NAIL_SHAPES, redo, undo } from '../core';
import { FINGER_LABELS, FINISH_LABELS, PALETTE, SHAPE_LABELS } from './labels';
import { SKIN_TONES, type SkinToneId, skinToneOf } from './skin';
import { THEME_LABELS, THEMES, type Theme } from './theme';

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

interface EditorProps {
  readonly theme: Theme;
  readonly onThemeChange: (theme: Theme) => void;
  readonly skin: SkinToneId;
  readonly onSkinChange: (skin: SkinToneId) => void;
}

export function Editor({ theme, onThemeChange, skin, onSkinChange }: EditorProps) {
  const [history, dispatch] = useReducer(reducer, undefined, () => createHistory(createDesign('Mijn ontwerp')));
  const [selected, setSelected] = useState<Finger | null>(null);
  const [allNails, setAllNails] = useState(false);
  const design = history.present;
  const target = allNails ? 'all' : selected;
  // For all nails at once the slider shows the index finger; the command then sets every nail.
  const lengthShown = design.nails[target === null || target === 'all' ? 'index' : target].length;

  const send = (command: Command) => dispatch({ type: 'command', command });

  return (
    <div className="editor">
      <div className="viewer">
        <Suspense fallback={<p className="loading">Hand laden…</p>}>
          <HandScene design={design} selected={allNails ? null : selected} theme={theme} skin={skinToneOf(skin).color} onSelect={setSelected} />
        </Suspense>
        <div className="vignette" />
      </div>
      <aside className="tools panel" aria-label="Gereedschap">
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
          <legend>Vorm</legend>
          <div className="choices">
            {NAIL_SHAPES.map((shape) => (
              <button key={shape} type="button" className="choice" onClick={() => target && send({ type: 'setShape', target, shape })}>
                {SHAPE_LABELS[shape]}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset disabled={target === null}>
          <legend>Lengte</legend>
          <input
            type="range"
            className="length"
            min={0}
            max={1}
            step={0.1}
            value={lengthShown}
            aria-label="Lengte van de nagel"
            onChange={(event) => target && send({ type: 'setLength', target, length: Number(event.target.value) })}
          />
        </fieldset>
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
              <button key={finish} type="button" className="choice" onClick={() => target && send({ type: 'setFinish', target, finish })}>
                {FINISH_LABELS[finish]}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Huidskleur</legend>
          <div className="swatches">
            {SKIN_TONES.map(({ id, name, color }) => (
              <button
                key={id}
                type="button"
                className="swatch"
                style={{ background: color }}
                title={name}
                aria-label={name}
                aria-pressed={id === skin}
                onClick={() => onSkinChange(id)}
              />
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Thema</legend>
          <div className="choices">
            {THEMES.map((name) => (
              <button key={name} type="button" className="choice" aria-pressed={name === theme} onClick={() => onThemeChange(name)}>
                {THEME_LABELS[name]}
              </button>
            ))}
          </div>
        </fieldset>
      </aside>
    </div>
  );
}
