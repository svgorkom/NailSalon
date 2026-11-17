import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { AI_MAX_HISTORY, AI_MAX_WISH_LENGTH, type AiChatMessage, type AiPart, type Design } from '../core';
import { AiError, type AiDesigner, type AiErrorKind } from '../data/aiDesigner';

/** A line in the chat; errors are shown but never sent to the AI. */
export interface ChatLine extends AiChatMessage {
  readonly error?: boolean;
}

/** Ready-made wishes for a quick start. */
const EXAMPLES: readonly { readonly icon: string; readonly text: string; readonly wish: string }[] = [
  { icon: '🌸', text: 'Zomer', wish: 'Vrolijke zomernagels met bloemetjes' },
  { icon: '🎂', text: 'Verjaardag', wish: 'Feestelijke nagels voor mijn verjaardag, met glitter' },
  { icon: '🦋', text: 'Vlinders', wish: 'Lichtblauwe nagels met vlinders' },
  { icon: '❄️', text: 'Winter', wish: 'Winterse nagels in wit en zilver met sterretjes' },
  { icon: '💎', text: 'Chic', wish: 'Chique French manicure met een paar steentjes' },
];

const ERRORS: Readonly<Record<AiErrorKind, string>> = {
  limit: 'De AI is moe voor vandaag. Morgen kan het weer! 😴',
  unavailable: 'De AI werkt alleen in de online versie, niet op de pc.',
  signedOut: 'Je bent uitgelogd. Laad de pagina opnieuw.',
  failed: 'Dat lukte niet. Probeer het nog eens, of zeg het anders.',
};

interface AiToolsProps {
  readonly part: AiPart;
  readonly design: Design;
  readonly designer: AiDesigner;
  readonly chat: readonly ChatLine[];
  readonly onChatChange: (chat: readonly ChatLine[]) => void;
  readonly onDesign: (design: Design) => void;
}

export function AiTools({ part, design, designer, chat, onChatChange, onDesign }: AiToolsProps) {
  const [wish, setWish] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list !== null) list.scrollTop = list.scrollHeight;
  }, [chat, busy]);

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length === 0 || busy) return;
    const history = chat.filter((line) => line.error !== true).slice(-AI_MAX_HISTORY).map(({ role, content }) => ({ role, content }));
    const asked = [...chat, { role: 'user' as const, content: trimmed }];
    onChatChange(asked);
    setWish('');
    setBusy(true);
    try {
      const answer = await designer.ask({ wish: trimmed, part, current: design, history });
      onDesign(answer.design);
      onChatChange([...asked, { role: 'assistant', content: answer.message || 'Klaar! ✨' }]);
    } catch (error) {
      const kind = error instanceof AiError ? error.kind : 'failed';
      onChatChange([...asked, { role: 'assistant', content: ERRORS[kind], error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void ask(wish);
  };
  // Enter sends, Shift+Enter starts a new line.
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void ask(wish);
    }
  };

  return (
    <fieldset className="ai">
      <legend>Vraag het de AI</legend>
      {chat.length === 0 ? (
        <>
          <p className="hint">Vertel wat je wilt, bijvoorbeeld "roze met hartjes". Daarna kun je zeggen: "maak het donkerder". Met ↶ Ongedaan ga je terug.</p>
          <div className="choices ai-examples">
            {EXAMPLES.map((example) => (
              <button key={example.text} type="button" className="choice" disabled={busy} onClick={() => void ask(example.wish)}>
                <span aria-hidden="true">{example.icon}</span> {example.text}
              </button>
            ))}
          </div>
        </>
      ) : (
        <ol className="ai-chat" ref={listRef} aria-live="polite">
          {chat.map((line, index) => (
            <li key={index} className={`ai-line ${line.role}${line.error === true ? ' error' : ''}`}>
              {line.content}
            </li>
          ))}
          {busy && (
            <li className="ai-line assistant busy" aria-label="De AI is bezig">
              <span className="ai-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </li>
          )}
        </ol>
      )}
      <form className="ai-form" onSubmit={onSubmit}>
        <textarea
          className="ai-input"
          rows={2}
          maxLength={AI_MAX_WISH_LENGTH}
          value={wish}
          placeholder={chat.length === 0 ? 'Wat wil je op je nagels?' : 'Wat moet er anders?'}
          aria-label="Je wens voor de AI"
          disabled={busy}
          onChange={(event) => setWish(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <button type="submit" className="primary" disabled={busy || wish.trim().length === 0}>
          {busy ? 'Even denken…' : '✨ Maak'}
        </button>
      </form>
      {chat.length > 0 && (
        <button type="button" className="ai-new" disabled={busy} onClick={() => onChatChange([])}>
          Nieuw gesprek
        </button>
      )}
    </fieldset>
  );
}
