import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { useProgressStore } from '@/store/progressStore';
import {
  isDailyMissionComplete,
  localDateKey,
  pickTodayBossNpcId,
  type DailyMissionId,
} from '@/utils/dailyMissions';

type DailyMissionState = {
  dateKey: string;
  todayBossNpcId: number;
  rankingPlay: boolean;
  rankingWin: boolean;
  todayBoss: boolean;
  ensureToday: (highestUnlockedNpcId: number) => void;
  complete: (id: DailyMissionId) => void;
  allDone: () => boolean;
};

export const useDailyMissionStore = create<DailyMissionState>()(
  persist(
    (set, get) => ({
      dateKey: '',
      todayBossNpcId: 3,
      rankingPlay: false,
      rankingWin: false,
      todayBoss: false,

      ensureToday: (highestUnlockedNpcId) => {
        const key = localDateKey();
        const cur = get();
        if (cur.dateKey === key && cur.todayBossNpcId > 0) return;
        set({
          dateKey: key,
          todayBossNpcId: pickTodayBossNpcId(key, highestUnlockedNpcId),
          rankingPlay: false,
          rankingWin: false,
          todayBoss: false,
        });
      },

      complete: (id) => {
        const key = localDateKey();
        const cur = get();
        if (cur.dateKey !== key) return;
        if (cur[id]) return;
        set({ [id]: true });
      },

      allDone: () => isDailyMissionComplete(get()),
    }),
    {
      name: 'high-noon-daily-missions',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        dateKey: s.dateKey,
        todayBossNpcId: s.todayBossNpcId,
        rankingPlay: s.rankingPlay,
        rankingWin: s.rankingWin,
        todayBoss: s.todayBoss,
      }),
      onRehydrateStorage: () => (state) => {
        const roll = () => {
          if (!state) return;
          state.ensureToday(useProgressStore.getState().highestUnlockedNpcId);
        };
        if (useProgressStore.persist.hasHydrated()) {
          roll();
          return;
        }
        useProgressStore.persist.onFinishHydration(roll);
      },
    },
  ),
);

function bothStoresHydrated(): boolean {
  return (
    useDailyMissionStore.persist.hasHydrated() &&
    useProgressStore.persist.hasHydrated()
  );
}

/** 데일리·캠페인 persist가 둘 다 올라온 뒤에 날짜/보스를 고정한다. */
export function whenDailyMissionsReady(cb: () => void): () => void {
  let cancelled = false;
  const run = () => {
    if (cancelled || !bothStoresHydrated()) return;
    cb();
  };
  const unsubDaily = useDailyMissionStore.persist.onFinishHydration(run);
  const unsubProgress = useProgressStore.persist.onFinishHydration(run);
  run();
  return () => {
    cancelled = true;
    unsubDaily();
    unsubProgress();
  };
}

export function completeDailyAfterReady(ids: DailyMissionId[]): void {
  const apply = () => {
    const daily = useDailyMissionStore.getState();
    daily.ensureToday(useProgressStore.getState().highestUnlockedNpcId);
    for (const id of ids) daily.complete(id);
  };
  if (bothStoresHydrated()) {
    apply();
    return;
  }
  const unsub = whenDailyMissionsReady(() => {
    apply();
    unsub();
  });
}
