import { AI_MAX_HISTORY, AI_MAX_MESSAGE_LENGTH, AI_MAX_WISH_LENGTH, type AiChatMessage, aiAnswerSchema, type AiPart, type Design, FINGERS, nailAt, parseAiAnswer, parseDesign, TOES } from '../core';
import { json, problem } from './api';
import type { D1Like } from './store';

/** Model used when `AI_MODEL` is not set; it supports JSON Schema answers on Workers AI. */
export const DEFAULT_AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

/** AI requests per account per day (UTC). Keeps both accounts together within the free Workers AI allocation. */
export const AI_DAILY_LIMIT = 15;

/** The request body: whole designs with a lot of drawing still fit. */
const MAX_AI_BODY_BYTES = 1_500_000;

/** The part of the Workers AI binding this code uses (see Cloudflare's `Ai`). */
export interface AiLike {
  run(model: string, input: Readonly<Record<string, unknown>>): Promise<unknown>;
}

/** How many AI requests each account made per day. */
export interface AiUsage {
  /** Counts one more request for `owner` on `day` and returns the new count. */
  add(owner: string, day: string): Promise<number>;
}

export interface AiContext {
  readonly ai: AiLike;
  readonly model: string;
  readonly usage: AiUsage;
  readonly owner: string;
  /** Milliseconds since 1970. */
  readonly now: number;
  readonly newId: () => string;
}

const SYSTEM_PROMPT = `You design nail art in the NailSalon app for a 12-year-old girl.
Rules:
- You only make nail designs. If she asks about anything else, kindly say in "message" that you only design nails, and give back the current design unchanged.
- Fill in every nail, using only the options in the JSON schema. Colours are #rrggbb.
- Positions on a nail: x 0 is the left edge and 1 the right edge; y 0 is the free edge (tip) and 1 the cuticle. Keep stickers and gems between 0.15 and 0.85.
- Stickers and gems are small: sticker size about 0.2 to 0.4, gem size about 0.1 to 0.2. Use at most a few per nail; many nails can have none.
- When she asks for a change ("make it darker", "a gem on the ring finger"), change only that and keep everything else exactly as in the current design.
- "name": a short Dutch name for the design. "message": one or two short, cheerful sentences in Dutch about what you made. Never ask for personal information.`;

/**
 * `POST /api/ai/design` with `{ wish, part, current, history }`: asks the model for a design and answers
 * `{ design, message }`. 429 when the daily limit (ours or Workers AI's) is reached, 422 when the model gave no usable
 * design twice, 502 when Workers AI failed.
 */
export async function handleAiDesign(request: Request, context: AiContext): Promise<Response> {
  if (request.method !== 'POST') return problem(405, 'Method not allowed.');
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_AI_BODY_BYTES) return problem(413, 'Request is too large.');
  const body = await request.text();
  if (body.length > MAX_AI_BODY_BYTES) return problem(413, 'Request is too large.');

  let input: AiRequest;
  try {
    input = parseRequest(JSON.parse(body));
  } catch (error) {
    if (error instanceof SyntaxError) return problem(400, 'Body must be JSON.');
    if (error instanceof RangeError) return problem(400, error.message);
    throw error;
  }

  const day = new Date(context.now).toISOString().slice(0, 10);
  if ((await context.usage.add(context.owner, day)) > AI_DAILY_LIMIT) return problem(429, 'Daily AI limit reached.');

  const messages: { role: string; content: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...input.history,
    { role: 'user', content: `Current design of the ${input.part === 'hand' ? 'fingernails' : 'toenails'}:\n${describePart(input.current, input.part)}\n\nWish: ${input.wish}` },
  ];
  const schema = aiAnswerSchema(input.part);
  for (let attempt = 0; attempt < 2; attempt++) {
    let output: unknown;
    try {
      output = await context.ai.run(context.model, { messages, response_format: { type: 'json_schema', json_schema: schema }, max_tokens: 4096 });
    } catch (error) {
      if (isQuotaError(error)) return problem(429, 'Workers AI daily allocation used up.');
      // "JSON Mode couldn't be met" and similar: worth one more try.
      if (attempt === 0) continue;
      return problem(502, 'The AI did not answer.');
    }
    try {
      const answer = parseAiAnswer(answerOf(output), input.current, input.part, context.newId);
      return json(200, answer);
    } catch (error) {
      if (!(error instanceof RangeError || error instanceof SyntaxError)) throw error;
      messages.push({ role: 'user', content: `That answer could not be used (${error.message}). Answer again with valid JSON that follows the schema.` });
    }
  }
  return problem(422, 'The AI gave no usable design.');
}

