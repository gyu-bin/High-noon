import type { NpcArchetype, NpcTier, NpcZone } from '@/types/npc';

/** §2-3 NPC 선택 카드 — 티어 뱃지 */
export const TIER_BADGE: Record<
  NpcTier,
  { label: string; bg: string; text: string }
> = {
  bronze: { label: 'BRONZE', bg: '#CD7F32', text: '#FFFFFF' },
  silver: { label: 'SILVER', bg: '#C0C0C0', text: '#333333' },
  gold: { label: 'GOLD', bg: '#FFD700', text: '#333333' },
  platinum: { label: 'PLATINUM', bg: '#E5E4E2', text: '#333333' },
  diamond: { label: 'DIAMOND', bg: '#B9F2FF', text: '#006080' },
  master: { label: 'MASTER', bg: '#9B30FF', text: '#FFFFFF' },
  legend: { label: 'LEGEND', bg: '#FF4500', text: '#FFFFFF' },
  hidden: { label: 'HIDDEN', bg: '#1A1A2E', text: '#00FFFF' },
};

/** §4-1 결투 신호판 타이포 */
export const DUEL_SIGNAL_SPEC = {
  ready: { text: 'READY...', color: '#FFD700', fontSize: 32 },
  steady: { text: 'STEADY...', color: '#FF8C00', fontSize: 36 },
  bang: { text: 'BANG!', color: '#FF0000', fontSize: 48 },
} as const;

export const BOSS_CARD_BORDER = '#FFD700';

/** §3 아키타입·존 — NPC id별 (스프라이트/아트 가이드) */
export const NPC_VISUAL_META: Record<
  number,
  { zone: NpcZone; archetype: NpcArchetype; spriteKey: string }
> = {
  1: { zone: 'speed', archetype: 'brown_cowboy', spriteKey: 'npc_01' },
  2: { zone: 'speed', archetype: 'brown_cowboy', spriteKey: 'npc_02' },
  3: { zone: 'speed', archetype: 'brown_cowboy', spriteKey: 'npc_03' },
  4: { zone: 'speed', archetype: 'brown_cowboy', spriteKey: 'npc_04' },
  5: { zone: 'speed', archetype: 'brown_cowboy', spriteKey: 'npc_05' },
  6: { zone: 'speed', archetype: 'brown_cowboy', spriteKey: 'npc_06' },
  7: { zone: 'speed', archetype: 'brown_cowboy', spriteKey: 'npc_07' },
  8: { zone: 'speed', archetype: 'brown_cowboy', spriteKey: 'npc_08' },
  9: { zone: 'speed', archetype: 'brown_cowboy', spriteKey: 'npc_09' },
  10: { zone: 'skill', archetype: 'sheriff', spriteKey: 'npc_10' },
  11: { zone: 'skill', archetype: 'sheriff', spriteKey: 'npc_11' },
  12: { zone: 'skill', archetype: 'sheriff', spriteKey: 'npc_12' },
  13: { zone: 'skill', archetype: 'red_gunslinger', spriteKey: 'npc_13' },
  14: { zone: 'skill', archetype: 'red_gunslinger', spriteKey: 'npc_14' },
  15: { zone: 'skill', archetype: 'red_gunslinger', spriteKey: 'npc_15' },
  16: { zone: 'skill', archetype: 'red_gunslinger', spriteKey: 'npc_16' },
  17: { zone: 'skill', archetype: 'red_gunslinger', spriteKey: 'npc_17' },
  18: { zone: 'skill', archetype: 'red_gunslinger', spriteKey: 'npc_18' },
  19: { zone: 'skill', archetype: 'undead', spriteKey: 'npc_19' },
  20: { zone: 'skill', archetype: 'undead', spriteKey: 'npc_20' },
  21: { zone: 'skill', archetype: 'undead', spriteKey: 'npc_21' },
  22: { zone: 'skill', archetype: 'undead', spriteKey: 'npc_22' },
};

export function getNpcVisualMeta(npcId: number) {
  return NPC_VISUAL_META[npcId];
}
