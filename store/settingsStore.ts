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
  setSoundEnabled: (value: boolean) => void;
  setHapticEnabled: (value: boolean) => void;
  setLocalMatchPreset: (preset: LocalMatchPreset) => void;
};

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      hapticEnabled: true,
      localMatchPreset: 'bo5',

      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),

      setHapticEnabled: (hapticEnabled) => set({ hapticEnabled }),

      setLocalMatchPreset: (localMatchPreset) => set({ localMatchPreset }),
    }),
    {
      name: 'high-noon-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        soundEnabled: s.soundEnabled,
        hapticEnabled: s.hapticEnabled,
        localMatchPreset: s.localMatchPreset,
      }),
    },
  ),
);
