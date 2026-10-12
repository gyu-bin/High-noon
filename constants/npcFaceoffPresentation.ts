import { NPC_MUZZLE_ANCHOR, PLAYER_MUZZLE_ANCHOR, PRODUCTION_ART_CANVAS, REDESIGN_ART_META } from './characterArtMetadata';
import { NPC_FACEOFF_ART_BOUNDS } from './npcFaceoffArtBounds';

/** NPC-duel-only placement on the production frame, never raw expanded canvas pixels. */
export function faceoffMuzzleAnchor(kind: 'player' | 'npc', id: number) {
  const production = kind === 'player' ? PLAYER_MUZZLE_ANCHOR[id] : NPC_MUZZLE_ANCHOR[id];
  if (production) return production;
  if (kind === 'player') {
    if (id === 2) return { x: 0.061, y: 0.165 };
    return { x: id === 3 ? 0.23 : 0.266, y: 0.40 };
  }
  return { x: 0.2305, y: 0.4107 };
}

/** Source foot line, measured from the production P01/NPC01 IDLE canvases. */
export function faceoffGroundFraction(kind: 'player' | 'npc', id: number) {
  const redesign = Object.values(REDESIGN_ART_META).find(meta => meta.kind === kind && meta.id === id);
  if (redesign) return redesign.frameGroundY / PRODUCTION_ART_CANVAS;
  if (kind === 'player') return (id === 3 ? 1214 : 1221) / PRODUCTION_ART_CANVAS;
  const ground: Record<number, number> = { 1: 1201, 2: 1214, 3: 1226, 4: 1219, 5: 1220, 6: 1226, 7: 1218, 8: 1211, 10: 1226, 11: 1229, 12: 1213, 13: 1211, 14: 1216, 16: 1196, 17: 1224, 21: 1235 };
  return (ground[id] ?? 1201) / PRODUCTION_ART_CANVAS;
}

/** The production FIRE barrels point left; the pilot IDLE/DRAW gazes point right. */
export function faceoffFlip(kind: 'player' | 'npc', id: number, pose: string) {
  const firing = pose === 'fire' || pose === 'shoot';
  // These redesigned identities already carry an inward left-facing silhouette.
  if (kind === 'npc' && [9, 19, 20, 22].includes(id)) return false;
  return kind === 'player' ? firing : !firing;
}

function faceoffStandingBounds(kind: 'player' | 'npc', id: number): readonly [number, number] {
  const frames = NPC_FACEOFF_ART_BOUNDS[`${kind === 'player' ? 'P' : 'NPC'}${String(id).padStart(2, '0')}`];
  const bounds = ['idle', 'draw', 'fire'].flatMap(pose => {
    const source = frames?.[pose];
    if (!source) return [];
    return [faceoffFlip(kind, id, pose) ? [1 - source[1], 1 - source[0]] : source];
  });
  return bounds.length
    ? [Math.min(...bounds.map(bound => bound[0])), Math.max(...bounds.map(bound => bound[1]))]
    : [0.17, 0.83];
}

/** Both full-body actors use one size. Fit the complete standing silhouettes
 * side by side before positioning either actor, keeping a clear central gap. */
