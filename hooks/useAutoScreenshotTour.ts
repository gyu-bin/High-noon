import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { DEV_AUTO_SCREENSHOTS } from '@/constants/devFlags';

const AUTO_CAPTURE_STEPS = [
  '/menu',
  '/npc-select',
  '/capture/duel-steady',
  '/capture/duel-bang',
  '/capture/duel-win',
  '/capture/duel-defeat',
  '/character-select',
  '/capture/duel-boss',
  '/capture/local-duel',
  '/capture/duel-landscape',
] as const;

const STEP_MS = Number(process.env.EXPO_PUBLIC_CAPTURE_STEP_MS ?? 6000);
const FIRST_STEP_DELAY_MS = Number(process.env.EXPO_PUBLIC_CAPTURE_FIRST_DELAY_MS ?? 0);

function delay(ms: number, cancelled: () => boolean) {
  return new Promise<void>((resolve) => {
    const t = setTimeout(() => {
      if (!cancelled()) resolve();
    }, ms);
    if (cancelled()) {
      clearTimeout(t);
      resolve();
    }
  });
}

/** App Store 스크린샷 스크립트용 — 루트에서 화면 자동 순환 */
export function useAutoScreenshotTour(enabled: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled || !DEV_AUTO_SCREENSHOTS) return;

    let cancelled = false;
    const isCancelled = () => cancelled;

    void (async () => {
      await delay(FIRST_STEP_DELAY_MS, isCancelled);
      for (const path of AUTO_CAPTURE_STEPS) {
        if (cancelled) return;
        router.replace(path);
        await delay(STEP_MS, isCancelled);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, router]);
}
