import 'react-native-gesture-handler';
// i18n은 다른 모듈보다 먼저 평가되어야 한다 — import 위치를 위로 유지할 것
import i18n, { changeLanguage, i18nInitPromise, languageFromCaptureUrl } from '@/locales';

import { Rye_400Regular, useFonts } from '@expo-google-fonts/rye';
import { NanumMyeongjo_700Bold } from '@expo-google-fonts/nanum-myeongjo/700Bold';
import { Stack, usePathname, useRouter, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  InteractionManager,
  Platform,
  type AppStateStatus,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary';
import { OtaUpdatedToast } from '@/components/ui/OtaUpdatedToast';
import { StoreUpdateModal } from '@/components/ui/StoreUpdateModal';
import { AnimatedSplash } from '@/components/splash/AnimatedSplash';
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
import { initPurchasesOnBoot } from '@/utils/purchaseService';
import { challengeCodeFromUrl, challengeLinkAction } from '@/utils/challengeLink';
import { isActiveDuelRoute, isDuelFlowRoute, isInGameRoute } from '@/utils/duelRoutes';

void SplashScreen.preventAutoHideAsync().catch(() => {});

const I18N_STARTUP_BUDGET_MS = 2_000;
const FONT_STARTUP_BUDGET_MS = 2_000;
const OTA_COLD_START_BUDGET_MS = 2_500;
const HYDRATION_STARTUP_BUDGET_MS = 2_500;
const HERO_PRELOAD_BUDGET_MS = 1_000;

/**
 * expo-router 라우트 규약 — 이 레이아웃과 모든 하위 화면의 렌더 에러를 잡는 최종 방어선.
 * 여기까지 왔다는 건 화면을 그리지 못했다는 뜻이라, 흰 화면 대신 재시도 경로를 준다.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <AppErrorBoundary error={error} retry={retry} />;
}

function settleWithin<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(fallback);
    }, timeoutMs);
    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

/** zustand persist recovery. A timeout releases the splash without mutating defaults. */
function waitPersistHydrated(api: {
  hasHydrated: () => boolean;
  onFinishHydration: (cb: () => void) => () => void;
}, timeoutMs?: number): Promise<boolean> {
  if (api.hasHydrated()) return Promise.resolve(true);
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = api.onFinishHydration(() => {
      if (timer) clearTimeout(timer);
      unsub();
      resolve(true);
    });
    if (timeoutMs != null) {
      timer = setTimeout(() => {
        unsub();
        resolve(false);
      }, timeoutMs);
    }
  });
}

/** 스플래시를 내리기 전에 첫 프레임을 그릴 시간을 준다 — 배경 깜빡임 완화 */
function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/** 부팅 직후 사운드·광고·이미지 프리로드 — Android는 터치 반응 후로 미룬다 */
function scheduleBootSideEffects(): void {
  const run = () => {
    void preloadAll();
    void ensureGameAudioSession();
    warmupDuelSpeech();
    void bootMenuBgm();
    void preloadSceneImages();
    void initAds().then(() => {
      preloadInterstitial();
      preloadRewardedAd();
    });
    void initPurchasesOnBoot();
  };

  if (Platform.OS === 'android') {
    InteractionManager.runAfterInteractions(() => {
      setTimeout(run, 350);
    });
    return;
  }
  run();
}

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(i18n.isInitialized);

  useEffect(() => {
    if (i18n.isInitialized) {
      setI18nReady(true);
      return;
    }
    const timer = setTimeout(() => setI18nReady(true), I18N_STARTUP_BUDGET_MS);
    void i18nInitPromise.finally(() => {
      clearTimeout(timer);
      setI18nReady(true);
    });
    return () => clearTimeout(timer);
  }, []);

  if (!i18nReady) return null;

  return <RootLayoutContent />;
}

