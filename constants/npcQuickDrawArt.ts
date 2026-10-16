import type { ImageSourcePropType } from 'react-native';

import { characterArtDisplayScale } from './characterArtMetadata';
import { quickDrawOffsetX } from './npcQuickDrawAlignment';
import { CLARITY_NPCS, CLARITY_PLAYERS } from './clarityCharacterAssets';
import { cinematicPilotArt } from './npcCinematicPilotArt';
import { faceoffStandingArt } from './npcFaceoffPoseArt';
import { faceoffGroundFraction } from './npcFaceoffPresentation';

type Kind = 'player' | 'npc';
type Stage = 'ready' | 'preparation' | 'draw' | 'aim' | 'fire';
type PoseArt = { source: ImageSourcePropType; groundFraction: number; muzzle: { x: number; y: number } };

// Batch 1 only. The approved id1 pilot registry remains the source of truth.
const batchSources = {
  player: {
    2: { preparation: require('../assets/images/characters/faceoff/batch1/p02-preparation.png'), aim: require('../assets/images/characters/faceoff/batch1/p02-aim.png'), fire: require('../assets/images/characters/faceoff/batch1/p02-fire.png') },
    3: { preparation: require('../assets/images/characters/faceoff/batch1/p03-preparation.png'), aim: require('../assets/images/characters/faceoff/batch1/p03-aim.png'), fire: require('../assets/images/characters/faceoff/batch1/p03-fire.png') },
  },
  npc: {
    2: { preparation: require('../assets/images/characters/faceoff/batch1/npc02-preparation.png'), aim: require('../assets/images/characters/faceoff/batch1/npc02-aim.png') },
    4: { preparation: require('../assets/images/characters/faceoff/batch1/npc04-preparation.png'), aim: require('../assets/images/characters/faceoff/batch1/npc04-aim.png') },
  },
} as const;

// Source measurements are in contain-square coordinates, before slot mirroring.
// All batch cutouts retain nominal scale; each sole aligns with the locked lane.
const sourceGround: Record<string, Partial<Record<Stage, number>>> = {
  'player:2': { ready: 1221 / 1254, preparation: 1222 / 1254, draw: 1222 / 1254, fire: 1224 / 1254 },
  'player:3': { ready: 1214 / 1254, preparation: 1217 / 1254, draw: 1220 / 1254, fire: 1215 / 1254 },
  'npc:2': { ready: 1213 / 1254, preparation: 1215 / 1254, draw: 1214 / 1254, fire: 1216 / 1254 },
  'npc:4': { ready: 1219 / 1254, preparation: 1218 / 1254, draw: 1224 / 1254, fire: 1221 / 1254 },
};
const aimMeasurements: Record<string, Omit<PoseArt, 'source'>> = {
  'player:2': { groundFraction: 1224 / 1254, muzzle: { x: 1227 / 1254, y: 386 / 1254 } },
  'player:3': { groundFraction: 1214 / 1254, muzzle: { x: 1227 / 1254, y: 385 / 1254 } },
  'npc:2': { groundFraction: 1210 / 1254, muzzle: { x: 1198 / 1254, y: 420 / 1254 } },
  'npc:4': { groundFraction: 1228 / 1254, muzzle: { x: 1200 / 1254, y: 414 / 1254 } },
};

const fireMeasurements: Record<string, Omit<PoseArt, 'source'>> = {
  'player:2': { groundFraction: 1224 / 1254, muzzle: { x: 1233 / 1254, y: 302 / 1254 } },
  'player:3': { groundFraction: 1215 / 1254, muzzle: { x: 1230 / 1254, y: 351 / 1254 } },
};

