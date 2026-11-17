import type { Design } from '../core';
import { RepositoryError } from '../data/designRepository';

/** The design that is open, as it was last saved, opened or started. */
export interface SavedState {
  /** Null until the design is saved for the first time. */
  readonly id: string | null;
  readonly favorite: boolean;
  /** The design as JSON at that moment. */
  readonly json: string;
}

/** A design that was just started: nothing to lose until it changes. */
export function startState(design: Design): SavedState {
  return { id: null, favorite: false, json: JSON.stringify(design) };
}

/** Whether the design has changes that would be lost. */
export function isUnsaved(design: Design, saved: SavedState): boolean {
  return JSON.stringify(design) !== saved.json;
}

/** A short Dutch message for a failed save, open or delete. */
export function errorText(error: unknown): string {
  if (!(error instanceof RepositoryError)) return 'Dat lukte niet. Probeer het nog eens.';
  switch (error.kind) {
    case 'unavailable':
      return 'Opslaan werkt alleen in de online app.';
    case 'signedOut':
      return 'Je bent uitgelogd. Herlaad de pagina en log opnieuw in.';
    case 'tooLarge':
      return 'Dit ontwerp is te groot om op te slaan. Gum een paar tekeningen uit.';
    case 'failed':
      return 'Dat lukte niet. Probeer het nog eens.';
  }
}
