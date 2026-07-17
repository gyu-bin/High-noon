import 'react-native-gesture-handler';

import { Rye_400Regular, useFonts } from '@expo-google-fonts/rye';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { colors } from '@/constants/theme';
import { useAutoScreenshotTour } from '@/hooks/useAutoScreenshotTour';
import { checkUnlockConditions } from '@/utils/characterAbility';
import { WESTERN_HERO_FALLBACK } from '@/constants/westernBackground';
// 광고 임시 비활성 — 다시 켤 때 adService.ADS_ENABLED=true 와 함께 주석 해제
// import { initAds, preloadInterstitial, preloadRewardedAd } from '@/utils/adService';
// IAP 임시 비활성 — 다시 켤 때 purchaseService.IAP_ENABLED=true 와 함께 주석 해제
// import { initPurchases } from '@/utils/purchaseService';
import { preloadAll } from '@/utils/audioService';
import { bootMenuBgm } from '@/utils/bgmService';
import { preloadSceneImages, preloadTitleHero } from '@/utils/preloadSceneImages';

SplashScreen.preventAutoHideAsync();

/** 프로덕션 빌드에서 EAS Update를 받아 즉시 재시작. 실패해도 앱은 계속 진행. */
async function applyOtaUpdateIfAvailable(): Promise<boolean> {
  if (__DEV__ || !Updates.isEnabled) return false;
  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return false;
    await Updates.fetchUpdateAsync();
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

  useAutoScreenshotTour(appReady);

  // 전 화면 회전 허용 — 이전 실행에서 잠긴 방향이 남아있을 수 있어 해제
  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const so: typeof import('expo-screen-orientation') = require('expo-screen-orientation');
      void so.unlockAsync().catch(() => {});
    } catch {
      // 네이티브 모듈 미포함 빌드 — app.json orientation 설정에 의존
    }
  }, []);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    async function prepare() {
      const reloading = await applyOtaUpdateIfAvailable();
      if (reloading || cancelled) return;

      await preloadTitleHero();
      if (cancelled) return;
      // 진행도 기준 캐릭터 해금 동기화 + 잠긴 캐릭터가 선택돼 있으면 기본 캐릭터로 복구
      checkUnlockConditions();
      setAppReady(true);
      await SplashScreen.hideAsync();
      void preloadAll();
      void bootMenuBgm();
      void preloadSceneImages();
      // void initAds().then(() => {
      //   preloadInterstitial();
      //   preloadRewardedAd();
      // });
      // void initPurchases(); // IAP 임시 비활성
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
    <>
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
    </>
  );
}