// Batch 2 (NPC03/05/06/07/08): READY = IDLE, STEADY = dedicated `preparation` frame (hand on the
// holstered grip), BANG start = clarity DRAW (gun clearing the holster), AIM (120ms) = the
// left-facing FIRE frame, and the actual shot holds that same frame while runtime flash/smoke fire.
// Without `preparation`, STEADY falls back to DRAW. Sole rows and painted barrel tips are measured
// on the 1254 canvas (alpha > 127).
const reuseBatch: Record<number, { fire: ImageSourcePropType; preparation?: { source: ImageSourcePropType; ground: number }; ground: Record<'ready' | 'draw' | 'fire', number>; muzzle: { x: number; y: number } }> = {
  3: { fire: CLARITY_NPCS[3]!.fire, preparation: { source: require('../assets/images/characters/faceoff/batch2/npc03-preparation.png'), ground: 1221 }, ground: { ready: 1225, draw: 1222, fire: 1227 }, muzzle: { x: 302 / 1254, y: 514 / 1254 } },
  5: { fire: require('../assets/images/characters/faceoff/npc_05_fire_left.png'), preparation: { source: require('../assets/images/characters/faceoff/batch2/npc05-preparation.png'), ground: 1224 }, ground: { ready: 1219, draw: 1223, fire: 1223 }, muzzle: { x: 312 / 1254, y: 492 / 1254 } },
  6: { fire: require('../assets/images/characters/faceoff/npc_06_fire_left.png'), preparation: { source: require('../assets/images/characters/faceoff/batch2/npc06-preparation.png'), ground: 1224 }, ground: { ready: 1225, draw: 1225, fire: 1229 }, muzzle: { x: 333 / 1254, y: 466 / 1254 } },
  7: { fire: CLARITY_NPCS[7]!.fire, preparation: { source: require('../assets/images/characters/faceoff/batch2/npc07-preparation.png'), ground: 1218 }, ground: { ready: 1218, draw: 1215, fire: 1220 }, muzzle: { x: 274 / 1254, y: 499 / 1254 } },
  8: { fire: CLARITY_NPCS[8]!.fire, preparation: { source: require('../assets/images/characters/faceoff/batch2/npc08-preparation.png'), ground: 1210 }, ground: { ready: 1210, draw: 1213, fire: 1212 }, muzzle: { x: 263 / 1254, y: 483 / 1254 } },
  // Batch 3.
  10: { fire: CLARITY_NPCS[10]!.fire, preparation: { source: require('../assets/images/characters/faceoff/batch3/npc10-preparation.png'), ground: 1226 }, ground: { ready: 1225, draw: 1227, fire: 1226 }, muzzle: { x: 297 / 1254, y: 484 / 1254 } },
  // AIM/FIRE use the face-corrected left frame (the clarity FIRE looks away from its barrel).
  12: { fire: CLARITY_NPCS[12]!.fire, preparation: { source: require('../assets/images/characters/faceoff/batch3/npc12-preparation.png'), ground: 1221 }, ground: { ready: 1213, draw: 1216, fire: 1223 }, muzzle: { x: 262 / 1254, y: 470 / 1254 } },
  11: { fire: require('../assets/images/characters/faceoff/npc_11_fire_left.png'), preparation: { source: require('../assets/images/characters/faceoff/batch3/npc11-preparation.png'), ground: 1228 }, ground: { ready: 1229, draw: 1227, fire: 1231 }, muzzle: { x: 211 / 1254, y: 492 / 1254 } },
  // STEADY is IDLE with only the right arm/hand replaced (legs and boots are IDLE's pixels). The existing clarity
  // DRAW is painted 17px lower; each pose's own sole is pinned to the lane at render time.
  13: { fire: CLARITY_NPCS[13]!.fire, preparation: { source: require('../assets/images/characters/faceoff/batch3/npc13-preparation.png'), ground: 1210 }, ground: { ready: 1210, draw: 1227, fire: 1214 }, muzzle: { x: 300 / 1254, y: 486 / 1254 } },
  // IDLE-preserving STEADY; AIM/FIRE retain the existing face-corrected left-facing artwork.
  14: { fire: require('../assets/images/characters/faceoff/npc_14_fire_left.png'), preparation: { source: require('../assets/images/characters/faceoff/batch3/npc14-preparation.png'), ground: 1216 }, ground: { ready: 1216, draw: 1220, fire: 1219 }, muzzle: { x: 291 / 1254, y: 504 / 1254 } },
};
// Full-roster sources keep the existing identities. Baked-flash FIRE frames on
// NPC15/19/20/22 are deliberately replaced by their already approved clean aim
// frames, so holding AIM never implies a shot and the compositor emits one flash.
const rosterSources: Record<string, { aim: ImageSourcePropType; ground: Record<Stage, number>; readyFlip: boolean; aimFlip: boolean; muzzle: { x: number; y: number } }> = {
  'player:4': { aim: CLARITY_PLAYERS[4]!.fire, ground: { ready: 1213, preparation: 1213, draw: 1213, aim: 1212, fire: 1212 }, readyFlip: false, aimFlip: true, muzzle: { x: 0 / 1254, y: 100 / 1254 } },
  'npc:9': { aim: CLARITY_NPCS[9]!.fire, ground: { ready: 1224, preparation: 1223, draw: 1223, aim: 1222, fire: 1222 }, readyFlip: false, aimFlip: false, muzzle: { x: 0 / 1254, y: 165 / 1254 } },
  'npc:15': { aim: require('../assets/images/characters/clarity/npc/15-v2/draw-faceoff.png'), ground: { ready: 1187, preparation: 1187, draw: 1187, aim: 1188, fire: 1188 }, readyFlip: true, aimFlip: true, muzzle: { x: 1200 / 1254, y: 245 / 1254 } },
  'npc:16': { aim: CLARITY_NPCS[16]!.fire, ground: { ready: 1194, preparation: 1206, draw: 1206, aim: 1203, fire: 1203 }, readyFlip: true, aimFlip: false, muzzle: { x: 298 / 1254, y: 493 / 1254 } },
  'npc:17': { aim: require('../assets/images/characters/faceoff/npc_17_fire_left.png'), ground: { ready: 1223, preparation: 1227, draw: 1227, aim: 1236, fire: 1236 }, readyFlip: true, aimFlip: false, muzzle: { x: 337 / 1254, y: 497 / 1254 } },
  'npc:18': { aim: CLARITY_NPCS[18]!.fire, ground: { ready: 1220, preparation: 1208, draw: 1208, aim: 1209, fire: 1209 }, readyFlip: true, aimFlip: false, muzzle: { x: -45 / 1254, y: 287 / 1254 } },
  'npc:19': { aim: require('../assets/images/characters/clarity/npc/19-v2/draw-faceoff.png'), ground: { ready: 1230, preparation: 1212, draw: 1212, aim: 1230, fire: 1230 }, readyFlip: false, aimFlip: false, muzzle: { x: -180 / 1254, y: 235 / 1254 } },
  'npc:20': { aim: require('../assets/images/characters/clarity/npc/20-v2/draw.png'), ground: { ready: 1216, preparation: 1216, draw: 1216, aim: 1216, fire: 1216 }, readyFlip: false, aimFlip: false, muzzle: { x: 55 / 1254, y: 225 / 1254 } },
  'npc:21': { aim: CLARITY_NPCS[21]!.fire, ground: { ready: 1233, preparation: 1232, draw: 1232, aim: 1234, fire: 1234 }, readyFlip: true, aimFlip: false, muzzle: { x: 279 / 1254, y: 455 / 1254 } },
  'npc:22': { aim: require('../assets/images/characters/clarity/npc/22-v2/draw-faceoff.png'), ground: { ready: 1232, preparation: 1232, draw: 1232, aim: 1233, fire: 1233 }, readyFlip: false, aimFlip: false, muzzle: { x: -57 / 1254, y: 247 / 1254 } },
};
export const QUICK_DRAW_PLAYER_IDS = [1, 2, 3, 4] as const;
export const QUICK_DRAW_NPC_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22] as const;

