import type { ImageSourcePropType } from 'react-native';

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

export function usesNpcQuickDraw(playerId: number, npcId: number, portrait: boolean) {
  return portrait && [1, 2, 3].includes(playerId) && [1, 2, 4].includes(npcId);
}

export function quickDrawArt(kind: Kind, id: number, stage: Stage) {
  if (id === 1) return cinematicPilotArt(kind, stage);
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
