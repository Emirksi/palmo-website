// Hand renders from the app (public/assets/hand-motion/<L>-front-step-0.png), normalized to one scale.
// w/h are the processed pixel sizes. `cut` is where the forearm leaves the frame, so the stage can
// crop the hand there and it never looks like a floating cut-out.
export type Cut = 'bottom' | 'right' | 'top-right'
export const HANDS: Record<string, { w: number; h: number; cut: Cut }> = {
  A: { w: 272, h: 488, cut: 'bottom' }, B: { w: 234, h: 658, cut: 'bottom' }, C: { w: 278, h: 564, cut: 'bottom' },
  D: { w: 288, h: 642, cut: 'bottom' }, E: { w: 234, h: 508, cut: 'bottom' }, F: { w: 278, h: 658, cut: 'bottom' },
  G: { w: 640, h: 242, cut: 'right' }, H: { w: 658, h: 234, cut: 'right' }, I: { w: 234, h: 552, cut: 'bottom' },
  J: { w: 233, h: 549, cut: 'bottom' }, K: { w: 278, h: 648, cut: 'bottom' }, L: { w: 451, h: 639, cut: 'bottom' },
  M: { w: 242, h: 434, cut: 'bottom' }, N: { w: 260, h: 434, cut: 'bottom' }, O: { w: 288, h: 460, cut: 'bottom' },
  P: { w: 574, h: 600, cut: 'top-right' }, Q: { w: 534, h: 510, cut: 'top-right' }, R: { w: 233, h: 652, cut: 'bottom' },
  S: { w: 234, h: 434, cut: 'bottom' }, T: { w: 286, h: 434, cut: 'bottom' }, U: { w: 234, h: 658, cut: 'bottom' },
  V: { w: 250, h: 654, cut: 'bottom' }, W: { w: 272, h: 658, cut: 'bottom' }, X: { w: 234, h: 526, cut: 'bottom' },
  Y: { w: 480, h: 548, cut: 'bottom' }, Z: { w: 233, h: 639, cut: 'bottom' },
}
export const HAND_MAX = 660

// The app's own one-line instructions (src/content.ts).
export const CUES: Record<string, string> = {
  A: 'Close your fingers. Rest your thumb beside your fist.',
  B: 'Straighten your fingers together. Fold your thumb across your palm.',
  C: 'Curve your fingers and thumb into an open C.',
  D: 'Point your index up. Meet your other fingertips with your thumb.',
  E: 'Bend all four fingers toward the thumb. Keep the shape relaxed.',
  F: 'Touch index and thumb. Extend the other three fingers.',
  G: 'Point index and thumb sideways, parallel to one another.',
  H: 'Extend index and middle together, pointing sideways.',
  I: 'Close your hand and extend your pinky.',
  J: 'Start with I. Trace a J with your pinky.',
  K: 'Extend index and middle apart. Place your thumb against the middle finger.',
  L: 'Index up. Thumb out.',
  M: 'Tuck your thumb beneath three fingers. Close your hand.',
  N: 'Tuck your thumb beneath two fingers. Close your hand.',
  O: 'Curve your fingers until the fingertips meet your thumb.',
  P: 'Form K, then angle the hand downward.',
  Q: 'Form G, then point index and thumb down.',
  R: 'Cross your index and middle fingers. Fold the other fingers.',
  S: 'Make a fist. Rest your thumb across the front.',
  T: 'Place your thumb between your index and middle fingers.',
  U: 'Extend index and middle together. Close the other fingers.',
  V: 'Extend and separate your index and middle fingers.',
  W: 'Extend and separate three fingers. Hold your pinky down with your thumb.',
  X: 'Curve your index into a hook. Close your other fingers.',
  Y: 'Extend your thumb and pinky. Close the other three fingers.',
  Z: 'Extend your index. Trace a Z in the air.',
}
export const ALPHABET = Object.keys(HANDS)
