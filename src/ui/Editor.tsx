import { type KeyboardEvent, lazy, type PointerEvent as ReactPointerEvent, Suspense, useId, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { canRedo, canUndo, type Command, createDesign, createHistory, execute, type Finger, FINGERS, FINISHES, type FrenchTip, type GemKind, type History, type Nail, NAIL_SHAPES, redo, type StickerKind, undo } from '../core';
import { NailPaint } from '../scene/nailPaint';
import { ColorTool, DrawTools, FrenchTool, GemTools, StickerTools } from './DecorationTools';
import { HAND_SIDE_LABELS, HAND_SIDES, type HandSide } from './handSide';
import { FINGER_LABELS, FINISH_LABELS, PALETTE, SHAPE_LABELS } from './labels';
import { NailPad } from './NailPad';
import { SKIN_TONES, type SkinToneId, skinToneOf } from './skin';
import { THEME_LABELS, THEMES, type Theme } from './theme';
import { clampToolsWidth, loadToolsWidth, saveToolsWidth } from './toolsWidth';

const HandScene = lazy(() => import('../scene/HandScene').then((module) => ({ default: module.HandScene })));

type Mode = 'look' | 'draw' | 'sticker' | 'gem';

const MODE_LABELS: Readonly<Record<Mode, string>> = { look: '💅 Lak', draw: '✏️ Tekenen', sticker: '⭐ Stickers', gem: '💎 Steentjes' };

/** A French tip when it is turned on: white, over about a quarter of the nail. */
const NEW_FRENCH: FrenchTip = { color: '#f7f3ee', depth: 0.25 };

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
  readonly handSide: HandSide;
  readonly onHandSideChange: (side: HandSide) => void;
}

