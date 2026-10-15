/** NPC pilot presentation timings; these never schedule combat input/outcomes. */
export const CINEMATIC_TIMING = { aimCrossfade: 80, preparationCrossfade: 80, quickDrawLift: 45, quickDrawExtend: 75, quickDraw: 120, fireEnter: 30, fireHold: 140, recover: 110, smoke: 500 } as const;
export type CinematicVisualState = 'READY' | 'DRAW_PREPARATION' | 'QUICK_DRAW' | 'AIM' | 'BANG_CUE' | 'SHOT' | 'HIT' | 'RECOVER' | 'FINAL_DEFEAT';
export type ShotLatch = { scope: string; active: boolean };
export function cinematicShotEdge(previous: ShotLatch, next: ShotLatch, hidden: boolean) {
  return { latch: next, fire: !hidden && previous.scope === next.scope && !previous.active && next.active };
}
export function cinematicVisualState(input: { aiming?: boolean; preparation?: boolean; bang?: boolean; drawing?: boolean; bangCue?: boolean; shooting?: boolean; recovering?: boolean; hit?: boolean; defeated?: boolean }): CinematicVisualState {
  if (input.defeated) return 'FINAL_DEFEAT';
  if (input.hit) return 'HIT';
  if (input.shooting) return 'SHOT';
  if (input.recovering) return 'RECOVER';
  if (input.drawing) return 'QUICK_DRAW';
  if (input.bang) return 'AIM';
  if (input.preparation) return 'DRAW_PREPARATION';
  if (input.bangCue) return 'BANG_CUE';
  return input.aiming ? 'AIM' : 'READY';
}
/** Contained square source layers align their measured sole to one fixed foot. */
export function cinematicLayerTop(size: number, groundFraction: number, sourceGroundFraction: number) {
  return size * (groundFraction - sourceGroundFraction);
}
