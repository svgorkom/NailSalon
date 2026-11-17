import { type Dispatch, type KeyboardEvent, lazy, type PointerEvent as ReactPointerEvent, Suspense, useId, useLayoutEffect, useRef, useState } from 'react';
import { canRedo, canUndo, type Command, type Design, type Digit, FINGERS, FINISHES, type FrenchTip, type GemKind, type History, MAX_LENGTH, type Nail, NAIL_SHAPES, nailAt, type StickerKind, TOE_MAX_LENGTH, TOE_SHAPES, TOES } from '../core';
import { NailPaint } from '../scene/nailPaint';
import type { AiDesigner } from '../data/aiDesigner';
import type { DesignRepository } from '../data/designRepository';
import { AiTools, type ChatLine } from './AiTools';
import { ColorTool, DrawTools, FrenchTool, GemTools, StickerTools } from './DecorationTools';
import { DesignsMenu } from './DesignsMenu';
import { type Action } from './historyReducer';
import type { SavedState } from './saving';
import { DIGIT_LABELS, FINISH_LABELS, PALETTE, SHAPE_LABELS } from './labels';
import { NailPad } from './NailPad';
import { SKIN_TONES, type SkinToneId, skinToneOf } from './skin';
import type { DrawingTool } from './ToolIcon';
import { THEME_LABELS, THEMES, type Theme } from './theme';
import { clampToolsWidth, loadToolsWidth, saveToolsWidth } from './toolsWidth';

const ModelScene = lazy(() => import('../scene/ModelScene').then((module) => ({ default: module.ModelScene })));

/** Which part of the body is being painted. */
export type Part = 'hand' | 'foot';

type Mode = 'look' | 'draw' | 'sticker' | 'gem' | 'ai';

const MODE_LABELS: Readonly<Record<Mode, { readonly icon: string; readonly text: string }>> = {
  look: { icon: '💅', text: 'Lak' },
  draw: { icon: '🖌️', text: 'Tekenen' },
  sticker: { icon: '⭐', text: 'Stickers' },
  gem: { icon: '💎', text: 'Steentjes' },
  ai: { icon: '✨', text: 'AI' },
};

/** A French tip when it is turned on: white, over about a quarter of the nail. */
const NEW_FRENCH: FrenchTip = { color: '#f7f3ee', depth: 0.25 };

/** The number after the highest `s…` or `g…` id in the design, so a new sticker or gem never gets an id a nail already has. */
function nextItemNumber(design: Design): number {
  let highest = 0;
  for (const digit of [...FINGERS, ...TOES]) {
    const nail = nailAt(design, digit);
    for (const { id } of [...nail.stickers, ...nail.gems]) highest = Math.max(highest, Number(id.slice(1)) || 0);
  }
  return highest + 1;
}

/** A new seed for the pattern of a sponge stroke; the pad asks for it so that core and the scene stay free of randomness. */
function newSpongeSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}

interface EditorProps {
  readonly part: Part;
  readonly history: History;
  readonly dispatch: Dispatch<Action>;
  readonly theme: Theme;
  readonly onThemeChange: (theme: Theme) => void;
  readonly skin: SkinToneId;
  readonly onSkinChange: (skin: SkinToneId) => void;
  readonly repository: DesignRepository;
  readonly designer: AiDesigner;
  readonly newId: () => string;
  readonly saved: SavedState;
  readonly onSavedChange: (saved: SavedState) => void;
}

