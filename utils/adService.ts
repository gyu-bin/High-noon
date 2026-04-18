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

/** 승리 1회당 전면을 시도할 확률 (0~1). 낮을수록 덜 나옵니다. */
const STAGE_AD_SHOW_PROBABILITY = 0.2;
/** 직전 전면을 닫은 뒤 다시 노출하기까지 최소 대기 (ms) */
const STAGE_AD_COOLDOWN_MS = 10 * 60 * 1000;

let lastStageInterstitialClosedAt = 0;

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
 * 스테이지 클리어(승리) 후 전면 광고.
 * - `progressStore.isAdFree === true`이면 즉시 resolve (스킵).
 * - 쿨다운·확률로 노출 빈도 제한 (대부분의 승리에서는 광고 없음).
 * - 실제로 표시된 뒤 `CLOSED`에서만 쿨다운 갱신. 로드/표시 실패는 쿨다운 없음.
 * - CLOSED / ERROR에서 resolve 후 `preloadInterstitial`.
 *
 * 호출 측에서 **승리 시에만** 호출할 것 (패배 시 호출하지 않음).
 */
export function showStageCompleteAd(): Promise<void> {
  if (useProgressStore.getState().isAdFree) {
    return Promise.resolve();
  }

  const now = Date.now();
  if (now - lastStageInterstitialClosedAt < STAGE_AD_COOLDOWN_MS) {
    return Promise.resolve();
  }
  if (Math.random() > STAGE_AD_SHOW_PROBABILITY) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const finish = () => {
      preloadInterstitial();
      resolve();
    };

    const finishAfterClosed = () => {
      lastStageInterstitialClosedAt = Date.now();
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
