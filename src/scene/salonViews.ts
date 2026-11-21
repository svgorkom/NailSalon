import type { CameraView } from './ModelScene';

/** The two camera presets of the salon game, in metres of the customer model (origin on the table under her right wrist, she sits at -z). */
export const SALON_VIEWS = {
  /** Across the table: her face, her arms and her hand on the table. */
  salon: { position: [0.12, 0.6, 1.3], target: [0.12, 0.27, -0.05] },
  /** On the nails, like the camera of the free mode. */
  closeup: { position: [0.02, 0.3, 0.5], target: [0.02, 0, 0.09] },
} as const satisfies Record<string, CameraView>;

export type SalonViewId = keyof typeof SALON_VIEWS;

/** The camera while the customer reacts to the result: closer, on her face. */
export const REACTION_VIEW = { position: [0.13, 0.6, 0.7], target: [0.13, 0.48, -0.2] } as const satisfies CameraView;
