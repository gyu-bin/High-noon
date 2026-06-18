import { useEffect } from 'react';

import type { DuelPhase } from '@/hooks/useDuelEngine';
import { duckBgm } from '@/utils/bgmService';

/** 결투 중 뱅·페이크 시 BGM 볼륨 duck */
export function useDuelBgmDuck(phase: DuelPhase): void {
  useEffect(() => {
    if (phase === '뱅' || phase === '페이크') {
      duckBgm(true);
    }
  }, [phase]);
}
