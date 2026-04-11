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
  markNpcCleared: (npcId: number) => void;
  /** 플레이어 유효 반응이면 더 빠른 값으로 갱신 */
  recordNpcBestReaction: (npcId: number, playerMs: number) => void;
  /** 전체 평균용: 유효한 플레이어 반응 1건 기록 */
  recordGlobalReactionSample: (playerMs: number) => void;
  /** 해금 상한을 직접 설정 (디버그/튜닝) */
  setHighestUnlockedNpcId: (id: number) => void;
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

const baseProgress: Pick<
  ProgressStoreState,
  'npcById' | 'highestUnlockedNpcId' | 'reactionAggregate'
> = {
  npcById: initialNpcById,
  highestUnlockedNpcId: 1,
  reactionAggregate: { sumMs: 0, count: 0 },
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
          const highestUnlockedNpcId = Math.max(
            s.highestUnlockedNpcId,
            Math.min(id + 1, MAX_NPC_ID),
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

      resetProgress: () =>
        set({
          npcById: buildDefaultNpcById(),
          highestUnlockedNpcId: 1,
          reactionAggregate: { sumMs: 0, count: 0 },
        }),
    }),
    {
      name: 'high-noon-progress',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        npcById: s.npcById,
        highestUnlockedNpcId: s.highestUnlockedNpcId,
        reactionAggregate: s.reactionAggregate,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<ProgressStoreState> | undefined;
        if (!p?.npcById) return { ...current, ...p };
        const mergedNpc = { ...buildDefaultNpcById(), ...p.npcById };
        return {
          ...current,
          ...p,
          npcById: mergedNpc,
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
