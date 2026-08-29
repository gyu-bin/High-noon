import { CHARACTER_UNLOCK, CHARACTERS, type PlayerCharacterId } from '@/constants/characters';
import { DEV_UNLOCK_ALL_CHARACTERS } from '@/constants/devFlags';
import { NPCS } from '@/constants/npcs';
import type { DuelOutcome } from '@/hooks/useDuelEngine';
import { selectAverageReactionMs, useProgressStore } from '@/store/progressStore';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * 승패·하트 변화는 `DuelOutcome`만으로는 부족하므로, 엔진이 계산한 값을 함께 넘깁니다.
 */
export type AbilityApplyInput = {
  outcome: DuelOutcome | null;
  /** 이번 라운드의 원래 승자 (능력 적용 전) */
  provisionalWinner: 'player' | 'opponent' | 'draw';
  /** 이번 매치에서 이미 캐릭터 능력을 소모했는지 (gameStore.abilityUsed) */
  abilityUsedThisMatch: boolean;
  /** 라운드 직전 플레이어 하트 */
  playerHeartsBefore: number;
  /** 라운드 처리 직후 플레이어 하트 (능력 미적용 기준) */
  playerHeartsAfter: number;
  /** 라운드 처리 직후 상대 하트 (능력 미적용 기준) */
  opponentHeartsAfter: number;
};

export type CharacterAbilityResult = {
  /** 라스트 스탠드: 패배 라운드를 승리로 뒤집을지 */
  lastStandFlipToPlayerWin?: boolean;
  /** 헤드샷: 발동 시 NPC 하트를 2칸 한 번에 제거 (승리 확정 후 선택 UI에서 확인 시 처리) */
  headshotRemoveTwoOpponentHearts?: boolean;
  /** 한 번 더: 플레이어 하트 0 → 1 부활 적용 */
  revivePlayerToOneHeart?: boolean;
};

function countNpcClears(npcById: ReturnType<typeof useProgressStore.getState>['npcById']): number {
  let n = 0;
  for (const npc of NPCS) {
    if (npcById[npc.id]?.cleared) n += 1;
  }
  return n;
}

function allNpcCleared(
  npcById: ReturnType<typeof useProgressStore.getState>['npcById'],
): boolean {
  return NPCS.filter((npc) => !npc.secret).every((npc) => npcById[npc.id]?.cleared === true);
}

/**
 * NPC 클리어 수·전원 클리어·평균 반응속도로 캐릭터 해금을 갱신합니다.
 * (진행도 변경 직후·설정 화면 진입 등에서 호출)
 *
 * persist hydration 전에는 호출해도 no-op — 기본값 set이 AsyncStorage를 덮어쓰지 않게.
 */
export function checkUnlockConditions(): void {
  if (!useProgressStore.persist.hasHydrated()) return;

  const { npcById, unlockedCharacterIds, setUnlockedCharacterIds, setHiddenCharUnlocked } =
    useProgressStore.getState();

  if (DEV_UNLOCK_ALL_CHARACTERS) {
    setUnlockedCharacterIds(CHARACTERS.map((c) => c.id));
    setHiddenCharUnlocked(true);
    return;
  }

  const clears = countNpcClears(npcById);
  const avg = selectAverageReactionMs();
  const allClear = allNpcCleared(npcById);

  // 진행도 기준 엄격 재계산 — 개발용 전체 해금이 저장된 기기도 정상 잠금으로 복구
  const next = new Set<number>([1]);

  if (clears >= CHARACTER_UNLOCK.npcClearsFor2) next.add(2);
  if (clears >= CHARACTER_UNLOCK.npcClearsFor3) next.add(3);

  // 4번(망령 사수): 조건 달성 순간 해금, 이후 평균이 나빠져도 전 NPC 클리어 상태면 유지
  const ghostEarnedNow =
    allClear && avg != null && avg <= CHARACTER_UNLOCK.avgReactionMsFor4;
  const ghostKept = unlockedCharacterIds.includes(4) && allClear;
  if (ghostEarnedNow || ghostKept) {
    next.add(4);
    setHiddenCharUnlocked(true);
  } else {
    setHiddenCharUnlocked(false);
  }

  setUnlockedCharacterIds([...next]);

  // 잠긴 캐릭터가 선택된 채 남아 있으면(개발용 전체 해금 상태에서 저장된 경우 등) 기본 캐릭터로 복구
  const settings = useSettingsStore.getState();
  if (!next.has(settings.selectedCharacterId)) {
    settings.setSelectedCharacterId(1);
  }
}

/**
 * 라운드 종료 직후 캐릭터 능력이 제안하는 효과를 반환합니다.
 * 실제 점수/하트 반영은 호출 측에서 `CharacterAbilityResult`에 맞춰 적용하고,
 * 소모형 능력은 `setAbilityUsed(true)`로 기록합니다.
 */
export function applyAbility(
  characterId: number,
  input: AbilityApplyInput,
): CharacterAbilityResult {
  const id = characterId as PlayerCharacterId;
  const { provisionalWinner, abilityUsedThisMatch } = input;

  if (abilityUsedThisMatch) {
    return {};
  }

  switch (id) {
    case 2: {
      if (provisionalWinner !== 'opponent') return {};
      return { lastStandFlipToPlayerWin: true };
    }
    case 3: {
      if (provisionalWinner !== 'player') return {};
      return { headshotRemoveTwoOpponentHearts: true };
    }
    case 4: {
      if (provisionalWinner !== 'opponent') return {};
      const wouldBeZero = input.playerHeartsAfter <= 0 && input.playerHeartsBefore >= 1;
      if (!wouldBeZero) return {};
      return { revivePlayerToOneHeart: true };
    }
    default:
      return {};
  }
}
