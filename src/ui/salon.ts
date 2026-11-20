import type { CustomerEntry } from '../scene/customerManifest';
import { parseManifest } from '../scene/customerManifest';

/** The wish of every customer until wishes come from `core` (phase 4): there is no score yet. */
export const TEST_WISH = 'Ik wil rode glanzende nagels, met één steentje op elke ringvinger.';

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