export function faceoffPairLayout(input: {
  playerId: number; npcId: number; width: number; preferredSize: number;
  paddingLeft: number; paddingRight: number;
  /** Portrait spacing pass; omitted callers retain the existing layout exactly. */
  portrait?: boolean;
}) {
  const player = faceoffStandingBounds('player', input.playerId);
  const npc = faceoffStandingBounds('npc', input.npcId);
  const safeWidth = input.width - input.paddingLeft - input.paddingRight;
  const gapFraction = 0.20;
  const size = Math.min(input.preferredSize, safeWidth / (player[1] - player[0] + npc[1] - npc[0] + gapFraction));
  const playerMinLeft = input.paddingLeft - player[0] * size;
  const npcMaxLeft = input.width - input.paddingRight - npc[1] * size;
  const playerLeft = Math.max(playerMinLeft, input.width * 0.23 - size / 2);
  const npcLeft = Math.min(npcMaxLeft, input.width * 0.77 - size / 2);
  const actualGap = npcLeft + npc[0] * size - playerLeft - player[1] * size;
  // For broad pairs that fill the safe width, packing against the edges is
  // required. Ordinary pairs keep their pilot positions when already clear.
  const base = actualGap >= gapFraction * size - 0.001
    ? { size, playerLeft, npcLeft, gap: actualGap }
    : { size, playerLeft: playerMinLeft, npcLeft: npcMaxLeft, gap: safeWidth - (player[1] - player[0] + npc[1] - npc[0]) * size };
  if (!input.portrait) return base;

  // Try X-only separation first. The production silhouettes often already
  // reach the safe edges, so nominal centre changes alone would be clamped.
  const outwardStep = input.width * 0.03;
  const widerPlayerLeft = Math.max(playerMinLeft, base.playerLeft - outwardStep);
  const widerNpcLeft = Math.min(npcMaxLeft, base.npcLeft + outwardStep);
  const widerGap = widerNpcLeft + npc[0] * size - widerPlayerLeft - player[1] * size;
  if (widerGap - base.gap >= input.width * 0.04) {
    return { size, playerLeft: widerPlayerLeft, npcLeft: widerNpcLeft, gap: widerGap };
  }

  // A bounded 8% reduction applies to the already-fitted common pair size,
  // rather than re-tuning the span denominator. Both soles keep groundY.
  const portraitSize = base.size * 0.92;
  return {
    size: portraitSize,
    playerLeft: input.paddingLeft - player[0] * portraitSize,
    npcLeft: input.width - input.paddingRight - npc[1] * portraitSize,
    gap: safeWidth - (player[1] - player[0] + npc[1] - npc[0]) * portraitSize,
  };
}

/** Use the viewport's spare portrait margin without re-fitting or scaling either actor.
 * HUD insets remain separate; these insets constrain only character artwork. */
export function faceoffOutwardPlacement(
  layout: ReturnType<typeof faceoffPairLayout>,
  input: { width: number; paddingLeft: number; paddingRight: number; portrait?: boolean },
) {
  const playerStep = input.portrait ? Math.max(0, Math.min(input.width * 0.025, input.paddingLeft - 2)) : 0;
  const npcStep = input.portrait ? Math.max(0, Math.min(input.width * 0.025, input.paddingRight - 2)) : 0;
  return {
    ...layout,
    playerLeft: layout.playerLeft - playerStep,
    npcLeft: layout.npcLeft + npcStep,
    gap: layout.gap + playerStep + npcStep,
    actorPaddingLeft: input.paddingLeft - playerStep,
    actorPaddingRight: input.paddingRight - npcStep,
  };
}

/** Keep capes, baked echoes and horizontal defeat art inside the safe viewport.
 * Standing poses use a shared union, avoiding lateral jumps during READY→STEADY→BANG. */
export function faceoffContainedLeft(input: {
  kind: 'player' | 'npc'; id: number; pose: string; left: number;
  size: number; width: number; paddingLeft: number; paddingRight: number;
}) {
  const { kind, id, pose, size, width, paddingLeft, paddingRight } = input;
  const frames = NPC_FACEOFF_ART_BOUNDS[`${kind === 'player' ? 'P' : 'NPC'}${String(id).padStart(2, '0')}`];
  if (!frames) return input.left;
  const poses = pose === 'defeat' ? ['hit', 'down'] : ['fall', 'down', 'kneel', 'hit'].includes(pose) ? [pose] : ['idle', 'draw', 'fire'];
  const bounds = poses.flatMap(stage => {
    const bound = frames[stage];
    if (!bound) return [];
    return [faceoffFlip(kind, id, stage) ? [1 - bound[1], 1 - bound[0]] : bound];
  });
  if (!bounds.length) return input.left;
  const minX = Math.min(...bounds.map(bound => bound[0]));
  const maxX = Math.max(...bounds.map(bound => bound[1]));
  const minLeft = paddingLeft - minX * size;
  const maxLeft = width - paddingRight - maxX * size;
  return Math.max(minLeft, Math.min(input.left, maxLeft));
}
