import type { TFunction } from 'i18next';

import type { NpcTier } from '@/types/npc';

/** NPC 카드·HUD — title/name 중복 방지 */
export function formatNpcDisplayName(title: string, name: string): string {
  const t = title.trim();
  const n = name.trim();
  if (!n) return t;
  if (!t || t === n) return n;
  return `${t} ${n}`;
}

export function getNpcTitle(t: TFunction, id: number): string {
  return t(`npcs.list.${id}.title`);
}

export function getNpcName(t: TFunction, id: number): string {
  return t(`npcs.list.${id}.name`);
}

export function getNpcDisplayName(t: TFunction, id: number): string {
  return formatNpcDisplayName(getNpcTitle(t, id), getNpcName(t, id));
}

export function getNpcTierLabel(t: TFunction, tier: NpcTier): string {
  return t(`npcs.tier.${tier}`);
}
