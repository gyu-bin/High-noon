import 'react-native-gesture-handler';

import { Rye_400Regular, useFonts } from '@expo-google-fonts/rye';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { OtaBootSplash } from '@/components/ui/OtaBootSplash';
import { colors } from '@/constants/theme';
import { useAutoScreenshotTour } from '@/hooks/useAutoScreenshotTour';
import { checkUnlockConditions } from '@/utils/characterAbility';
import { WESTERN_HERO_FALLBACK } from '@/constants/westernBackground';
import { initAds, preloadInterstitial, preloadRewardedAd } from '@/utils/adService';
import { preloadAll } from '@/utils/audioService';
import { bootMenuBgm } from '@/utils/bgmService';
import { consumeOtaJustApplied, markOtaJustApplied } from '@/utils/otaUpdateFlag';
import { preloadSceneImages, preloadTitleHero } from '@/utils/preloadSceneImages';
// IAP 임시 비활성 — 다시 켤 때 purchaseService.IAP_ENABLED=true 와 함께 주석 해제
// import { initPurchases } from '@/utils/purchaseService';

SplashScreen.preventAutoHideAsync();

const OTA_SPLASH_TIMEOUT_MS = 12_000;
const OTA_DONE_SHOW_MS = 2400;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('ota-timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 스플래시(부트 화면)에서 EAS Update 확인 → 다운로드 → 재시작.
 * 재시작 직후엔 같은 화면에서 "업데이트 완료"를 잠깐 보여 준다.
 */
async function applyOtaUpdateIfAvailable(
  onStatus: (message: string) => void,
): Promise<boolean> {
  if (__DEV__ || !Updates.isEnabled) return false;
  try {
    onStatus('업데이트 확인 중…');
    const check = await withTimeout(Updates.checkForUpdateAsync(), OTA_SPLASH_TIMEOUT_MS);
    if (!check.isAvailable) return false;
    onStatus('업데이트 적용 중…');
    await withTimeout(Updates.fetchUpdateAsync(), OTA_SPLASH_TIMEOUT_MS);
    await markOtaJustApplied();
    await Updates.reloadAsync();
    return true;
  } catch {
    return false;
  }
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Rye_400Regular,
  });

  const ready = fontsLoaded || fontError != null;
  const [appReady, setAppReady] = useState(false);
  const [bootMessage, setBootMessage] = useState<string | null>(null);

  useAutoScreenshotTour(appReady);

  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const so: typeof import('expo-screen-orientation') = require('expo-screen-orientation');
      void so.unlockAsync().catch(() => {});
    } catch {
      // 네이티브 모듈 미포함 빌드
    }
  }, []);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    async function prepare() {
      // 네이티브 스플래시 → 동일 색 부트 화면 (메시지 표시 가능)
      await SplashScreen.hideAsync();
      if (cancelled) return;

      // 직전 OTA reload 로 들어온 경우 — 스플래시에서 완료 안내
      const justUpdated = await consumeOtaJustApplied();
      if (cancelled) return;
      if (justUpdated) {
        setBootMessage('업데이트 완료');
        await delay(OTA_DONE_SHOW_MS);
        if (cancelled) return;
        setBootMessage(null);
      }

      const reloading = await applyOtaUpdateIfAvailable((msg) => {
        if (!cancelled) setBootMessage(msg);
      });
      if (reloading || cancelled) return;
      setBootMessage(null);

      await preloadTitleHero();
      if (cancelled) return;
      checkUnlockConditions();
      setAppReady(true);
      void preloadAll();
      void bootMenuBgm();
      void preloadSceneImages();
      void initAds().then(() => {
        preloadInterstitial();
        preloadRewardedAd();
      });
    }

    void prepare();

    return () => {
      cancelled = true;
    };
  }, [ready]);

  if (!ready) {
    return null;
  }

  if (!appReady) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <OtaBootSplash message={bootMessage} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.darkBrown },
          headerTintColor: colors.cream,
          headerTitleStyle: { fontWeight: '700', color: colors.cream },
          headerBackTitle: '뒤로',
          contentStyle: { backgroundColor: WESTERN_HERO_FALLBACK },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="menu" options={{ headerShown: false }} />
        <Stack.Screen name="npc-select" options={{ title: '대결상대 선택' }} />
        <Stack.Screen name="local-setup" options={{ title: '2인 대결' }} />
        <Stack.Screen name="stats" options={{ title: '기록' }} />
        <Stack.Screen name="character-select" options={{ title: '캐릭터' }} />
        <Stack.Screen name="duel" options={{ title: '결투', headerShown: true }} />
        <Stack.Screen name="game" options={{ headerShown: false }} />
        <Stack.Screen name="capture" options={{ headerShown: false }} />
        <Stack.Screen name="result" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