interface AiRequest {
  readonly wish: string;
  readonly part: AiPart;
  readonly current: Design;
  readonly history: readonly AiChatMessage[];
}

function parseRequest(value: unknown): AiRequest {
  if (typeof value !== 'object' || value === null) throw new RangeError('Body must be an object.');
  const fields = value as Readonly<Record<string, unknown>>;
  const wish = typeof fields.wish === 'string' ? fields.wish.trim() : '';
  if (wish.length === 0 || wish.length > AI_MAX_WISH_LENGTH) throw new RangeError(`wish must be 1 to ${AI_MAX_WISH_LENGTH} characters.`);
  if (fields.part !== 'hand' && fields.part !== 'foot') throw new RangeError('part must be hand or foot.');
  const history = fields.history ?? [];
  if (!Array.isArray(history) || history.length > AI_MAX_HISTORY) throw new RangeError(`history must be a list of at most ${AI_MAX_HISTORY} messages.`);
  return { wish, part: fields.part, current: parseDesign(fields.current), history: history.map(parseMessage) };
}

function parseMessage(value: unknown): AiChatMessage {
  const { role, content } = (typeof value === 'object' && value !== null ? value : {}) as Readonly<Record<string, unknown>>;
  if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string' || content.length > Math.max(AI_MAX_WISH_LENGTH, AI_MAX_MESSAGE_LENGTH)) {
    throw new RangeError('Every history message needs a role (user or assistant) and a short content.');
  }
  return { role, content };
}

/** The nails of one part as the model sees them: without drawing strokes and ids, which it may not change. */
function describePart(design: Design, part: AiPart): string {
  const digits = part === 'hand' ? FINGERS : TOES;
  const nails = Object.fromEntries(
    digits.map((digit) => {
      const { strokes, ...nail } = nailAt(design, digit);
      return [digit, { ...nail, hasDrawing: strokes.length > 0 }];
    }),
  );
  // Ids of stickers and gems are left out: the AI never makes them.
  return JSON.stringify({ name: design.name, nails }, (key, value: unknown) => (key === 'id' ? undefined : value));
}

/** Workers AI gives `{ response }` with an object (JSON mode) or text; OpenAI-style models give `choices`. */
function answerOf(output: unknown): unknown {
  const fields = (typeof output === 'object' && output !== null ? output : {}) as Readonly<Record<string, unknown>>;
  const choices = fields.choices as readonly { message?: { content?: unknown } }[] | undefined;
  const answer = fields.response ?? choices?.[0]?.message?.content;
  return typeof answer === 'string' ? JSON.parse(answer) : answer;
}

/** Workers AI error 4006: the free daily allocation of Neurons is used up. */
function isQuotaError(error: unknown): boolean {
  return error instanceof Error && /4006|daily free allocation|neurons/i.test(error.message);
}

/** The table is created on first use, like the designs table. */
const USAGE_SCHEMA = `CREATE TABLE IF NOT EXISTS ai_usage (
  owner TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (owner, day)
)`;

export function d1AiUsage(db: D1Like): AiUsage {
  let ready: Promise<unknown> | null = null;
  const table = () => (ready ??= db.prepare(USAGE_SCHEMA).run().catch((error: unknown) => {
    ready = null;
    throw error;
  }));
  return {
    async add(owner, day) {
      await table();
      const row = await db
        .prepare('INSERT INTO ai_usage (owner, day, count) VALUES (?, ?, 1) ON CONFLICT (owner, day) DO UPDATE SET count = count + 1 RETURNING count')
        .bind(owner, day)
        .first<{ count: number }>();
      return row?.count ?? 1;
    },
  };
}