export function Editor({ part, history, dispatch, theme, onThemeChange, skin, onSkinChange, repository, designer, newId, saved, onSavedChange }: EditorProps) {
  const digits: readonly Digit[] = part === 'hand' ? FINGERS : TOES;
  const allTarget = part === 'hand' ? 'fingers' : 'toes';
  const shapes = part === 'hand' ? NAIL_SHAPES : TOE_SHAPES;
  const maxLength = part === 'hand' ? MAX_LENGTH : TOE_MAX_LENGTH;
  const [selected, setSelected] = useState<Digit | null>(null);
  const [allNails, setAllNails] = useState(false);
  const [mode, setMode] = useState<Mode>('look');
  const [drawTool, setDrawTool] = useState<DrawingTool>('brush');
  const [brushSize, setBrushSize] = useState(0.06);
  const [spongeSize, setSpongeSize] = useState(0.35);
  const [spongeOpacity, setSpongeOpacity] = useState(0.4);
  const [toolColor, setToolColor] = useState('#c8102e');
  const [stickerKind, setStickerKind] = useState<StickerKind>('heart');
  const [gemKind, setGemKind] = useState<GemKind>('diamond');
  const [gemColor, setGemColor] = useState('#f7f3ee');
  const [gemClear, setGemClear] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [chat, setChat] = useState<readonly ChatLine[]>([]);
  const [paint] = useState(() => new NailPaint());
  const itemCount = useRef(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const [toolsWidth, setToolsWidth] = useState(loadToolsWidth);
  const design = history.present;
  const target = allNails ? allTarget : selected;
  /** The one chosen nail; null for all nails or none. */
  const single = allNails ? null : selected;
  // For all nails at once the slider shows the first digit that is not the thumb or big toe; the command then sets every nail.
  const typical: Digit = part === 'hand' ? 'index' : 'secondToe';
  const lengthShown = nailAt(design, single ?? typical).length;
  // The pad shows the chosen nail; with all nails it shows a middle one unless another is chosen.
  const padDigit = selected ?? (allNails ? (part === 'hand' ? 'middle' : 'thirdToe') : null);
  const padNail = padDigit === null ? undefined : nailAt(design, padDigit);
  const shownNail = nailAt(design, single ?? typical);
  // For all nails the French tip shows as on only when every nail has the same one.
  const frenchShown = single === null ? (digits.every((digit) => JSON.stringify(nailAt(design, digit).french) === JSON.stringify(shownNail.french)) ? shownNail.french : null) : shownNail.french;
  const selectedGem = padNail?.gems.find(({ id }) => id === selectedItem);
  const modeLabelId = useId();
  /** Whether a choice is the current one: for one nail its value, for all nails only if every nail has it. */
  const shown = <K extends 'shape' | 'color' | 'finish'>(key: K, value: Nail[K]): boolean =>
    target === null ? false : single === null ? digits.every((digit) => nailAt(design, digit)[key] === value) : nailAt(design, single)[key] === value;

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
        <Suspense fallback={<p className="loading">{part === 'hand' ? 'Hand' : 'Voet'} laden…</p>}>
          <ModelScene part={part} design={design} selected={allNails ? null : selected} theme={theme} skin={skinToneOf(skin).color} paint={paint} onSelect={setSelected} />
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
          <DesignsMenu
            design={design}
            repository={repository}
            newId={newId}
            saved={saved}
            onSavedChange={onSavedChange}
            onRename={(name) => send({ type: 'rename', name })}
            onLoad={(loaded) => {
              dispatch({ type: 'load', design: loaded });
              itemCount.current = 0;
              setSelected(null);
              setSelectedItem(null);
            }}
          />
          <div className="tabs" role="group" aria-labelledby={modeLabelId}>
            <span id={modeLabelId} className="visually-hidden">
              Wat wil je doen?
            </span>
            {(Object.keys(MODE_LABELS) as Mode[]).map((name) => (
              <button key={name} type="button" className="choice tab" aria-pressed={name === mode} onClick={() => setMode(name)}>
                <span className="tab-icon" aria-hidden="true">
                  {MODE_LABELS[name].icon}
                </span>
                {MODE_LABELS[name].text}
              </button>
            ))}
          </div>
          <div className="row target">
            <p className="status" role="status">
              {allNails ? 'Alle nagels' : selected === null ? 'Tik op een nagel' : DIGIT_LABELS[selected]}
            </p>
            <label className="toggle">
              <input type="checkbox" role="switch" className="switch" checked={allNails} onChange={(event) => setAllNails(event.target.checked)} />
              Allemaal
            </label>
          </div>
          <div className="row history">
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
                  {shapes.map((shape) => (
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
                  max={maxLength}
                  step={part === 'hand' ? 0.1 : 0.05}
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
          ) : mode === 'ai' ? (
            <AiTools
              part={part}
              design={design}
              designer={designer}
              chat={chat}
              onChatChange={setChat}
              onDesign={(made) => {
                dispatch({ type: 'replace', design: made });
                setSelectedItem(null);
              }}
            />
          ) : (
            <>
              <NailPad
                digit={padDigit}
                target={target}
                design={design}
                paint={paint}
                tool={mode === 'draw' ? drawTool : mode}
                color={mode === 'gem' ? gemColor : toolColor}
                brushSize={brushSize}
                spongeSize={spongeSize}
                spongeOpacity={spongeOpacity}
                stickerKind={stickerKind}
                gemKind={gemKind}
                gemClear={gemClear}
                selectedItem={selectedItem}
                onCommand={send}
                onSelectItem={setSelectedItem}
                newSeed={newSpongeSeed}
                newItemId={() => `${mode === 'gem' ? 'g' : 's'}${(itemCount.current = Math.max(itemCount.current, nextItemNumber(design) - 1) + 1)}`}
              />
              <fieldset disabled={target === null} className="bare">
                {mode === 'draw' ? (
                  <>
                    <DrawTools
                      tool={drawTool}
                      color={toolColor}
                      onToolChange={setDrawTool}
                      size={brushSize}
                      onSizeChange={setBrushSize}
                      spongeSize={spongeSize}
                      onSpongeSizeChange={setSpongeSize}
                      spongeOpacity={spongeOpacity}
                      onSpongeOpacityChange={setSpongeOpacity}
                      canClear={padNail !== undefined && padNail.strokes.length > 0}
                      onClear={() => target && send({ type: 'clearDrawing', target })}
                    />
                    <ColorTool color={toolColor} onChange={setToolColor} />
                  </>
                ) : mode === 'sticker' ? (
                  <>
                    <ColorTool color={toolColor} onChange={setToolColor} />
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
                  </>
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
