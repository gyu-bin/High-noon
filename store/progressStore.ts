/**
 * 진행도: NPC별 클리어·최단 반응, 전체 반응 평균 샘플 등 — `persist` + AsyncStorage로 앱 재시작 후 유지.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { NPCS } from '@/constants/npcs';

export type NpcProgressRow = {
  cleared: boolean;
  /** 해당 NPC전에서 기록한 플레이어 최단 반응(ms). 없으면 null */
  bestReactionMs: number | null;
};

type ReactionAggregate = {
  sumMs: number;
  count: number;
};

type ProgressStoreState = {
  /** NPC id(1~)별 진행 */
  npcById: Record<number, NpcProgressRow>;
  /** 현재 도전 가능한 최대 NPC id (1부터 시작, 클리어 시 +1) */
  highestUnlockedNpcId: number;
  reactionAggregate: ReactionAggregate;
  /** 해금된 플레이어 캐릭터 id (1~4) */
  unlockedCharacterIds: number[];
  /** 망령 사수(4번) 비밀 해금 여부 — UI 공개 연출용 */
  hiddenCharUnlocked: boolean;
  /** High noon Pro entitlement — 전면 광고 스킵 등 (RevenueCat과 동기화) */
  isAdFree: boolean;
  setAdFree: (value: boolean) => void;
  markNpcCleared: (npcId: number) => void;
  /** 플레이어 유효 반응이면 더 빠른 값으로 갱신 */
  recordNpcBestReaction: (npcId: number, playerMs: number) => void;
  /** 전체 평균용: 유효한 플레이어 반응 1건 기록 */
  recordGlobalReactionSample: (playerMs: number) => void;
  /** 해금 상한을 직접 설정 (디버그/튜닝) */
  setHighestUnlockedNpcId: (id: number) => void;
  /** 캐릭터 해금 목록 덮어쓰기 (저장 동기화 등) */
  setUnlockedCharacterIds: (ids: number[]) => void;
  setHiddenCharUnlocked: (value: boolean) => void;
  resetProgress: () => void;
};

function emptyRow(): NpcProgressRow {
  return { cleared: false, bestReactionMs: null };
}

function buildDefaultNpcById(): Record<number, NpcProgressRow> {
  const m: Record<number, NpcProgressRow> = {};
  for (const n of NPCS) {
    m[n.id] = emptyRow();
  }
  return m;
}

const initialNpcById = buildDefaultNpcById();

const MAX_NPC_ID = NPCS[NPCS.length - 1]!.id;

function isPaleRiderUnlockedFromSnapshot(
  npcById: Record<number, NpcProgressRow>,
  reactionAggregate: ReactionAggregate,
): boolean {
  const { sumMs, count } = reactionAggregate;
  if (count <= 0) return false;
  if (sumMs / count > 200) return false;
  for (let id = 1; id <= 21; id++) {
    if (!npcById[id]?.cleared) return false;
  }
  return true;
}

/** #22 The Pale Rider — 평균 반응 ≤200ms + 1~21 전원 클리어 */
export function selectPaleRiderUnlocked(): boolean {
  const s = useProgressStore.getState();
  return isPaleRiderUnlockedFromSnapshot(s.npcById, s.reactionAggregate);
}

const baseProgress: Pick<
  ProgressStoreState,
  | 'npcById'
  | 'highestUnlockedNpcId'
  | 'reactionAggregate'
  | 'unlockedCharacterIds'
  | 'hiddenCharUnlocked'
  | 'isAdFree'
> = {
  npcById: initialNpcById,
  highestUnlockedNpcId: 1,
  reactionAggregate: { sumMs: 0, count: 0 },
  unlockedCharacterIds: [1],
  hiddenCharUnlocked: false,
  isAdFree: false,
};

function clampNpcId(id: number): number {
  return Math.min(Math.max(1, Math.round(id)), MAX_NPC_ID);
}

export const useProgressStore = create<ProgressStoreState>()(
  persist(
    (set) => ({
      ...baseProgress,

      markNpcCleared: (npcId) =>
        set((s) => {
          const id = clampNpcId(npcId);
          const prev = s.npcById[id] ?? emptyRow();
          const npcById = {
            ...s.npcById,
            [id]: { ...prev, cleared: true },
          };
          const pale = isPaleRiderUnlockedFromSnapshot(npcById, s.reactionAggregate);
          const cap = pale ? MAX_NPC_ID : MAX_NPC_ID - 1;
          const highestUnlockedNpcId = Math.max(
            s.highestUnlockedNpcId,
            Math.min(id + 1, cap),
          );
          return { npcById, highestUnlockedNpcId };
        }),

      recordNpcBestReaction: (npcId, playerMs) =>
        set((s) => {
          const id = clampNpcId(npcId);
          const prev = s.npcById[id] ?? emptyRow();
          const nextBest =
            prev.bestReactionMs == null
              ? playerMs
              : Math.min(prev.bestReactionMs, playerMs);
          return {
            npcById: {
              ...s.npcById,
              [id]: { ...prev, bestReactionMs: nextBest },
            },
          };
        }),

      recordGlobalReactionSample: (playerMs) =>
        set((s) => {
          const { sumMs, count } = s.reactionAggregate;
          return {
            reactionAggregate: {
              sumMs: sumMs + playerMs,
              count: count + 1,
            },
          };
        }),

      setHighestUnlockedNpcId: (id) =>
        set({
          highestUnlockedNpcId: clampNpcId(id),
        }),

      setUnlockedCharacterIds: (unlockedCharacterIds) =>
        set({
          unlockedCharacterIds: [...new Set(unlockedCharacterIds)].sort(
            (a, b) => a - b,
          ),
        }),

      setHiddenCharUnlocked: (hiddenCharUnlocked) => set({ hiddenCharUnlocked }),

      setAdFree: (isAdFree) => set({ isAdFree }),

      resetProgress: () =>
        set({
          npcById: buildDefaultNpcById(),
          highestUnlockedNpcId: 1,
          reactionAggregate: { sumMs: 0, count: 0 },
          unlockedCharacterIds: [1],
          hiddenCharUnlocked: false,
        }),
    }),
    {
      name: 'high-noon-progress',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        npcById: s.npcById,
        highestUnlockedNpcId: s.highestUnlockedNpcId,
        reactionAggregate: s.reactionAggregate,
        unlockedCharacterIds: s.unlockedCharacterIds,
        hiddenCharUnlocked: s.hiddenCharUnlocked,
        isAdFree: s.isAdFree,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<ProgressStoreState> | undefined;
        if (!p?.npcById) return { ...current, ...p };
        const mergedNpc = { ...buildDefaultNpcById(), ...p.npcById };
        return {
          ...current,
          ...p,
          npcById: mergedNpc,
          unlockedCharacterIds: p.unlockedCharacterIds ?? [1],
          hiddenCharUnlocked: p.hiddenCharUnlocked ?? false,
          isAdFree: p.isAdFree ?? false,
        };
      },
    },
  ),
);

/** 전체 평균 반응(ms). 표본 없으면 null */
export function selectAverageReactionMs(): number | null {
  const { sumMs, count } = useProgressStore.getState().reactionAggregate;
  if (count <= 0) return null;
  return sumMs / count;
}
