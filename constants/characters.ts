export type PlayerCharacterId = 1 | 2 | 3 | 4;

export type PlayerCharacter = {
  id: PlayerCharacterId;
  name: string;
  abilityName: string | null;
  abilityDescription: string | null;
  /** 설정/컬렉션 UI에 표시 */
  unlockCondition: string;
  /** 4번 망령 사수만 true — 목록에서 가림 등 */
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
  {
    id: 1,
    name: '무명의 총잡이',
    abilityName: null,
    abilityDescription: null,
    unlockCondition: '기본 해금',
    isHidden: false,
  },
  {
    id: 2,
    name: '철의 보안관',
    abilityName: '라스트 스탠드',
    abilityDescription: '매치당 1회, 패배한 라운드를 승리로 바꿉니다.',
    unlockCondition: 'NPC 10명 클리어',
    isHidden: false,
  },
  {
    id: 3,
    name: '붉은 로사',
    abilityName: '헤드샷',
    abilityDescription:
      '승리한 라운드 직후 선택 시 NPC 하트를 2칸 동시에 제거합니다. (매치당 1회)',
    unlockCondition: 'NPC 15명 클리어',
    isHidden: false,
  },
  {
    id: 4,
    name: '망령 사수',
    abilityName: '한 번 더',
    abilityDescription:
      '매치당 1회, 플레이어 하트가 0이 되는 대신 1로 부활합니다.',
    unlockCondition: '해금 조건 미공개',
    isHidden: true,
  },
];

export function getCharacterById(id: number): PlayerCharacter | undefined {
  return CHARACTERS.find((c) => c.id === id);
}
