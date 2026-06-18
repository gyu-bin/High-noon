import 'react-native-gesture-handler';

import { Rye_400Regular, useFonts } from '@expo-google-fonts/rye';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { colors } from '@/constants/theme';
import { WESTERN_HERO_FALLBACK } from '@/constants/westernBackground';
import { initAds, preloadInterstitial } from '@/utils/adService';
import { preloadAll } from '@/utils/audioService';
import { preloadBgm, bootMenuBgm } from '@/utils/bgmService';
// import { initPurchases } from '@/utils/purchaseService';
import { preloadSceneImages, preloadTitleHero } from '@/utils/preloadSceneImages';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Rye_400Regular,
  });

  const ready = fontsLoaded || fontError != null;
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    async function prepare() {
      await preloadTitleHero();
      if (cancelled) return;
      setAppReady(true);
      await SplashScreen.hideAsync();
      void preloadAll();
      void bootMenuBgm();
      void preloadSceneImages();
      void initAds().then(() => preloadInterstitial());
      // void initPurchases();
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
        <Stack.Screen name="npc-select" options={{ title: 'NPC 선택' }} />
        <Stack.Screen name="local-setup" options={{ title: '2인 대결' }} />
        <Stack.Screen name="stats" options={{ title: '기록' }} />
        <Stack.Screen name="character-select" options={{ title: '캐릭터' }} />
        <Stack.Screen name="duel" options={{ title: '결투', headerShown: true }} />
        <Stack.Screen name="game" options={{ headerShown: false }} />
        <Stack.Screen name="result" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