export function Editor({ theme, onThemeChange, skin, onSkinChange, handSide, onHandSideChange }: EditorProps) {
  const [history, dispatch] = useReducer(reducer, undefined, () => createHistory(createDesign('Mijn ontwerp')));
  const [selected, setSelected] = useState<Finger | null>(null);
  const [allNails, setAllNails] = useState(false);
  const [mode, setMode] = useState<Mode>('look');
  const [eraser, setEraser] = useState(false);
  const [brushSize, setBrushSize] = useState(0.06);
  const [toolColor, setToolColor] = useState('#c8102e');
  const [stickerKind, setStickerKind] = useState<StickerKind>('heart');
  const [gemKind, setGemKind] = useState<GemKind>('diamond');
  const [gemColor, setGemColor] = useState('#f7f3ee');
  const [gemClear, setGemClear] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [paint] = useState(() => new NailPaint());
  const itemCount = useRef(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const [toolsWidth, setToolsWidth] = useState(loadToolsWidth);
  const design = history.present;
  const target = allNails ? 'all' : selected;
  // For all nails at once the slider shows the index finger; the command then sets every nail.
  const lengthShown = design.nails[target === null || target === 'all' ? 'index' : target].length;
  // The pad shows the chosen nail; with all nails it shows the middle finger unless another is chosen.
  const padFinger = selected ?? (allNails ? 'middle' : null);
  const padNail = padFinger === null ? undefined : design.nails[padFinger];
  const shownNail = design.nails[target === null || target === 'all' ? 'index' : target];
  // For all nails the French tip shows as on only when every nail has the same one.
  const frenchShown = target === 'all' ? (FINGERS.every((finger) => JSON.stringify(design.nails[finger].french) === JSON.stringify(shownNail.french)) ? shownNail.french : null) : shownNail.french;
  const selectedGem = padNail?.gems.find(({ id }) => id === selectedItem);
  const modeLabelId = useId();
  /** Whether a choice is the current one: for one nail its value, for all nails only if every nail has it. */
  const shown = <K extends 'shape' | 'color' | 'finish'>(key: K, value: Nail[K]): boolean =>
    target === null ? false : target === 'all' ? FINGERS.every((finger) => design.nails[finger][key] === value) : design.nails[target][key] === value;

  // Before the browser paints, so the nail never shows a stale texture for one frame.
  useLayoutEffect(() => paint.sync(design), [paint, design]);

  const send = (command: Command) => dispatch({ type: 'command', command });

  // In the gem tools a new colour or clearness also changes the selected gem.
  const restyleGem = (look: { color: string; clear: boolean }) => {
    if (selectedGem !== undefined && target !== null) send({ type: 'styleGem', target, id: selectedGem.id, look });
  };
  const gemColorShown = selectedGem?.color ?? gemColor;
  const gemClearShown = selectedGem?.clear ?? gemClear;
  const onGemColor = (color: string) => {
    setGemColor(color);
    restyleGem({ color, clear: gemClearShown });
  };
  const onGemClear = (clear: boolean) => {
    setGemClear(clear);
    restyleGem({ color: gemColorShown, clear });
  };

  // The width follows the pointer through a CSS variable, so dragging does not re-render the editor.
  const widthFor = (clientX: number): number => {
    const rect = editorRef.current?.getBoundingClientRect();
    return rect === undefined ? toolsWidth : clampToolsWidth(rect.right - clientX, rect.width);
  };
  const resizeTo = (width: number) => editorRef.current?.style.setProperty('--tools-width', `${width}px`);
  const onResizeMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) resizeTo(widthFor(event.clientX));
  };
  const onResizeEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const width = widthFor(event.clientX);
    resizeTo(width);
    setToolsWidth(width);
    saveToolsWidth(width);
  };
  const onResizeKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowLeft' ? 24 : event.key === 'ArrowRight' ? -24 : 0;
    if (step === 0) return;
    event.preventDefault();
    const width = clampToolsWidth(toolsWidth + step, editorRef.current?.getBoundingClientRect().width ?? 0);
    setToolsWidth(width);
    saveToolsWidth(width);
  };

  return (
    <div className="editor" ref={editorRef} style={{ ['--tools-width' as string]: `${toolsWidth}px` }}>
      <div className="viewer">
        <Suspense fallback={<p className="loading">Hand laden…</p>}>
          <HandScene design={design} selected={allNails ? null : selected} theme={theme} handSide={handSide} skin={skinToneOf(skin).color} paint={paint} onSelect={setSelected} />
        </Suspense>
        <div className="vignette" />
      </div>
      <div
        className="resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label="Breedte van het gereedschap"
        aria-valuenow={toolsWidth}
        tabIndex={0}
        onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeEnd}
        onKeyDown={onResizeKey}
      />
      <aside className="tools panel" aria-label="Gereedschap">
        <div className="tools-head">
          <div className="tabs" role="group" aria-labelledby={modeLabelId}>
            <span id={modeLabelId} className="visually-hidden">
              Wat wil je doen?
            </span>
            {(Object.keys(MODE_LABELS) as Mode[]).map((name) => (
              <button key={name} type="button" className="choice" aria-pressed={name === mode} onClick={() => setMode(name)}>
                {MODE_LABELS[name]}
              </button>
            ))}
          </div>
          <div className="row target">
            <p className="status" role="status">
              {target === null ? 'Tik op een nagel' : target === 'all' ? 'Alle nagels' : FINGER_LABELS[target]}
            </p>
            <label className="toggle">
              <input type="checkbox" role="switch" className="switch" checked={allNails} onChange={(event) => setAllNails(event.target.checked)} />
              Alle nagels
            </label>
          </div>
          <div className="row">
            <button type="button" className="grow" onClick={() => dispatch({ type: 'undo' })} disabled={!canUndo(history)}>
              ↶ Ongedaan
            </button>
            <button type="button" className="grow" onClick={() => dispatch({ type: 'redo' })} disabled={!canRedo(history)}>
              ↷ Opnieuw
            </button>
          </div>
        </div>
        <div className="tools-body">
          {mode === 'look' ? (
            <>
              <fieldset disabled={target === null}>
                <legend>Vorm</legend>
                <div className="choices">
                  {NAIL_SHAPES.map((shape) => (
                    <button key={shape} type="button" className="choice" aria-pressed={shown('shape', shape)} onClick={() => target && send({ type: 'setShape', target, shape })}>
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
                      aria-pressed={shown('color', color)}
                      onClick={() => target && send({ type: 'setColor', target, color })}
                    />
                  ))}
                </div>
              </fieldset>
              <fieldset disabled={target === null}>
                <legend>Afwerking</legend>
                <div className="choices">
                  {FINISHES.map((finish) => (
                    <button key={finish} type="button" className="choice" aria-pressed={shown('finish', finish)} onClick={() => target && send({ type: 'setFinish', target, finish })}>
                      {FINISH_LABELS[finish]}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset disabled={target === null}>
                <legend>French tip</legend>
                <FrenchTool french={frenchShown} fallback={NEW_FRENCH} onChange={(french) => target && send({ type: 'setFrench', target, french })} />
              </fieldset>
            </>
          ) : (
            <>
              <NailPad
                finger={padFinger}
                target={target}
                design={design}
                paint={paint}
                tool={mode === 'draw' ? (eraser ? 'eraser' : 'brush') : mode}
                color={mode === 'gem' ? gemColor : toolColor}
                brushSize={brushSize}
                stickerKind={stickerKind}
                gemKind={gemKind}
                gemClear={gemClear}
                selectedItem={selectedItem}
                onCommand={send}
                onSelectItem={setSelectedItem}
                newItemId={() => `${mode === 'gem' ? 'g' : 's'}${(itemCount.current += 1)}`}
              />
              <fieldset disabled={target === null} className="bare">
                {mode !== 'gem' && <ColorTool color={toolColor} onChange={setToolColor} />}
                {mode === 'draw' ? (
                  <DrawTools
                    eraser={eraser}
                    onEraserChange={setEraser}
                    size={brushSize}
                    onSizeChange={setBrushSize}
                    canClear={padNail !== undefined && padNail.strokes.length > 0}
                    onClear={() => target && send({ type: 'clearDrawing', target })}
                  />
                ) : mode === 'sticker' ? (
                  <StickerTools
                    kind={stickerKind}
                    onKindChange={(kind) => {
                      setStickerKind(kind);
                      setSelectedItem(null);
                    }}
                    selected={padNail?.stickers.find(({ id }) => id === selectedItem)}
                    canClear={padNail !== undefined && padNail.stickers.length > 0}
                    send={send}
                    target={target}
                    onRemoved={() => setSelectedItem(null)}
                  />
                ) : (
                  <GemTools
                    kind={gemKind}
                    onKindChange={setGemKind}
                    color={gemColorShown}
                    onColorChange={onGemColor}
                    clear={gemClearShown}
                    onClearChange={onGemClear}
                    selected={selectedGem}
                    canClear={padNail !== undefined && padNail.gems.length > 0}
                    send={send}
                    target={target}
                    onRemoved={() => setSelectedItem(null)}
                  />
                )}
              </fieldset>
            </>
          )}
          <details className="settings">
            <summary>⚙️ Instellingen</summary>
            <fieldset>
              <legend>Hand</legend>
              <div className="choices">
                {HAND_SIDES.map((side) => (
                  <button key={side} type="button" className="choice" aria-pressed={side === handSide} onClick={() => onHandSideChange(side)}>
                    {HAND_SIDE_LABELS[side]}
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
          </details>
        </div>
      </aside>
    </div>
  );
}
