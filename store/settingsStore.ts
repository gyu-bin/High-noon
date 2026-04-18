import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** 로컬 2인전 시리즈 (3판2선 / 5판3선 / 7판4선) */
export type LocalMatchPreset = 'bo3' | 'bo5' | 'bo7';

export const LOCAL_MATCH_PRESETS: Record<
  LocalMatchPreset,
  { winsRequired: number; maxRounds: number }
> = {
  bo3: { winsRequired: 2, maxRounds: 3 },
  bo5: { winsRequired: 3, maxRounds: 5 },
  bo7: { winsRequired: 4, maxRounds: 7 },
};

type SettingsStoreState = {
  soundEnabled: boolean;
  hapticEnabled: boolean;
  localMatchPreset: LocalMatchPreset;
  /** 플레이어 선택 캐릭터 id (1~4) */
  selectedCharacterId: number;
  setSoundEnabled: (value: boolean) => void;
  setHapticEnabled: (value: boolean) => void;
  setLocalMatchPreset: (preset: LocalMatchPreset) => void;
  setSelectedCharacterId: (id: number) => void;
};

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      hapticEnabled: true,
      localMatchPreset: 'bo5',
      selectedCharacterId: 1,

      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),

      setHapticEnabled: (hapticEnabled) => set({ hapticEnabled }),

      setLocalMatchPreset: (localMatchPreset) => set({ localMatchPreset }),

      setSelectedCharacterId: (selectedCharacterId) => set({ selectedCharacterId }),
    }),
    {
      name: 'high-noon-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        soundEnabled: s.soundEnabled,
        hapticEnabled: s.hapticEnabled,
        localMatchPreset: s.localMatchPreset,
        selectedCharacterId: s.selectedCharacterId,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as object),
        selectedCharacterId:
          (persisted as Partial<SettingsStoreState>)?.selectedCharacterId ?? 1,
      }),
    },
  ),
);
