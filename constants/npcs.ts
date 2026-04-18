import { DUEL_DEFAULT_BANG_DELAY_MS, DUEL_DEFAULT_STAGE_MS } from '@/constants/duelTiming';
import type { NpcDefinition, NpcDuelTiming, NpcSpecialAbility } from '@/types/npc';

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
  title: string,
  name: string,
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
    title,
    name,
    reactionMs,
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
 */
export const NPCS: readonly NpcDefinition[] = [
  npc(1, '먼지바람', '먼지바람', 520, 'bronze', false, true, DT(B1_7.minMs, B1_7.maxMs), 'none', 0, {
    designKeywords:
      'weathered cowboy, torn poncho, dust-covered, bandana over mouth, slouched posture',
  }),
  npc(2, '녹슨 총구', '녹슨 총구', 500, 'bronze', false, false, DT(B1_7.minMs, B1_7.maxMs), 'none', 0, {
    designKeywords:
      'rusted gun holster, patchy leather vest, one eye squinting, stubble, broken hat brim',
  }),
  npc(3, '황야의', '까마귀', 480, 'bronze', true, false, DT(B1_7.minMs, B1_7.maxMs), 'none', 0, {
    designKeywords:
      'black feathered cloak, hollow eyes, crow skull on hat, sharp silhouette, dusk lighting',
  }),

  npc(4, '사막의', '여우', 455, 'silver', false, false, DT(B1_7.minMs, B1_7.maxMs), 'none', 0, {
    designKeywords:
      'sandy fur-trimmed coat, narrow amber eyes, desert camouflage, fox tail motif on belt',
  }),
  npc(5, '철가면', '철가면', 435, 'silver', false, false, DT(B1_7.minMs, B1_7.maxMs), 'none', 0, {
    designKeywords:
      'iron half-mask covering jaw, military coat, cold steel armor plates, expressionless',
  }),
  npc(6, '냉혈한', '레이첼', 410, 'silver', true, false, DT(B1_7.minMs, B1_7.maxMs), 'none', 0, {
    designKeywords:
      'female bounty hunter, ice-blue eyes, sleek leather duster, dual holsters, calm expression',
  }),

  npc(7, '독침', '선인장', 385, 'gold', false, false, DT(B1_7.minMs, B1_7.maxMs), 'none', 0, {
    designKeywords:
      'cactus spine motif on hat, green-tinted coat, spiked gloves, desert punk aesthetic',
  }),
  npc(8, '쌍권총', '로렌조', 360, 'gold', false, false, DT(B1_7.minMs, B1_7.maxMs), 'none', 0, {
    designKeywords:
      'ornate twin revolvers, flamboyant red vest, gold trim, theatrical villain energy',
  }),
  npc(9, '황금', '해골', 335, 'gold', true, false, DT(B1_7.minMs, B1_7.maxMs), 'none', 0, {
    designKeywords:
      'gold skull face paint, gilded armor, glowing yellow eyes, opulent western villain',
  }),

  npc(10, '강철', '독수리', 310, 'platinum', false, false, DT(B1_7.minMs, B1_7.maxMs), 'none', 0, {
    designKeywords:
      'mechanical eye implant, steel shoulder armor, eagle emblem, precision gunslinger',
  }),
  npc(11, '침묵의', '기관차', 295, 'platinum', false, false, DT(B1_7.minMs, B1_7.maxMs), 'none', 0, {
    designKeywords:
      'massive build, steam engineer coat, goggles on forehead, silent menacing stare',
  }),
  npc(12, '블랙', '아이언', 275, 'platinum', true, false, DT(B1_7.minMs, B1_7.maxMs), 'none', 0, {
    designKeywords:
      'full black iron armor, no face visible, obsidian revolver, imposing silhouette',
  }),

  npc(13, '미러', '잭', 255, 'diamond', false, false, DT(B1_7.minMs, B1_7.maxMs), 'mirror', 0, {
    designKeywords: 'cracked mirror mask, split-color outfit, unsettling symmetry',
  }),
  npc(14, '썬더', '볼트', 235, 'diamond', false, false, DT(B1_7.minMs, B1_7.maxMs), 'thunderbolt', 0, {
    designKeywords:
      'lightning scar across face, electric blue coat, crackling energy around hands',
  }),
  npc(15, '그림자', '사냥꾼', 225, 'diamond', true, false, DT(B1_7.minMs, B1_7.maxMs), 'blindBang', 0, {
    designKeywords:
      'half-dissolved into shadow, smoke trails, dark void cloak, glowing white eyes only',
  }),

  npc(16, '베놈', '스파이크', 215, 'master', false, false, DT(B1_7.minMs, B1_7.maxMs), 'fakeSingles', 1, {
    designKeywords: 'purple venom drip motif, spiked collar, reptile scale texture',
  }),
  npc(17, '사막의 악마', 'Dryden', 200, 'master', true, false, DT(B1_7.minMs, B1_7.maxMs), 'fakeMultis', 0, {
    designKeywords:
      'pale skin, red-rimmed eyes, black longcoat, moonlit backlight, eerie calm',
  }),
  npc(18, '레드 아이', '오라클', 185, 'master', true, false, DT(B1_7.minMs, B1_7.maxMs), 'comboFakeBlind', 0, {
    designKeywords:
      'multiple glowing red eyes, prophet robes with bullet holes, ominous aura',
  }),

  npc(19, '보이드', '워커', 165, 'legend', false, false, DT(B1_7.minMs, B1_7.maxMs), 'invertedSignals', 0, {
    designKeywords:
      'body partially inverted, cosmic void texture, stars visible through coat',
  }),
  npc(20, '에코', '팬텀', 150, 'legend', false, false, DT(B1_7.minMs, B1_7.maxMs), 'echoReady', 0, {
    designKeywords: 'ghostly double image, translucent body, two overlapping silhouettes',
  }),
  npc(21, 'The', 'Undertaker', 135, 'legend', true, false, DT(B1_7.minMs, B1_7.maxMs), 'chaosRandom', 0, {
    designKeywords:
      'funeral black suit, coffin motif, skull-topped cane, final judgment energy',
  }),

  npc(22, 'The Pale', 'Rider', 95, 'hidden', true, false, DT(4000, 12000), 'paleSilence', 0, {
    secret: true,
    designKeywords:
      'white horse skull motif, bleached bone armor, no face, absolute silence, death incarnate',
  }),
] as const satisfies readonly NpcDefinition[];

export function getNpcById(id: number): NpcDefinition | undefined {
  return NPCS.find((n) => n.id === id);
}
