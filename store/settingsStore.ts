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
  /** 메뉴 — 가로 회전 안내 팝업 1회 */
  landscapeHintSeen: boolean;
  /** 광고 제거 활성화 안내 카드 닫음 (구매 완료 후) */
  iapActiveCardDismissed: boolean;
  setSoundEnabled: (value: boolean) => void;
  setMusicEnabled: (value: boolean) => void;
  setHapticEnabled: (value: boolean) => void;
  setLocalMatchPreset: (preset: LocalMatchPreset) => void;
  setSelectedCharacterId: (id: number) => void;
  setLanguage: (lang: AppLanguage) => void;
  setLandscapeHintSeen: (value: boolean) => void;
  setIapActiveCardDismissed: (value: boolean) => void;
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
      landscapeHintSeen: false,
      iapActiveCardDismissed: false,

      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),

      setMusicEnabled: (musicEnabled) => set({ musicEnabled }),

      setHapticEnabled: (hapticEnabled) => set({ hapticEnabled }),

      setLocalMatchPreset: (localMatchPreset) => set({ localMatchPreset }),

      setSelectedCharacterId: (selectedCharacterId) => set({ selectedCharacterId }),

      setLanguage: (language) => set({ language }),

      setLandscapeHintSeen: (landscapeHintSeen) => set({ landscapeHintSeen }),

      setIapActiveCardDismissed: (iapActiveCardDismissed) =>
        set({ iapActiveCardDismissed }),
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
        landscapeHintSeen: s.landscapeHintSeen,
        iapActiveCardDismissed: s.iapActiveCardDismissed,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<SettingsStoreState> & {
          localLandscapeHintSeen?: boolean;
        };
        return {
          ...current,
          ...p,
          musicEnabled: p?.musicEnabled ?? true,
          selectedCharacterId: p?.selectedCharacterId ?? 1,
          language: p?.language ?? 'auto',
          landscapeHintSeen:
            p?.landscapeHintSeen ?? p?.localLandscapeHintSeen ?? false,
          iapActiveCardDismissed: p?.iapActiveCardDismissed ?? false,
        };
      },
    },
  ),
);