function RootLayoutContent() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  /** Latest challenge code received while a duel was in progress. */
  const pendingChallengeCodeRef = useRef<string | null>(null);

  const language = useSettingsStore((s) => s.language);
  const [fontsLoaded, fontError] = useFonts({
    Rye_400Regular,
    NanumMyeongjo_700Bold,
  });

  const [fontWaitExpired, setFontWaitExpired] = useState(false);
  useEffect(() => {
    if (fontsLoaded || fontError != null) return;
    const timer = setTimeout(() => setFontWaitExpired(true), FONT_STARTUP_BUDGET_MS);
    return () => clearTimeout(timer);
  }, [fontError, fontsLoaded]);
  const ready = fontsLoaded || fontError != null || fontWaitExpired;
  const [appReady, setAppReady] = useState(false);
  // JS 런타임의 첫 cold launch에서만 mount된다. resume 때는 RootLayout이 유지된다.
  const [animatedSplashVisible, setAnimatedSplashVisible] = useState(true);
  const [otaToastVisible, setOtaToastVisible] = useState(false);
  const [storeUpdateVisible, setStoreUpdateVisible] = useState(false);
  const hydrationRecoveryStartedRef = useRef(false);
  const hydratedMaintenanceDoneRef = useRef(false);

  useAutoScreenshotTour(appReady);

  const hideOtaToast = useCallback(() => setOtaToastVisible(false), []);
  const dismissStoreUpdate = useCallback(() => setStoreUpdateVisible(false), []);
  const dismissAnimatedSplash = useCallback(() => setAnimatedSplashVisible(false), []);

  const completeHydratedStartup = useCallback(async () => {
    if (hydratedMaintenanceDoneRef.current) return;
    if (!useProgressStore.persist.hasHydrated() || !useSettingsStore.persist.hasHydrated()) return;
    hydratedMaintenanceDoneRef.current = true;

    const bootUrl = await settleWithin(Linking.getInitialURL(), 1_000, null);
    const bootLang = languageFromCaptureUrl(bootUrl);
    if (bootLang) {
      useSettingsStore.getState().setLanguage(bootLang);
      changeLanguage(bootLang);
    }

    // Never inspect or back up defaults before both stores finished hydration.
    await restoreProgressIfEmpty().catch(() => {});
    startProgressAutoBackup();
    checkUnlockConditions();
  }, []);

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
      if (lang) {
        useSettingsStore.getState().setLanguage(lang);
        changeLanguage(lang);
      }

      const code = challengeCodeFromUrl(url);
      if (!code) return;
      if (isDuelFlowRoute(pathnameRef.current)) {
        pendingChallengeCodeRef.current = code;
        return;
      }
      openChallengeLink(router, pathnameRef.current, code);
    };

    void Linking.getInitialURL().then(apply);
    const sub = Linking.addEventListener('url', ({ url }) => apply(url));
    return () => sub.remove();
  }, [appReady, router]);

  /** Deliver a challenge link held during a duel once the player is back on a menu. */
  useEffect(() => {
    if (!appReady) return;
    const code = pendingChallengeCodeRef.current;
    if (!code || isDuelFlowRoute(pathname)) return;
    pendingChallengeCodeRef.current = null;
    openChallengeLink(router, pathname, code);
  }, [appReady, pathname, router]);

  useEffect(() => {
    // Keep menus, previews and duels in the same upright orientation.
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const so: typeof import('expo-screen-orientation') = require('expo-screen-orientation');
      void so.lockAsync(so.OrientationLock.PORTRAIT_UP).catch(() => {});
    } catch {
      // 네이티브 모듈 미포함 빌드
    }
  }, [pathname]);

  /** 백그라운드 → 포그라운드 복귀 시 OTA 확인·즉시 reload (결투 중 제외) */
  useEffect(() => {
    if (!appReady) return;

    const onAppState = (next: AppStateStatus) => {
      if (next !== 'active') return;
      if (isActiveDuelRoute(pathnameRef.current)) return;
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
        justUpdated = await settleWithin(consumeOtaJustApplied(), 500, false);
        if (cancelled) return;

        handOffToReload = await applyOtaUpdateIfAvailable({
          force: true,
          timeoutMs: OTA_COLD_START_BUDGET_MS,
        });
        if (handOffToReload || cancelled) return;

        const [, hydration] = await Promise.all([
          settleWithin(preloadTitleHero(), HERO_PRELOAD_BUDGET_MS, undefined),
          Promise.all([
            waitPersistHydrated(useProgressStore.persist, HYDRATION_STARTUP_BUDGET_MS),
            waitPersistHydrated(useSettingsStore.persist, HYDRATION_STARTUP_BUDGET_MS),
          ]),
        ]);
        if (cancelled) return;

        if (hydration.every(Boolean)) {
          void completeHydratedStartup();
        } else if (!hydrationRecoveryStartedRef.current) {
          // Show the app with in-memory defaults, but do not persist/inspect them.
          // If storage recovers later, finish restoration and backup safely then.
          hydrationRecoveryStartedRef.current = true;
          void Promise.all([
            waitPersistHydrated(useProgressStore.persist),
            waitPersistHydrated(useSettingsStore.persist),
          ]).then(() => completeHydratedStartup());
        }
      } catch (err) {
        // 준비 단계 실패가 부팅 자체를 막아선 안 된다. 프리로드는 없어도 플레이는 가능.
        if (__DEV__) console.warn('[boot] prepare 실패 — 스플래시는 내리고 진행:', err);
      } finally {
        if (!handOffToReload) {
          if (!cancelled) {
            setAppReady(true);
            if (justUpdated) setOtaToastVisible(true);
          }
          // 첫 화면 레이아웃 → 스플래시 내림 순서로 작은 배경 깜빡임 완화
          await settleWithin(waitForNextFrame(), 250, undefined);
          void SplashScreen.hideAsync().catch(() => {});
          scheduleBootSideEffects();
        }
      }
    }

    void prepare();

    return () => {
      cancelled = true;
    };
  }, [completeHydratedStartup, ready]);

  if (!ready || !appReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" hidden={isInGameRoute(pathname)} />
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
        <Stack.Screen
          name="npc-select"
          options={{ title: t('nav.npcSelect'), headerTitleAlign: 'center' }}
        />
        <Stack.Screen
          name="local-setup"
          options={{ title: t('nav.localSetup'), headerTitleAlign: 'center' }}
        />
        <Stack.Screen
          name="stats"
          options={{ title: t('nav.stats'), headerTitleAlign: 'center' }}
        />
        <Stack.Screen
          name="settings"
          options={{ title: t('menu.settings'), headerTitleAlign: 'center' }}
        />
        <Stack.Screen
          name="character-select"
          options={{ title: t('nav.character'), headerTitleAlign: 'center' }}
        />
        <Stack.Screen name="game" options={{ headerShown: false }} />
        <Stack.Screen name="capture" options={{ headerShown: false }} />
        <Stack.Screen name="result" options={{ headerShown: false }} />
        <Stack.Screen name="ranking" options={{ headerShown: false }} />
      </Stack>
      <OtaUpdatedToast visible={otaToastVisible} onHidden={hideOtaToast} />
      <StoreUpdateModal visible={storeUpdateVisible} onDismiss={dismissStoreUpdate} />
      {animatedSplashVisible ? <AnimatedSplash onComplete={dismissAnimatedSplash} /> : null}
    </SafeAreaProvider>
  );
}

/** A challenge link never stacks a second challenge screen on top of one. */
function openChallengeLink(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  code: string,
): void {
  if (challengeLinkAction(pathname) === 'update') {
    router.setParams({ code });
    return;
  }
  router.push({ pathname: '/ranking/challenge', params: { code } } as never);
}
