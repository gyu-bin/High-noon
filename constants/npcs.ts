import { DUEL_DEFAULT_BANG_DELAY_MS, DUEL_DEFAULT_STAGE_MS } from '@/constants/duelTiming';
import type { NpcDefinition, NpcDuelTiming, NpcSpecialAbility } from '@/types/npc';
import { NPC_ROSTER } from '@/constants/npcRoster';

const B1_7 = DUEL_DEFAULT_BANG_DELAY_MS;

/**
 * `bangDelay*` = 집중(STEADY) 이후 실제 뱅까지(ms). 기본 **1~7초** 랜덤(`B1_7`).
 * #14 썬더볼트·#22 페일은 `buildDuelStartParams`에서 전용 값으로 덮어씀.
 */
const DT = (
  bangMin: number,
  bangMax: number,
  gap?: Partial<Pick<NpcDuelTiming, 'gapMinMs' | 'gapMaxMs'>>,
  ready?: Partial<Pick<NpcDuelTiming, 'readyCueMinMs' | 'readyCueMaxMs'>>,
): NpcDuelTiming => ({
  readyCueMinMs: ready?.readyCueMinMs ?? DUEL_DEFAULT_STAGE_MS.minMs,
  readyCueMaxMs: ready?.readyCueMaxMs ?? DUEL_DEFAULT_STAGE_MS.maxMs,
  gapMinMs: gap?.gapMinMs ?? DUEL_DEFAULT_STAGE_MS.minMs,
  gapMaxMs: gap?.gapMaxMs ?? DUEL_DEFAULT_STAGE_MS.maxMs,
  bangDelayMinMs: bangMin,
  bangDelayMaxMs: bangMax,
});

function npc(
  id: number,
  reactionMs: number,
  tier: NpcDefinition['tier'],
  bossFlag: boolean,
  unlocked: boolean,
  timing: NpcDuelTiming,
  specialAbility: NpcSpecialAbility,
  fakeBangCount: number,
  extra?: Partial<Pick<NpcDefinition, 'secret' | 'designKeywords'>>,
): NpcDefinition {
  return {
    id,
    reactionMs: NPC_ROSTER[id - 1]?.[1] ?? reactionMs,
    tier,
    bossFlag,
    unlocked,
    duelTiming: timing,
    fakeBangCount,
    specialAbility,
    ...extra,
  };
}

/**
 * 22명 — 티어·보스·특수능력은 기획대로, 집중→뱅 대기는 공통 1~7초 랜덤(특수 예외만 오버라이드).
 * 표시 이름은 locales/npcI18n.ts · utils/npcLabels.ts
 */
