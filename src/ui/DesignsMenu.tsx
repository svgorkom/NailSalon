import { useRef, useState } from 'react';
import { createDesign, type Design, MAX_NAME_LENGTH } from '../core';
import type { DesignRepository, DesignSummary } from '../data/designRepository';
import { errorText, isUnsaved, type SavedState, startState } from './saving';

interface DesignsMenuProps {
  readonly design: Design;
  readonly repository: DesignRepository;
  /** Makes the id of a design that is saved for the first time. */
  readonly newId: () => string;
  /** The saved copy of the open design. */
  readonly saved: SavedState;
  readonly onSavedChange: (saved: SavedState) => void;
  readonly onRename: (name: string) => void;
  /** Replaces the design in the editor; undo starts afresh. */
  readonly onLoad: (design: Design) => void;
}

/** Name field, save button and the "Mijn ontwerpen" window to open, star and delete saved designs. */
export function DesignsMenu({ design, repository, newId, saved, onSavedChange: setSaved, onRename, onLoad }: DesignsMenuProps) {
  const [name, setName] = useState(design.name);
  const [nameOf, setNameOf] = useState(design.name);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<readonly DesignSummary[] | null>(null);
  const [listMessage, setListMessage] = useState('');
  // A second tap confirms: opening over unsaved work, or deleting.
  const [confirm, setConfirm] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const unsaved = isUnsaved(design, saved);

  // Undo, redo and opening change the name from outside the field.
  if (nameOf !== design.name) {
    setNameOf(design.name);
    setName(design.name);
  }

  const commitName = () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) setName(design.name);
    else if (trimmed !== design.name) onRename(trimmed);
  };

  const save = async () => {
    setBusy(true);
    setMessage('Opslaan…');
    try {
      const id = saved.id ?? newId();
      const summary = await repository.save(id, design, saved.favorite);
      setSaved({ id, favorite: summary.favorite, json: JSON.stringify(design) });
      setMessage('Opgeslagen ✓');
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const openList = async () => {
    setConfirm(null);
    setListMessage('Laden…');
    setList(null);
    dialog.current?.showModal();
    try {
      setList(await repository.list());
      setListMessage('');
    } catch (error) {
      setListMessage(errorText(error));
    }
  };

  const guard = (key: string, action: () => void) => {
    if (unsaved && confirm !== key) {
      setConfirm(key);
      return;
    }
    action();
  };

  const open = async (summary: DesignSummary) => {
    setListMessage('Openen…');
    try {
      const opened = await repository.open(summary.id);
      onLoad(opened.design);
      setSaved({ id: summary.id, favorite: opened.summary.favorite, json: JSON.stringify(opened.design) });
      setMessage('');
      dialog.current?.close();
    } catch (error) {
      setListMessage(errorText(error));
    }
  };

  const startNew = () => {
    const blank = createDesign('Mijn ontwerp');
    onLoad(blank);
    setSaved(startState(blank));
    setMessage('');
    dialog.current?.close();
  };

  const toggleFavorite = async (summary: DesignSummary) => {
    try {
      await repository.setFavorite(summary.id, !summary.favorite);
      setList((current) => current?.map((item) => (item.id === summary.id ? { ...item, favorite: !summary.favorite } : item)) ?? null);
      if (saved.id === summary.id) setSaved({ ...saved, favorite: !summary.favorite });
    } catch (error) {
      setListMessage(errorText(error));
    }
  };

  const remove = async (summary: DesignSummary) => {
    if (confirm !== `delete:${summary.id}`) {
      setConfirm(`delete:${summary.id}`);
      return;
    }
    try {
      await repository.remove(summary.id);
      setList((current) => current?.filter(({ id }) => id !== summary.id) ?? null);
      // The design stays in the editor as unsaved work; saving it again makes a new copy.
      if (saved.id === summary.id) setSaved({ id: null, favorite: false, json: '' });
      setConfirm(null);
    } catch (error) {
      setListMessage(errorText(error));
    }
  };

  return (
    <div className="designs-menu">
      <input
        type="text"
        className="design-name"
        aria-label="Naam van je ontwerp"
        maxLength={MAX_NAME_LENGTH}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={commitName}
        onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
      />
      <div className="row">
        <button type="button" className="grow" onClick={save} disabled={busy}>
          💾 Opslaan
        </button>
        <button type="button" className="grow" onClick={openList}>
          📂 Mijn ontwerpen
        </button>
      </div>
      {message !== '' && (
        <p className="save-status" role="status">
          {message}
        </p>
      )}
      <dialog ref={dialog} className="designs-dialog panel" aria-labelledby="designs-title">
        <div className="row">
          <h2 id="designs-title" className="grow">
            📂 Mijn ontwerpen
          </h2>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Sluiten">
            ✕
          </button>
        </div>
        {unsaved && confirm !== null && !confirm.startsWith('delete:') && <p className="warning">Je ontwerp is nog niet opgeslagen. Tik nog een keer als je het niet meer nodig hebt.</p>}
        <button type="button" onClick={() => guard('new', startNew)}>
          {confirm === 'new' ? 'Toch nieuw beginnen?' : '✨ Nieuw ontwerp'}
        </button>
        {listMessage !== '' && <p role="status">{listMessage}</p>}
        {list !== null && list.length === 0 && <p>Je hebt nog niets opgeslagen.</p>}
        {list !== null && list.length > 0 && (
          <ul className="designs-list">
            {list.map((summary) => (
              <li key={summary.id} aria-current={summary.id === saved.id ? 'true' : undefined}>
                <button type="button" className="star" aria-pressed={summary.favorite} aria-label={summary.favorite ? 'Geen favoriet meer' : 'Favoriet'} onClick={() => toggleFavorite(summary)}>
                  {summary.favorite ? '★' : '☆'}
                </button>
                <span className="grow">
                  {summary.name}
                  <small>{new Date(summary.updatedAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</small>
                </span>
                <button type="button" onClick={() => guard(`open:${summary.id}`, () => void open(summary))}>
                  {confirm === `open:${summary.id}` ? 'Toch openen?' : 'Openen'}
                </button>
                <button type="button" onClick={() => remove(summary)} aria-label={`${summary.name} weggooien`}>
                  {confirm === `delete:${summary.id}` ? 'Echt weg?' : '🗑️'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </dialog>
    </div>
  );
}
