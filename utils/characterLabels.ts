import { useMemo } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import {
  CHARACTER_UNLOCK,
  type PlayerCharacterId,
} from '@/constants/characters';
import { HEADSHOT_MIN_REACTION_GAP_MS } from '@/utils/characterAbility';

export type CharacterLabels = {
  name: string;
  abilityName: string | null;
  abilityDescription: string | null;
  unlockCondition: string;
};

function unlockCondition(t: TFunction, id: PlayerCharacterId): string {
  switch (id) {
    case 1:
      return t('character.unlock.default');
    case 2:
      return t('character.unlock.npcClears', { count: CHARACTER_UNLOCK.npcClearsFor2 });
    case 3:
      return t('character.unlock.npcClears', { count: CHARACTER_UNLOCK.npcClearsFor3 });
    case 4:
      return t('character.unlock.hidden');
  }
}

export function getCharacterLabels(t: TFunction, id: PlayerCharacterId): CharacterLabels {
  const base = `character.list.${id}`;
  const abilityName = t(`${base}.ability`, { defaultValue: '' });
  const abilityDescription = t(`${base}.abilityDesc`, {
    defaultValue: '',
    ms: HEADSHOT_MIN_REACTION_GAP_MS,
  });

  return {
    name: t(`${base}.name`),
    abilityName: abilityName || null,
    abilityDescription: abilityDescription || null,
    unlockCondition: unlockCondition(t, id),
  };
}

export function useCharacterLabels(id: PlayerCharacterId): CharacterLabels {
  const { t } = useTranslation();
  return useMemo(() => getCharacterLabels(t, id), [t, id]);
}

export function abilityOverlayLabel(
  t: TFunction,
  ability: 'lastStand' | 'headshot' | 'revive',
): string {
  return t(`character.abilityOverlay.${ability}`);
}
