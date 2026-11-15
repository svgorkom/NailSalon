import { lazy, Suspense, useId, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { canRedo, canUndo, type Command, createDesign, createHistory, execute, type Finger, FINISHES, type History, redo, type StickerKind, undo } from '../core';
import { NailPaint } from '../scene/nailPaint';
import { ColorTool, DrawTools, StickerTools } from './DecorationTools';
import { FINGER_LABELS, FINISH_LABELS, PALETTE } from './labels';
import { NailPad } from './NailPad';
import { SKIN_TONES, type SkinToneId, skinToneOf } from './skin';
import { THEME_LABELS, THEMES, type Theme } from './theme';

const HandScene = lazy(() => import('../scene/HandScene').then((module) => ({ default: module.HandScene })));

type Mode = 'look' | 'draw' | 'sticker';

const MODE_LABELS: Readonly<Record<Mode, string>> = { look: 'Kleur', draw: 'Tekenen', sticker: 'Stickers' };

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
  const [mode, setMode] = useState<Mode>('look');
  const [eraser, setEraser] = useState(false);
  const [brushSize, setBrushSize] = useState(0.06);
  const [toolColor, setToolColor] = useState('#c8102e');
  const [stickerKind, setStickerKind] = useState<StickerKind>('heart');
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [paint] = useState(() => new NailPaint());
  const stickerCount = useRef(0);
  const design = history.present;
  const target = allNails ? 'all' : selected;
  // The pad shows the chosen nail; with all nails it shows the middle finger unless another is chosen.
  const padFinger = selected ?? (allNails ? 'middle' : null);
  const padNail = padFinger === null ? undefined : design.nails[padFinger];
  const modeLabelId = useId();

  // Before the browser paints, so the nail never shows a stale texture for one frame.
  useLayoutEffect(() => paint.sync(design), [paint, design]);

  const send = (command: Command) => dispatch({ type: 'command', command });

  return (
    <div className="editor">
      <div className="viewer">
        <Suspense fallback={<p className="loading">Hand laden…</p>}>
          <HandScene design={design} selected={allNails ? null : selected} theme={theme} skin={skinToneOf(skin).color} paint={paint} onSelect={setSelected} />
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
        <div className="choices" role="group" aria-labelledby={modeLabelId}>
          <span id={modeLabelId} className="visually-hidden">
            Wat wil je doen?
          </span>
          {(Object.keys(MODE_LABELS) as Mode[]).map((name) => (
            <button key={name} type="button" className="choice" aria-pressed={name === mode} onClick={() => setMode(name)}>
              {MODE_LABELS[name]}
            </button>
          ))}
        </div>
        {mode === 'look' ? (
          <>
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
          </>
        ) : (
          <>
            <NailPad
              finger={padFinger}
              target={target}
              design={design}
              paint={paint}
              tool={mode === 'sticker' ? 'sticker' : eraser ? 'eraser' : 'brush'}
              color={toolColor}
              brushSize={brushSize}
              stickerKind={stickerKind}
              selectedSticker={selectedSticker}
              onCommand={send}
              onSelectSticker={setSelectedSticker}
              newStickerId={() => `s${(stickerCount.current += 1)}`}
            />
            <fieldset disabled={target === null} className="bare">
              <ColorTool color={toolColor} onChange={setToolColor} />
              {mode === 'draw' ? (
                <DrawTools
                  eraser={eraser}
                  onEraserChange={setEraser}
                  size={brushSize}
                  onSizeChange={setBrushSize}
                  canClear={padNail !== undefined && padNail.strokes.length > 0}
                  onClear={() => target && send({ type: 'clearDrawing', target })}
                />
              ) : (
                <StickerTools
                  kind={stickerKind}
                  onKindChange={setStickerKind}
                  selected={padNail?.stickers.find(({ id }) => id === selectedSticker)}
                  canClear={padNail !== undefined && padNail.stickers.length > 0}
                  send={send}
                  target={target}
                  onRemoved={() => setSelectedSticker(null)}
                />
              )}
            </fieldset>
          </>
        )}
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
