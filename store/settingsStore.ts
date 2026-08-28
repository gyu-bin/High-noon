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

/** 지원하는 언어 코드 */
export type AppLanguage = 'auto' | 'ko' | 'en' | 'ja';

export const LANGUAGE_OPTIONS: { value: AppLanguage; label: string }[] = [
  { value: 'auto', label: '자동 (Auto)' },
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
];

type SettingsStoreState = {
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticEnabled: boolean;
  localMatchPreset: LocalMatchPreset;
  /** 플레이어 선택 캐릭터 id (1~4) */
  selectedCharacterId: number;
  /** 앱 언어 설정 (auto = 기기 설정 따름) */
  language: AppLanguage;
  setSoundEnabled: (value: boolean) => void;
  setMusicEnabled: (value: boolean) => void;
  setHapticEnabled: (value: boolean) => void;
  setLocalMatchPreset: (preset: LocalMatchPreset) => void;
  setSelectedCharacterId: (id: number) => void;
  setLanguage: (lang: AppLanguage) => void;
};

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      musicEnabled: true,
      hapticEnabled: true,
      localMatchPreset: 'bo5',
      selectedCharacterId: 1,
      language: 'auto',

      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),

      setMusicEnabled: (musicEnabled) => set({ musicEnabled }),

      setHapticEnabled: (hapticEnabled) => set({ hapticEnabled }),

      setLocalMatchPreset: (localMatchPreset) => set({ localMatchPreset }),

      setSelectedCharacterId: (selectedCharacterId) => set({ selectedCharacterId }),

      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'high-noon-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        soundEnabled: s.soundEnabled,
        musicEnabled: s.musicEnabled,
        hapticEnabled: s.hapticEnabled,
        localMatchPreset: s.localMatchPreset,
        selectedCharacterId: s.selectedCharacterId,
        language: s.language,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as object),
        musicEnabled:
          (persisted as Partial<SettingsStoreState>)?.musicEnabled ?? true,
        selectedCharacterId:
          (persisted as Partial<SettingsStoreState>)?.selectedCharacterId ?? 1,
        language:
          (persisted as Partial<SettingsStoreState>)?.language ?? 'auto',
      }),
    },
  ),
);
