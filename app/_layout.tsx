import 'react-native-gesture-handler';
// i18n은 다른 모듈보다 먼저 평가되어야 한다 — import 위치를 위로 유지할 것
import i18n, { changeLanguage, i18nInitPromise, languageFromCaptureUrl } from '@/locales';

import { Rye_400Regular, useFonts } from '@expo-google-fonts/rye';
import { Stack, usePathname, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary';
import { OtaUpdatedToast } from '@/components/ui/OtaUpdatedToast';
import { StoreUpdateModal } from '@/components/ui/StoreUpdateModal';
import { useProgressStore } from '@/store/progressStore';
import {
  restoreProgressIfEmpty,
  startProgressAutoBackup,
} from '@/utils/progressAutoBackup';
import { useSettingsStore } from '@/store/settingsStore';
import { colors } from '@/constants/theme';
import { useAutoScreenshotTour } from '@/hooks/useAutoScreenshotTour';
import { checkUnlockConditions } from '@/utils/characterAbility';
import { WESTERN_HERO_FALLBACK } from '@/constants/westernBackground';
import { initAds, preloadInterstitial, preloadRewardedAd } from '@/utils/adService';
import { preloadAll, ensureGameAudioSession } from '@/utils/audioService';
import { bootMenuBgm } from '@/utils/bgmService';
import { warmupDuelSpeech } from '@/utils/duelSignalSpeech';
import { applyOtaUpdateIfAvailable } from '@/utils/otaApply';
import { consumeOtaJustApplied } from '@/utils/otaUpdateFlag';
import { preloadSceneImages, preloadTitleHero } from '@/utils/preloadSceneImages';
import { isStoreUpdateRequired } from '@/utils/storeUpdate';
import { initPurchases } from '@/utils/purchaseService';

void SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * expo-router 라우트 규약 — 이 레이아웃과 모든 하위 화면의 렌더 에러를 잡는 최종 방어선.
 * 여기까지 왔다는 건 화면을 그리지 못했다는 뜻이라, 흰 화면 대신 재시도 경로를 준다.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <AppErrorBoundary error={error} retry={retry} />;
}

