import 'react-native-gesture-handler';

import { Rye_400Regular, useFonts } from '@expo-google-fonts/rye';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useCallback, useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { OtaUpdatedToast } from '@/components/ui/OtaUpdatedToast';
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

/** 스플래시 유지한 채 OTA 확인·적용. UI 문구 없이 조용히 처리. */
async function applyOtaUpdateIfAvailable(): Promise<boolean> {
  if (__DEV__ || !Updates.isEnabled) return false;
  try {
    const check = await withTimeout(Updates.checkForUpdateAsync(), OTA_SPLASH_TIMEOUT_MS);
    if (!check.isAvailable) return false;
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
  const [otaToastVisible, setOtaToastVisible] = useState(false);

  useAutoScreenshotTour(appReady);

  const hideOtaToast = useCallback(() => setOtaToastVisible(false), []);

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
      // 재시작 직후 플래그 — 앱 진입 후 하단 작은 토스트만
      const justUpdated = await consumeOtaJustApplied();
      if (cancelled) return;

      const reloading = await applyOtaUpdateIfAvailable();
      if (reloading || cancelled) return;

      await preloadTitleHero();
      if (cancelled) return;
      checkUnlockConditions();
      setAppReady(true);
      if (justUpdated) setOtaToastVisible(true);
      await SplashScreen.hideAsync();
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

  if (!ready || !appReady) {
    return null;
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
      <OtaUpdatedToast visible={otaToastVisible} onHidden={hideOtaToast} />
    </SafeAreaProvider>
  );
}
