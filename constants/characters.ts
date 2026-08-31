export type PlayerCharacterId = 1 | 2 | 3 | 4;

export type CharacterAbilityKey = 'lastStand' | 'headshot' | 'revive';

export type CharacterUnlockKey = 'default' | 'npc10' | 'npc15' | 'hidden';

export type PlayerCharacter = {
  id: PlayerCharacterId;
  abilityKey: CharacterAbilityKey | null;
  unlockKey: CharacterUnlockKey;
  /** 예전 숨김 플래그. 목록에는 모두 보이며, 잠금은 unlockedCharacterIds로만 처리한다. */
  isHidden: boolean;
};

/** 캐릭터 해금 수치 (진행도 연동 시 사용) */
export const CHARACTER_UNLOCK = {
  npcClearsFor2: 10,
  npcClearsFor3: 15,
  /** 4번: 전 NPC 클리어 + 평균 반응(ms) 이하 */
  avgReactionMsFor4: 200,
} as const;

export const CHARACTERS: readonly PlayerCharacter[] = [
  { id: 1, abilityKey: null, unlockKey: 'default', isHidden: false },
  { id: 2, abilityKey: 'lastStand', unlockKey: 'npc10', isHidden: false },
  { id: 3, abilityKey: 'headshot', unlockKey: 'npc15', isHidden: false },
  { id: 4, abilityKey: 'revive', unlockKey: 'hidden', isHidden: false },
];

export function getCharacterById(id: number): PlayerCharacter | undefined {
  return CHARACTERS.find((c) => c.id === id);
}
