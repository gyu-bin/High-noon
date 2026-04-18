import type { ImageSourcePropType } from 'react-native';

import type { NpcTier } from '@/types/npc';

/** `assets/images/image` Gemini 에셋 — 가로 3분할(1408×768) 스트립 공통 비율 */
export const STRIP_3_ASPECT = 1408 / 768;

export const gameImages = {
  titleHero: require('@/assets/images/image/Gemini_Generated_Image_jxsqh1jxsqh1jxsq.png'),
  duelBackground: require('@/assets/images/image/Gemini_Generated_Image_mjdc8xmjdc8xmjdc.png'),
  signalStrip: require('@/assets/images/image/Gemini_Generated_Image_arapwwarapwwarap.png'),
  winScreen: require('@/assets/images/image/Gemini_Generated_Image_2v7c1x2v7c1x2v7c.png'),
  loseScreen: require('@/assets/images/image/Gemini_Generated_Image_srtkdksrtkdksrtk.png'),
} as const;

/**
 * 티어별 컨셉 (배경 아트 가이드)
 * - bronze: 황량한 소도시 메인 스트리트
 * - silver: 사막 협곡 입구
 * - gold: 황폐한 광산 마을
 * - platinum: 철도역 광장
 * - diamond: 끝없는 황야 평원
 * - master: 버려진 교도소
 * - legend: 미지의 성역
 */

/** 파일명 `bg_{tier}_{day|night}.png` 에 대응하는 키: `{tier}_{day|night}` */
export const TIER_BACKGROUND_FALLBACK: Record<NpcTier, string> = {
  bronze: '#C8860A',
  silver: '#888780',
  gold: '#BA7517',
  platinum: '#378ADD',
  diamond: '#534AB7',
  master: '#8B1A1A',
  legend: '#2C2C2A',
  hidden: '#141618',
};

/**
 * 에셋 추가 시: `assets/images/bg/bg_{tier}_{day|night}.png` 를 넣고 아래에 static `require` 한 줄씩 등록.
 * (Metro는 동적 경로 require를 지원하지 않음)
 */
const BG_BY_TIER_VARIANT: Partial<Record<string, ImageSourcePropType>> = {
  // bronze_day: require('@/assets/images/bg/bg_bronze_day.png'),
  // bronze_night: require('@/assets/images/bg/bg_bronze_night.png'),
  // silver_day: require('@/assets/images/bg/bg_silver_day.png'),
  // ...
  // master_night: require('@/assets/images/bg/bg_master_night.png'),
};

export type BattleBackgroundSource =
  | { kind: 'image'; source: ImageSourcePropType }
  | { kind: 'solid'; color: string };

/**
 * 매 전투(해당 NPC 매치) 시작 시 한 번만 호출해 같은 매치의 모든 라운드에 재사용하세요.
 * - `Math.random() > 0.5` → day, 그 외 → night
 * - NPC #17(Dryden)은 항상 night
 */
export function pickBattleDayNight(npcId: number): 'day' | 'night' {
  if (npcId === 17) return 'night';
  if (npcId === 22) return 'night';
  return Math.random() > 0.5 ? 'day' : 'night';
}

function backgroundAssetKey(tier: NpcTier, variant: 'day' | 'night'): string {
  return `${tier}_${variant}`;
}

/**
 * NPC 결투 배경. `npcId === 17`이면 항상 `bg_master_night` 매핑(등록 시). #22 히든은 `hidden` 틴트.
 * 에셋이 `BG_BY_TIER_VARIANT`에 없으면 해당 티어 단색(`TIER_BACKGROUND_FALLBACK`)으로 폴백.
 *
 * `variant`를 생략하면 내부에서 `pickBattleDayNight`를 호출합니다(리렌더마다 바뀔 수 있으니
 * 전투 시작 시 `pickBattleDayNight`로 고른 값을 넘기는 것을 권장).
 */
export function getBackgroundImage(
  tier: NpcTier,
  npcId: number,
  variant?: 'day' | 'night',
): BattleBackgroundSource {
  const dayNight: 'day' | 'night' =
    npcId === 17 || npcId === 22 ? 'night' : variant ?? pickBattleDayNight(npcId);
  const tierForAsset: NpcTier =
    npcId === 17 ? 'master' : npcId === 22 ? 'hidden' : tier;
  const key = backgroundAssetKey(tierForAsset, dayNight);
  const source = BG_BY_TIER_VARIANT[key];
  if (source != null) {
    return { kind: 'image', source };
  }
  return { kind: 'solid', color: TIER_BACKGROUND_FALLBACK[tier] };
}
