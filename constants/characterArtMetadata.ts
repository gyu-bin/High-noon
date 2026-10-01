import type { ImageSourcePropType } from 'react-native';

import { CLARITY_NPCS, CLARITY_PLAYERS } from './clarityCharacterAssets';
import { POSTER_NPC_IDENTITIES } from './posterCharacterAssets';
import { V3_PALE_LOCKED_SILHOUETTE } from './v3UiAssets';

/** Production identity/idle canvases are 1254px; every live character renders 1:1 in its box. */
export const PRODUCTION_ART_CANVAS = 1254;

export type RedesignArtKey = 'P04' | 'NPC09' | 'NPC15' | 'NPC18' | 'NPC19' | 'NPC20' | 'NPC22';

export type CharacterArtMeta = {
  kind: 'player' | 'npc';
  id: number;
  /** Normalized master canvas (square). The production frame sits centred inside it. */
  canvasSize: number;
  /** Ground (boot sole) Y in the production 1254 frame, shared by old and new art. */
  frameGroundY: number;
};

/**
 * Locked redesign masters (PHASE 1 normalization, artifacts/character-redesign-body-pass/normalized).
 * Keyed by art, not by character id: live NPC15 etc. still use the old 1254 art at scale 1.
 */
export const REDESIGN_ART_META: Record<RedesignArtKey, CharacterArtMeta> = {
  // P04 re-locked to the v2 pose-set identity; one common canvas for idle/draw/fire/hit/down.
  P04: { kind: 'player', id: 4, canvasSize: 1720, frameGroundY: 1211 },
  // NPC09 re-locked to the v2 pose-set identity (IDLE_V2); combat_fall/combat_down share this canvas.
  NPC09: { kind: 'npc', id: 9, canvasSize: 1548, frameGroundY: 1221 },
  NPC15: { kind: 'npc', id: 15, canvasSize: 1624, frameGroundY: 1185 },
  NPC18: { kind: 'npc', id: 18, canvasSize: 1742, frameGroundY: 1207 },
  // NPC19 re-locked to the v2 pose-set identity (IDLE_V2).
  NPC19: { kind: 'npc', id: 19, canvasSize: 1682, frameGroundY: 1211 },
  // NPC20 staged idle is the horizontally mirrored locked master (faces image-left).
  NPC20: { kind: 'npc', id: 20, canvasSize: 1778, frameGroundY: 1214 },
  // NPC22 re-locked to the v2 pose-set identity (IDLE_V2).
  NPC22: { kind: 'npc', id: 22, canvasSize: 1684, frameGroundY: 1231 },
};

export const REDESIGN_ART_KEYS = Object.keys(REDESIGN_ART_META) as RedesignArtKey[];

/**
 * Render-box multiplier that keeps the body at production gameplay scale when an
 * expanded transparent canvas is drawn with contentFit="contain" in a square box.
 */
export function artDisplayScale(meta?: Pick<CharacterArtMeta, 'canvasSize'>): number {
  return meta ? meta.canvasSize / PRODUCTION_ART_CANVAS : 1;
}

/** Runtime clarity pose slots (player `down` holds the KNEEL art). */
export type StagedPoseSlot = 'idle' | 'draw' | 'fire' | 'hit' | 'down';
export const STAGED_POSE_SLOTS: readonly StagedPoseSlot[] = ['idle', 'draw', 'fire', 'hit', 'down'];

type StagedArtSources = {
  /** Normalized master, expanded canvas → use artDisplayScale. */
  idle: ImageSourcePropType;
  /** Combat poses on the same canvas as idle; add each file here once it is staged. */
  poses?: Partial<Record<Exclude<StagedPoseSlot, 'idle'>, ImageSourcePropType>>;
  /** NPC Wanted poster, production 1254 convention → display scale 1. */
  poster?: ImageSourcePropType;
};

const PLAYER_ART_SCALE: Record<number, number> = {};
const NPC_ART_SCALE: Record<number, number> = {};
for (const meta of Object.values(REDESIGN_ART_META)) {
  (meta.kind === 'player' ? PLAYER_ART_SCALE : NPC_ART_SCALE)[meta.id] = artDisplayScale(meta);
}

/** Runtime render scale for a character's clarity/combat art; 1 for every non-redesign character. */
export function characterArtDisplayScale(kind: 'player' | 'npc', id: number): number {
  return (kind === 'player' ? PLAYER_ART_SCALE : NPC_ART_SCALE)[id] ?? 1;
}

/**
 * Image style that draws expanded-canvas art `scale` times larger around the box centre, so the
 * production frame (and the body) keeps the size plain 1254 art has in a width x height box.
 */
export function scaledArtStyle(width: number, height: number, scale: number) {
  if (scale === 1) return { width, height };
  return {
    width: width * scale,
    height: height * scale,
    // negative margins on all four sides keep the layout footprint at width x height
    marginHorizontal: (width - width * scale) / 2,
    marginVertical: (height - height * scale) / 2,
  };
}

/** Redesign art as registered for production (used by the DEV preview route). */
export const REDESIGN_STAGED_SOURCES: Partial<Record<RedesignArtKey, StagedArtSources>> = Object.fromEntries(
  REDESIGN_ART_KEYS.flatMap((key) => {
    const meta = REDESIGN_ART_META[key];
    const set = (meta.kind === 'player' ? CLARITY_PLAYERS : CLARITY_NPCS)[meta.id];
    if (!set) return [];
    const { idle, ...poses } = set;
    return [[key, { idle, poses, poster: meta.kind === 'npc' ? POSTER_NPC_IDENTITIES[meta.id] : undefined }]];
  }),
);

export const REDESIGN_STAGED_PALE_LOCKED_SILHOUETTE: ImageSourcePropType | null = V3_PALE_LOCKED_SILHOUETTE;
