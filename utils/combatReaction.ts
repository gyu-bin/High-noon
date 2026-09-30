/**
 * Combat hit / defeat presentation timelines (HIGH NOON animation reference).
 *
 * Presentation only: the duel engine has already decided the round and the
 * hearts. These helpers turn "who was hit" + "hearts left" into a staged
 * reaction; they never compute or change a result. No blood anywhere — impact
 * is carried by pose, camera, weapon movement, vignette and timing.
 */

export type NpcReactionStage = 'none' | 'hit' | 'stagger' | 'recover' | 'kneel' | 'fall' | 'down';
export type PlayerReactionStage =
  | 'none'
  | 'impact'
  | 'recover'
  | 'loseGrip'
  | 'collapse'
  | 'groundPov'
  | 'defeat';

type Step<S extends string> = { stage: S; at: number };

/** NPC survives the shot: HIT → STAGGER → RECOVER (never reaches the ground). */
export const NPC_SURVIVE_TIMELINE: readonly Step<NpcReactionStage>[] = [
  { stage: 'hit', at: 0 },
  { stage: 'stagger', at: 180 },
  { stage: 'recover', at: 440 },
];

/** NPC final defeat: HIT → STAGGER → KNEEL → FALL → DOWN (reference 0/200/400/700/1000 ms). */
export const NPC_DEFEAT_TIMELINE: readonly Step<NpcReactionStage>[] = [
  { stage: 'hit', at: 0 },
  { stage: 'stagger', at: 200 },
  { stage: 'kneel', at: 420 },
  { stage: 'fall', at: 720 },
  { stage: 'down', at: 1000 },
];

/** Player survives: short camera kick, gun dips, recovers (heart already -1 in the HUD). */
export const PLAYER_SURVIVE_TIMELINE: readonly Step<PlayerReactionStage>[] = [
  { stage: 'impact', at: 0 },
  { stage: 'recover', at: 220 },
];

/**
 * Player final death, fitted inside the existing reveal → round-modal window
 * (DUEL_DEFEAT_MODAL_DELAY_MS - DUEL_DEFEAT_REVEAL_DELAY_MS = 1650 ms) so no
 * game timing constant changes.
 */
export const PLAYER_DEATH_TIMELINE: readonly Step<PlayerReactionStage>[] = [
  { stage: 'impact', at: 0 },
  { stage: 'loseGrip', at: 130 },
  { stage: 'collapse', at: 340 },
  { stage: 'groundPov', at: 740 },
  // GROUND POV holds ~700 ms (opponent standing + fallen revolver), then darkens.
  { stage: 'defeat', at: 1440 },
];

export const PLAYER_DEATH_TOTAL_MS = 1650;

export function stageAt<S extends string>(
  timeline: readonly Step<S>[],
  elapsedMs: number,
  none: S,
): S {
  let current = none;
  for (const step of timeline) {
    if (elapsedMs >= step.at) current = step.stage;
  }
  return current;
}

/** A hit is lethal only when the engine has already taken the last heart. */
export function isLethalHit(heartsLeft: number): boolean {
  return heartsLeft <= 0;
}

export function npcTimeline(heartsLeft: number): readonly Step<NpcReactionStage>[] {
  return isLethalHit(heartsLeft) ? NPC_DEFEAT_TIMELINE : NPC_SURVIVE_TIMELINE;
}

export function playerTimeline(heartsLeft: number): readonly Step<PlayerReactionStage>[] {
  return isLethalHit(heartsLeft) ? PLAYER_DEATH_TIMELINE : PLAYER_SURVIVE_TIMELINE;
}

/** Existing clarity pose shown for each NPC stage (fall/down use dedicated art when registered). */
export function npcPoseForStage(
  stage: NpcReactionStage,
  dedicated: { fall?: boolean; down?: boolean } = {},
): 'idle' | 'hit' | 'kneel' | 'fall' | 'down' {
  switch (stage) {
    case 'hit':
    case 'stagger':
      return 'hit';
    case 'kneel':
      return 'kneel';
    case 'fall':
      return dedicated.fall ? 'fall' : 'kneel';
    case 'down':
      return dedicated.down ? 'down' : dedicated.fall ? 'fall' : 'kneel';
    default:
      return 'idle';
  }
}

/**
 * Foot-anchored NPC scale: feet stay on the same ground line, the body grows
 * upward. Returns the box size and its top so every pose shares one scale.
 */
export function npcLaneBox(input: { baseSize: number; footY: number; scale: number }): {
  size: number;
  top: number;
} {
  const size = input.baseSize * input.scale;
  return { size, top: input.footY - size };
}

/** Duel NPC scale (feet-anchored). Chosen on the iPhone 17 Pro Simulator; 1.0 = previous size. */
export const NPC_DUEL_SCALE = 1.25;