export function usesNpcQuickDraw(playerId: number, npcId: number, _portrait: boolean) {
  // Art and shot gating are identical in either orientation; arena layout owns sizing.
  return (QUICK_DRAW_PLAYER_IDS as readonly number[]).includes(playerId) && (QUICK_DRAW_NPC_IDS as readonly number[]).includes(npcId);
}

export function quickDrawArt(kind: Kind, id: number, stage: Stage) {
  if (id === 1) return cinematicPilotArt(kind, stage);
  const roster = rosterSources[`${kind}:${id}`];
  if (roster) {
    const clarity = (kind === 'player' ? CLARITY_PLAYERS : CLARITY_NPCS)[id]!;
    const aiming = stage === 'aim' || stage === 'fire';
    return {
      source: aiming ? roster.aim : stage === 'ready' ? clarity.idle : clarity.draw,
      offsetX: quickDrawOffsetX(kind, id, stage),
      groundFraction: roster.ground[stage] / 1254,
      muzzle: roster.muzzle,
      artScale: characterArtDisplayScale(kind, id),
      flipHorizontal: aiming ? roster.aimFlip : roster.readyFlip,
    };
  }
  const reused = kind === 'npc' ? reuseBatch[id] : undefined;
  if (reused) {
    const clarity = CLARITY_NPCS[id]!;
    const firing = stage === 'aim' || stage === 'fire';
    const preparation = stage === 'preparation' ? reused.preparation : undefined;
    const source = stage === 'ready' ? clarity.idle : firing ? reused.fire : preparation?.source ?? clarity.draw;
    return {
      source,
      offsetX: quickDrawOffsetX(kind, id, stage),
      groundFraction: (preparation?.ground ?? reused.ground[stage === 'ready' ? 'ready' : firing ? 'fire' : 'draw']) / 1254,
      muzzle: reused.muzzle,
      artScale: 1,
      // IDLE/DRAW sources gaze right and are mirrored inward; the FIRE frames already point left.
      flipHorizontal: !firing,
    };
  }
  const sources = batchSources[kind] as Partial<Record<number, { preparation: ImageSourcePropType; aim: ImageSourcePropType; fire?: ImageSourcePropType }>>;
  const added = sources[id];
  if (!added) throw new Error(`Unsupported NPC quickdraw art: ${kind} ${id}`);
  const clarity = (kind === 'player' ? CLARITY_PLAYERS : CLARITY_NPCS)[id]!;
  const standing = faceoffStandingArt(kind, id, 'fire');
  const source = stage === 'ready' ? clarity.idle : stage === 'draw' ? clarity.draw
    : stage === 'fire' ? added.fire ?? standing.source : added[stage];
  const key = `${kind}:${id}`;
  const measured = stage === 'aim' ? aimMeasurements[key] : stage === 'fire' ? fireMeasurements[key] : undefined;
  return {
    source,
    offsetX: quickDrawOffsetX(kind, id, stage),
    groundFraction: measured?.groundFraction ?? sourceGround[key]?.[stage] ?? faceoffGroundFraction(kind, id),
    muzzle: measured?.muzzle ?? standing.muzzle,
    artScale: 1,
    flipHorizontal: stage === 'fire' ? added.fire ? false : standing.flipHorizontal : kind === 'npc',
  };
}
