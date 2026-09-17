import type { ImageSourcePropType } from 'react-native';
import { CLARITY_NPCS } from './clarityCharacterAssets';

import type { NpcTier } from '@/types/npc';

export type V3NpcPose = 'idle' | 'draw' | 'fire' | 'hit' | 'down';

/** Current complete NPC pose registry; old files remain archived on disk. */
export const V3_NPC_DUEL_POSES = CLARITY_NPCS;

export const V3_DUEL_BACKGROUNDS: Record<string, ImageSourcePropType> = {
  // The master screen reference uses one continuous, cinematic western town.
  // Reusing the 1536px production scene also avoids magnifying a 768px pixel
  // master across a tall phone display.
  bronze_day: require('@/assets/images/image/duel_bg_day_full.png'),
  bronze_night: require('@/assets/images/image/duel_bg_night_full.png'),
  silver_day: require('@/assets/images/image/duel_bg_day_full.png'),
  silver_night: require('@/assets/images/image/duel_bg_night_full.png'),
  gold_day: require('@/assets/images/image/duel_bg_day_full.png'),
  gold_night: require('@/assets/images/image/duel_bg_night_full.png'),
  platinum_day: require('@/assets/images/image/duel_bg_day_full.png'),
  platinum_night: require('@/assets/images/image/duel_bg_night_full.png'),
  diamond_day: require('@/assets/images/image/duel_bg_day_full.png'),
  diamond_night: require('@/assets/images/image/duel_bg_night_full.png'),
  master_day: require('@/assets/images/image/duel_bg_day_full.png'),
  master_night: require('@/assets/images/image/duel_bg_night_full.png'),
  legend_day: require('@/assets/images/image/duel_bg_day_full.png'),
  legend_night: require('@/assets/images/image/duel_bg_night_full.png'),
  hidden_night: require('@/assets/images/image/duel_bg_night_full.png'),
};

export const V3_FIRST_PERSON_WEAPON = {
  idle: require('@/assets/images/weapons/player_fp/player_fp_revolver_idle.png'),
  draw: require('@/assets/images/weapons/player_fp/player_fp_revolver_draw.png'),
  fire: require('@/assets/images/weapons/player_fp/player_fp_revolver_fire.png'),
} as const;

/** Clean cinematic overlay; recoil is animated, never baked into the bitmap. */
export const CINEMATIC_REVOLVER = require('@/assets/images/weapons/cinematic/revolver-ready.png');

export const V3_DUEL_VFX = {
  muzzleFlash: require('@/assets/images/vfx/production/vfx_muzzle_flash.png'),
  gunSmoke: require('@/assets/images/vfx/production/vfx_gun_smoke.png'),
  bulletImpact: require('@/assets/images/vfx/production/vfx_bullet_impact.png'),
  fallDust: require('@/assets/images/vfx/production/vfx_fall_dust.png'),
  thunderbolt: require('@/assets/images/vfx/production/vfx_thunderbolt_lightning.png'),
  redEye: require('@/assets/images/vfx/production/vfx_red_eye_flash.png'),
  voidCrack: require('@/assets/images/vfx/production/vfx_void_crack.png'),
} as const;

export function getV3DuelBackground(
  tier: NpcTier,
  npcId: number,
  dayNight: 'day' | 'night',
): ImageSourcePropType {
  if (dayNight === 'night' || npcId === 22) return require('@/high_noon_terra_asset_pack/output/backgrounds/duel_town_night.png');
  if (tier === 'gold' || tier === 'diamond') return require('@/high_noon_terra_asset_pack/output/backgrounds/duel_arena.png');
  if (tier === 'silver' || tier === 'platinum') return require('@/high_noon_terra_asset_pack/output/backgrounds/duel_town_day.png');
  return require('@/high_noon_terra_asset_pack/output/backgrounds/duel_town_sunset.png');
}

export function getV3NpcPose(npcId: number, pose: V3NpcPose): ImageSourcePropType {
  return (CLARITY_NPCS[npcId] ?? CLARITY_NPCS[1])![pose];
}

export function getV3NpcDuelPreloadSources(
  tier: NpcTier,
  npcId: number,
  dayNight: 'day' | 'night',
): ImageSourcePropType[] {
  return [
    getV3DuelBackground(tier, npcId, dayNight),
    ...Object.values(CLARITY_NPCS[npcId] ?? CLARITY_NPCS[1]!),
    CINEMATIC_REVOLVER,
    ...Object.values(V3_DUEL_VFX),
  ];
}
