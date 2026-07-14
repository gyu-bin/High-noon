import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { useProgressStore } from '@/store/progressStore';

/** Expo Go / 웹에는 네이티브 AdMob이 없어 정적 import 시 크래시 */
const USE_NATIVE_ADS =
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
    ios: 'ca-app-pub-3940256099942544/4411468910',
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

/** N매치마다 전면 노출 (승패 무관) */
const MATCHES_PER_INTERSTITIAL = 5;
/** 직전 전면을 닫은 뒤 다시 노출하기까지 최소 대기 (ms) — 세이프가드 */
const STAGE_AD_COOLDOWN_MS = 3 * 60 * 1000;

let lastStageInterstitialClosedAt = 0;
let matchesSinceLastAd = 0;

/** 보상형 광고 인스턴스 */
let rewarded: ReturnType<AdsLib['RewardedAd']['createForAdRequest']> | null = null;

function getProductionRewardedUnitId(): string {
  return Platform.select({
    ios: 'ca-app-pub-3940256099942544/1712485313',
    android: 'ca-app-pub-3940256099942544/5224354917',
    default: 'ca-app-pub-3940256099942544/5224354917',
  })!;
}

function getRewardedUnitId(lib: AdsLib): string {
  if (__DEV__) return lib.TestIds.REWARDED;
  return getProductionRewardedUnitId();
}

export async function initAds(): Promise<void> {
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

/**
 * 매치 완료(승·패 무관) 후 호출. 5매치마다 전면 광고 노출.
 * - `progressStore.isAdFree === true`이면 즉시 resolve (스킵).
 * - 카운터가 임계값에 도달했을 때만 표시. 도달 안 하면 즉시 resolve.
 * - 안전장치로 짧은 쿨다운(3분)도 검사.
 * - 실제로 표시된 뒤 `CLOSED`에서 카운터·쿨다운 갱신. 로드/표시 실패는 카운터 유지.
 */
export function showStageCompleteAd(): Promise<void> {
  if (useProgressStore.getState().isAdFree) {
    return Promise.resolve();
  }

  matchesSinceLastAd += 1;
  if (matchesSinceLastAd < MATCHES_PER_INTERSTITIAL) {
    return Promise.resolve();
  }

  const now = Date.now();
  if (now - lastStageInterstitialClosedAt < STAGE_AD_COOLDOWN_MS) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const finish = () => {
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
          ad.removeAllListeners();
          ad.addAdEventListener(AdEventType.CLOSED, finishAfterClosed);
          ad.addAdEventListener(AdEventType.ERROR, finish);
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
 */
export function showRewardedAd(): Promise<boolean> {
  if (useProgressStore.getState().isAdFree) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let earned = false;

    const finish = (result: boolean) => {
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
          ad.removeAllListeners();
          ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
            earned = true;
          });
          ad.addAdEventListener(AdEventType.CLOSED, () => finish(earned));
          ad.addAdEventListener(AdEventType.ERROR, () => finish(false));
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
