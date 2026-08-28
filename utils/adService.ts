import Constants, { ExecutionEnvironment } from 'expo-constants';
import { AppState, Platform } from 'react-native';

import { useProgressStore } from '@/store/progressStore';

/**
 * 광고 ON/OFF.
 * 끌 때 false + `_layout` 의 initAds/preload 호출 주석.
 */
export const ADS_ENABLED = true;

/** Expo Go / 웹에는 네이티브 AdMob이 없어 정적 import 시 크래시 */
const USE_NATIVE_ADS =
  ADS_ENABLED &&
  Platform.OS !== 'web' &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

type AdsLib = typeof import('react-native-google-mobile-ads');

let adsLibPromise: Promise<AdsLib | null> | null = null;

async function getAdsLib(): Promise<AdsLib | null> {
  if (!USE_NATIVE_ADS) return null;
  if (!adsLibPromise) {
    adsLibPromise = import('react-native-google-mobile-ads').catch(() => null);
  }
  return adsLibPromise;
}

/** 프로덕션 전면 광고 유닛 — 실제 AdMob 콘솔 값으로 교체 */
function getProductionInterstitialUnitId(): string {
  return Platform.select({
    ios: 'ca-app-pub-2202662035854210/5547432578',
    android: 'ca-app-pub-3940256099942544/1033173712',
    default: 'ca-app-pub-3940256099942544/1033173712',
  })!;
}

function getInterstitialUnitId(lib: AdsLib): string {
  if (__DEV__) {
    return lib.TestIds.INTERSTITIAL;
  }
  return getProductionInterstitialUnitId();
}

let initialized = false;
/** 동적 로드된 전면 인스턴스 (타입은 런타임만 사용) */
let interstitial: ReturnType<AdsLib['InterstitialAd']['createForAdRequest']> | null = null;

/** 매치마다 전면 노출 (승패 무관) */
const MATCHES_PER_INTERSTITIAL = 1;
/** 연속 전면 최소 간격 — 매판 노출이므로 쿨다운 없음 */
const STAGE_AD_COOLDOWN_MS = 0;

let lastStageInterstitialClosedAt = 0;
let matchesSinceLastAd = 0;

/** 보상형 광고 인스턴스 */
let rewarded: ReturnType<AdsLib['RewardedAd']['createForAdRequest']> | null = null;

function getProductionRewardedUnitId(): string {
  return Platform.select({
    ios: 'ca-app-pub-2202662035854210/2394655629',
    android: 'ca-app-pub-3940256099942544/5224354917',
    default: 'ca-app-pub-3940256099942544/5224354917',
  })!;
}

function getRewardedUnitId(lib: AdsLib): string {
  if (__DEV__) return lib.TestIds.REWARDED;
  return getProductionRewardedUnitId();
}

export async function initAds(): Promise<void> {
  if (!ADS_ENABLED) {
    initialized = true;
    return;
  }
  if (initialized) return;
  const lib = await getAdsLib();
  if (lib) {
    try {
      await lib.MobileAds().initialize();
    } catch {
      // 네이티브 미연동 등
    }
  }
  initialized = true;
}

/**
 * 전면 광고 미리 로드. 매치 진입 시 또는 전면 종료 직후 호출.
 */
export function preloadInterstitial(): void {
  if (!ADS_ENABLED) return;
  void initAds().then(async () => {
    const lib = await getAdsLib();
    if (!lib) return;
    try {
      interstitial?.removeAllListeners();
      interstitial = lib.InterstitialAd.createForAdRequest(getInterstitialUnitId(lib));
      interstitial.load();
    } catch {
      interstitial = null;
    }
  });
}

/** 광고 표시 후 CLOSED 이벤트가 오지 않을 경우 대비 타임아웃 (ms) */
const AD_SHOW_TIMEOUT_MS = 30000;
/** AppState가 active로 돌아온 뒤 grace period (ms) */
const AD_FOREGROUND_GRACE_MS = 1500;

/**
 * 매치 완료(승·패 무관) 후 호출. 매 판마다 전면 광고 노출.
 * - `progressStore.isAdFree === true`이면 즉시 resolve (스킵).
 * - 로드/표시 실패 시에도 resolve 해서 결과 화면은 진행.
 * - 닫힌 뒤 다음 전면을 미리 로드.
 * - 타임아웃 및 AppState fallback으로 무한 대기 방지.
 */
