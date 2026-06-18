import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';

import {
  playBgm,
  retryBgmAfterHydration,
  stopBgm,
  syncBgmWithSettings,
  type BgmTrack,
} from '@/utils/bgmService';
import { useSettingsStore } from '@/store/settingsStore';

/** 포커스 동안 BGM 재생. `stopOnBlur`면 화면 이탈 시 정지(결투·결과 화면용). */
export function useScreenBgm(track: BgmTrack | null, stopOnBlur = false): void {
  const musicEnabled = useSettingsStore((s) => s.musicEnabled);

  useEffect(() => {
    const persist = useSettingsStore.persist;
    if (persist.hasHydrated()) {
      if (musicEnabled && track != null) playBgm(track);
      return undefined;
    }
    return persist.onFinishHydration(() => {
      retryBgmAfterHydration(track);
    });
  }, [track, musicEnabled]);

  useEffect(() => {
    if (!musicEnabled) {
      syncBgmWithSettings();
      return;
    }
    if (track != null) playBgm(track);
  }, [musicEnabled, track]);

  useFocusEffect(
    useCallback(() => {
      if (!musicEnabled || track == null) {
        if (stopOnBlur) stopBgm();
        return stopOnBlur ? () => stopBgm() : undefined;
      }
      playBgm(track);
      return stopOnBlur ? () => stopBgm() : undefined;
    }, [track, musicEnabled, stopOnBlur]),
  );
}
