import { type Difficulty, MAX_DIFFICULTY, type Stars } from '../core';
import type { CustomerEntry } from '../scene/customerManifest';
import { parseManifest } from '../scene/customerManifest';

/**
 * The next customer: a different one from `current` when there is more than one. `random` returns a number in [0, 1), so tests need no randomness.
 * Returns null when there are no customers.
 */
export function nextCustomer(customers: readonly CustomerEntry[], current: CustomerEntry | null, random: () => number): CustomerEntry | null {
  const others = customers.filter((customer) => customer.id !== current?.id);
  const pool = others.length > 0 ? others : customers;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))] ?? null;
}

/** Loads the list of customers. Throws if the manifest cannot be read. */
export async function loadCustomers(fetcher: typeof fetch = (input, init) => fetch(input, init)): Promise<readonly CustomerEntry[]> {
  const response = await fetcher(`${import.meta.env.BASE_URL}assets/customers/manifest.json`);
  if (!response.ok) throw new Error(`Klanten laden mislukt (${response.status}).`);
  return parseManifest(await response.json());
}

/** URL of the model of a customer. */
export function customerModelUrl(customer: CustomerEntry): string {
  return `${import.meta.env.BASE_URL}assets/customers/${customer.file}`;
}

/** How hard the wishes are: chosen by the player, or 'auto' to climb by itself. */
export type Level = 'auto' | Difficulty;

/** The difficulty of the next wish: a chosen level stays; on 'auto' it goes up by one after a round of at least 2 stars. */
export function nextDifficulty(level: Level, current: Difficulty, best: Stars): Difficulty {
  if (level !== 'auto') return level;
  return best >= 2 ? (Math.min(MAX_DIFFICULTY, current + 1) as Difficulty) : current;
}
