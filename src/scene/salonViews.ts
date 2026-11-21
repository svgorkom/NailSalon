import type { CameraView } from './ModelScene';

/** The camera presets of the salon game, in metres of the customer model. */
export interface SalonViews {
  /** Her face, her body and the part she is there for. */
  readonly salon: CameraView;
  /** On the nails, like the camera of the free mode. */
  readonly closeup: CameraView;
  /** While she reacts to the result: closer, on her face. */
  readonly reaction: CameraView;
}

/** A manicure: the origin is on the table under her right wrist, she sits at -z behind the table. */
const HAND_VIEWS = {
  salon: { position: [0.12, 0.6, 1.3], target: [0.12, 0.27, -0.05] },
  closeup: { position: [0.02, 0.3, 0.5], target: [0.02, 0, 0.09] },
  reaction: { position: [0.13, 0.6, 0.7], target: [0.13, 0.48, -0.2] },
} as const satisfies SalonViews;

/** A pedicure: the origin is on the footrest under her right ankle, she sits on a chair at -z with the leg stretched out towards the player. */
const FOOT_VIEWS = {
  salon: { position: [0.15, 0.7, 2.0], target: [0.08, 0.3, -0.3] },
  closeup: { position: [0.04, 0.42, 0.5], target: [0, 0.06, 0.1] },
  reaction: { position: [0.1, 1.05, 0.35], target: [0.05, 0.95, -0.62] },
} as const satisfies SalonViews;

export const SALON_VIEWS: Readonly<Record<'hand' | 'foot', SalonViews>> = { hand: HAND_VIEWS, foot: FOOT_VIEWS };

export type SalonViewId = 'salon' | 'closeup';
