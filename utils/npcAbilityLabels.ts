import type { TFunction } from 'i18next';

import type { NpcSpecialAbility } from '@/types/npc';

export function hasNpcSpecialAbility(ability: NpcSpecialAbility): boolean {
  return ability !== 'none';
}

export function getNpcSpecialAbilityLabels(
  t: TFunction,
  ability: NpcSpecialAbility,
): { name: string; description: string } | null {
  if (!hasNpcSpecialAbility(ability)) return null;
  return {
    name: t(`npcs.specialAbility.${ability}.name`),
    description: t(`npcs.specialAbility.${ability}.desc`),
  };
}