/** zustand persist가 AsyncStorage에서 복구될 때까지 대기 */
function waitPersistHydrated(api: {
  hasHydrated: () => boolean;
  onFinishHydration: (cb: () => void) => () => void;
}): Promise<void> {
  if (api.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = api.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

function isInGameRoute(pathname: string): boolean {
  return pathname === '/game' || pathname.startsWith('/game/');
}

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(i18n.isInitialized);

  useEffect(() => {
    if (i18n.isInitialized) {
      setI18nReady(true);
      return;
    }
    void i18nInitPromise.then(() => setI18nReady(true));
  }, []);

  if (!i18nReady) return null;

  return <RootLayoutContent />;
}

function RootLayoutContent() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const language = useSettingsStore((s) => s.language);
  const [fontsLoaded, fontError] = useFonts({
    Rye_400Regular,
  });

  const ready = fontsLoaded || fontError != null;
  const [appReady, setAppReady] = useState(false);
  const [otaToastVisible, setOtaToastVisible] = useState(false);
  const [storeUpdateVisible, setStoreUpdateVisible] = useState(false);

  useAutoScreenshotTour(appReady);

  const hideOtaToast = useCallback(() => setOtaToastVisible(false), []);
  const dismissStoreUpdate = useCallback(() => setStoreUpdateVisible(false), []);

  useEffect(() => {
    if (!appReady) return;
    if (isStoreUpdateRequired()) {
      setStoreUpdateVisible(true);
    }
  }, [appReady]);

  useEffect(() => {
    changeLanguage(language);
  }, [language]);

  /** 캡처 딥링크 `?lang=en|ja|ko` — persist 복구 뒤에 앱 번역을 켠다. */
  useEffect(() => {
    if (!appReady) return;

    const apply = (url: string | null) => {
      const lang = languageFromCaptureUrl(url);
      if (!lang) return;
      useSettingsStore.getState().setLanguage(lang);
      changeLanguage(lang);
    };

    void Linking.getInitialURL().then(apply);
    const sub = Linking.addEventListener('url', ({ url }) => apply(url));
    return () => sub.remove();
  }, [appReady]);

  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const so: typeof import('expo-screen-orientation') = require('expo-screen-orientation');
      void so.unlockAsync().catch(() => {});
    } catch {
      // 네이티브 모듈 미포함 빌드
    }
  }, []);

  /** 백그라운드 → 포그라운드 복귀 시 OTA 확인·즉시 reload (결투 중 제외) */
  useEffect(() => {
    if (!appReady) return;

    const onAppState = (next: AppStateStatus) => {
      if (next !== 'active') return;
      if (isInGameRoute(pathnameRef.current)) return;
      void applyOtaUpdateIfAvailable();
    };

    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [appReady]);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    /**
     * 부팅 준비. 어떤 단계가 던지더라도 스플래시에 갇히지 않는 것이 최우선이라
     * 화면 진입(setAppReady + hideAsync)은 finally에서 처리한다.
     * 유일한 예외는 OTA 적용 후 reloadAsync 대기 — 이때는 곧 재시작하므로
     * 스플래시를 유지한 채 넘긴다.
     */
    async function prepare() {
      let handOffToReload = false;
      let justUpdated = false;

      try {
        // 재시작 직후 플래그 — 앱 진입 후 하단 작은 토스트만
        justUpdated = await consumeOtaJustApplied();
        if (cancelled) return;

        handOffToReload = await applyOtaUpdateIfAvailable({ force: true });
        if (handOffToReload || cancelled) return;

        await preloadTitleHero();
        if (cancelled) return;

        // hydration 전에 해금 동기화하면 기본 진행도가 AsyncStorage를 덮어씀 (OTA 재기동 시 특히)
        await Promise.all([
          waitPersistHydrated(useProgressStore.persist),
          waitPersistHydrated(useSettingsStore.persist),
        ]);
        if (cancelled) return;

        const bootLang = languageFromCaptureUrl(await Linking.getInitialURL());
        if (bootLang) {
          useSettingsStore.getState().setLanguage(bootLang);
          changeLanguage(bootLang);
        }

        // 앱을 지웠다 다시 깐 경우 키체인 스냅샷에서 조용히 되살린다.
        // hydration 이후여야 한다 — 그 전이면 아직 안 읽힌 진행도를 비었다고 오판한다.
        await restoreProgressIfEmpty();
        if (cancelled) return;
        startProgressAutoBackup();

        checkUnlockConditions();
      } catch (err) {
        // 준비 단계 실패가 부팅 자체를 막아선 안 된다. 프리로드는 없어도 플레이는 가능.
        if (__DEV__) console.warn('[boot] prepare 실패 — 스플래시는 내리고 진행:', err);
      } finally {
        if (!handOffToReload) {
          if (!cancelled) {
            setAppReady(true);
            if (justUpdated) setOtaToastVisible(true);
          }
          // 언마운트됐더라도 스플래시는 전역 상태이므로 반드시 내린다
          await SplashScreen.hideAsync().catch(() => {});
          void preloadAll();
          void ensureGameAudioSession();
          warmupDuelSpeech();
          void bootMenuBgm();
          void preloadSceneImages();
          void initAds().then(() => {
            preloadInterstitial();
            preloadRewardedAd();
          });
          void initPurchases();
        }
      }
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
          headerBackTitle: t('common.back'),
          contentStyle: { backgroundColor: WESTERN_HERO_FALLBACK },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="menu" options={{ headerShown: false }} />
        <Stack.Screen name="npc-select" options={{ title: t('nav.npcSelect') }} />
        <Stack.Screen name="local-setup" options={{ title: t('nav.localSetup') }} />
        <Stack.Screen name="stats" options={{ title: t('nav.stats') }} />
        <Stack.Screen name="character-select" options={{ title: t('nav.character') }} />
        <Stack.Screen name="game" options={{ headerShown: false }} />
        <Stack.Screen name="capture" options={{ headerShown: false }} />
        <Stack.Screen name="result" options={{ headerShown: false }} />
        <Stack.Screen name="ranking" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack>
      <OtaUpdatedToast visible={otaToastVisible} onHidden={hideOtaToast} />
      <StoreUpdateModal visible={storeUpdateVisible} onDismiss={dismissStoreUpdate} />
    </SafeAreaProvider>
  );
}