export function showStageCompleteAd(): Promise<void> {
  if (!ADS_ENABLED || useProgressStore.getState().isAdFree) {
    return Promise.resolve();
  }

  matchesSinceLastAd += 1;
  if (matchesSinceLastAd < MATCHES_PER_INTERSTITIAL) {
    return Promise.resolve();
  }

  if (STAGE_AD_COOLDOWN_MS > 0) {
    const now = Date.now();
    if (now - lastStageInterstitialClosedAt < STAGE_AD_COOLDOWN_MS) {
      return Promise.resolve();
    }
  }

  return new Promise((resolve) => {
    let resolved = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
    let adShown = false;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (appStateSubscription) {
        appStateSubscription.remove();
        appStateSubscription = null;
      }
    };

    const finish = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      preloadInterstitial();
      resolve();
    };

    const finishAfterClosed = () => {
      lastStageInterstitialClosedAt = Date.now();
      matchesSinceLastAd = 0;
      finish();
    };

    void initAds().then(async () => {
      const lib = await getAdsLib();
      if (!lib) {
        finish();
        return;
      }

      try {
        if (!interstitial) {
          interstitial = lib.InterstitialAd.createForAdRequest(getInterstitialUnitId(lib));
          interstitial.load();
        }

        const ad = interstitial;
        const { AdEventType } = lib;

        const present = () => {
          if (resolved) return;

          ad.removeAllListeners();
          ad.addAdEventListener(AdEventType.CLOSED, finishAfterClosed);
          ad.addAdEventListener(AdEventType.ERROR, finish);

          adShown = true;

          // 광고 표시 후 타임아웃 설정 — CLOSED 이벤트 미발생 대비
          timeoutId = setTimeout(() => {
            if (!resolved) {
              finishAfterClosed();
            }
          }, AD_SHOW_TIMEOUT_MS);

          // AppState 감지 — 앱이 foreground로 돌아오면 grace period 후 완료
          appStateSubscription = AppState.addEventListener('change', (nextState) => {
            if (nextState === 'active' && adShown && !resolved) {
              setTimeout(() => {
                if (!resolved) {
                  finishAfterClosed();
                }
              }, AD_FOREGROUND_GRACE_MS);
            }
          });

          void ad.show().catch(finish);
        };

        if (ad.loaded) {
          present();
          return;
        }

        ad.addAdEventListener(AdEventType.LOADED, present);
        ad.addAdEventListener(AdEventType.ERROR, finish);
      } catch {
        finish();
      }
    });
  });
}

/** 보상형 광고 미리 로드. 앱 부팅 시 또는 close 직후 호출. */
export function preloadRewardedAd(): void {
  if (!ADS_ENABLED) return;
  void initAds().then(async () => {
    const lib = await getAdsLib();
    if (!lib) return;
    try {
      rewarded?.removeAllListeners();
      rewarded = lib.RewardedAd.createForAdRequest(getRewardedUnitId(lib));
      rewarded.load();
    } catch {
      rewarded = null;
    }
  });
}

/**
 * 보상형 광고 표시. 유저가 광고를 끝까지 시청해 리워드를 받으면 `true`.
 * - 광고 스킵·에러·미로드 등은 `false`.
 * - `isAdFree`이면 무조건 `true` (광고 제거 유저에게도 리워드 부여).
 * - CLOSED 이벤트 미발생·앱 복귀 등에도 resolve (무한 "광고 준비 중" 방지).
 */
export function showRewardedAd(): Promise<boolean> {
  // 광고 비활성 시에도 리워드 플로우는 막지 않음 (시청 성공과 동일 처리)
  if (!ADS_ENABLED || useProgressStore.getState().isAdFree) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let earned = false;
    let resolved = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const finish = (result: boolean) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      preloadRewardedAd();
      resolve(result);
    };

    void initAds().then(async () => {
      const lib = await getAdsLib();
      if (!lib) {
        finish(false);
        return;
      }

      try {
        if (!rewarded) {
          rewarded = lib.RewardedAd.createForAdRequest(getRewardedUnitId(lib));
          rewarded.load();
        }

        const ad = rewarded;
        const { RewardedAdEventType, AdEventType } = lib;

        const present = () => {
          if (resolved) return;

          ad.removeAllListeners();
          ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
            earned = true;
          });
          ad.addAdEventListener(AdEventType.CLOSED, () => finish(earned));
          ad.addAdEventListener(AdEventType.ERROR, () => finish(false));

          timeoutId = setTimeout(() => {
            if (!resolved) {
              finish(earned);
            }
          }, AD_SHOW_TIMEOUT_MS);

          void ad.show().catch(() => finish(false));
        };

        if (ad.loaded) {
          present();
          return;
        }

        ad.addAdEventListener(AdEventType.LOADED, present);
        ad.addAdEventListener(AdEventType.ERROR, () => finish(false));
      } catch {
        finish(false);
      }
    });
  });
}