export const NPCS: readonly NpcDefinition[] = [
  npc(1, 410, 'bronze', false, true, DT(B1_7.minMs, B1_7.maxMs), 'none', 0, {
    designKeywords:
      'weathered cowboy, torn poncho, dust-covered, bandana over mouth, slouched posture',
  }),
  npc(2, 395, 'bronze', false, false, DT(B1_7.minMs, B1_7.maxMs), 'none', 0, {
    designKeywords:
      'rusted gun holster, patchy leather vest, one eye squinting, stubble, broken hat brim',
  }),
  npc(3, 380, 'bronze', true, false, DT(B1_7.minMs, B1_7.maxMs), 'none', 0, {
    designKeywords:
      'black feathered cloak, hollow eyes, crow skull on hat, sharp silhouette, dusk lighting',
  }),

  npc(4, 355, 'silver', false, false, DT(B1_7.minMs, B1_7.maxMs), 'none', 0, {
    designKeywords:
      'sandy fur-trimmed coat, narrow amber eyes, desert camouflage, fox tail motif on belt',
  }),
  npc(5, 340, 'silver', false, false, DT(B1_7.minMs, B1_7.maxMs), 'none', 0, {
    designKeywords:
      'iron half-mask covering jaw, military coat, cold steel armor plates, expressionless',
  }),
  npc(6, 325, 'silver', true, false, DT(B1_7.minMs, B1_7.maxMs), 'none', 0, {
    designKeywords:
      'female bounty hunter, ice-blue eyes, sleek leather duster, dual holsters, calm expression',
  }),

  npc(7, 310, 'gold', false, false, DT(B1_7.minMs, B1_7.maxMs), 'none', 0, {
    designKeywords:
      'cactus spine motif on hat, green-tinted coat, spiked gloves, desert punk aesthetic',
  }),
  npc(8, 298, 'gold', false, false, DT(B1_7.minMs, B1_7.maxMs), 'none', 0, {
    designKeywords:
      'ornate twin revolvers, flamboyant red vest, gold trim, theatrical villain energy',
  }),
  npc(9, 285, 'gold', true, false, DT(B1_7.minMs, B1_7.maxMs), 'none', 0, {
    designKeywords:
      'gold skull face paint, gilded armor, glowing yellow eyes, opulent western villain',
  }),

  npc(10, 270, 'platinum', false, false, DT(B1_7.minMs, B1_7.maxMs), 'none', 0, {
    designKeywords:
      'mechanical eye implant, steel shoulder armor, eagle emblem, precision gunslinger',
  }),
  npc(11, 258, 'platinum', false, false, DT(B1_7.minMs, B1_7.maxMs), 'none', 0, {
    designKeywords:
      'massive build, steam engineer coat, goggles on forehead, silent menacing stare',
  }),
  npc(12, 248, 'platinum', true, false, DT(B1_7.minMs, B1_7.maxMs), 'none', 0, {
    designKeywords:
      'full black iron armor, no face visible, obsidian revolver, imposing silhouette',
  }),

  npc(13, 235, 'diamond', false, false, DT(B1_7.minMs, B1_7.maxMs), 'mirror', 0, {
    designKeywords: 'cracked mirror mask, split-color outfit, unsettling symmetry',
  }),
  npc(14, 225, 'diamond', false, false, DT(B1_7.minMs, B1_7.maxMs), 'thunderbolt', 0, {
    designKeywords:
      'lightning scar across face, electric blue coat, crackling energy around hands',
  }),
  npc(15, 215, 'diamond', true, false, DT(B1_7.minMs, B1_7.maxMs), 'blindBang', 0, {
    designKeywords:
      'half-dissolved into shadow, smoke trails, dark void cloak, glowing white eyes only',
  }),

  npc(16, 205, 'master', false, false, DT(B1_7.minMs, B1_7.maxMs), 'screenShakeLight', 0, {
    designKeywords: 'purple venom drip motif, spiked collar, reptile scale texture',
  }),
  npc(17, 198, 'master', true, false, DT(B1_7.minMs, B1_7.maxMs), 'screenShakeMedium', 0, {
    designKeywords:
      'pale skin, red-rimmed eyes, black longcoat, moonlit backlight, eerie calm',
  }),
  npc(18, 192, 'master', true, false, DT(B1_7.minMs, B1_7.maxMs), 'screenShakeHeavy', 0, {
    designKeywords:
      'multiple glowing red eyes, prophet robes with bullet holes, ominous aura',
  }),

  npc(19, 185, 'legend', false, false, DT(B1_7.minMs, B1_7.maxMs), 'invertedSignals', 0, {
    designKeywords:
      'body partially inverted, cosmic void texture, stars visible through coat',
  }),
  npc(20, 180, 'legend', false, false, DT(B1_7.minMs, B1_7.maxMs), 'echoReady', 0, {
    designKeywords: 'ghostly double image, translucent body, two overlapping silhouettes',
  }),
  npc(21, 175, 'legend', true, false, DT(B1_7.minMs, B1_7.maxMs), 'chaosRandom', 0, {
    designKeywords:
      'funeral black suit, coffin motif, skull-topped cane, final judgment energy',
  }),

  npc(22, 182, 'hidden', true, false, DT(4000, 12000), 'paleSilence', 0, {
    secret: true,
    designKeywords:
      'white horse skull motif, bleached bone armor, no face, absolute silence, death incarnate',
  }),
] as const satisfies readonly NpcDefinition[];

export function getNpcById(id: number): NpcDefinition | undefined {
  return NPCS.find((n) => n.id === id);
}
