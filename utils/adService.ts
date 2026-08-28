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
/** 로드 완료된 라이브러리 동기 참조 — 노출 판단에 await를 끼우지 않기 위함 */
let adsLib: AdsLib | null = null;

async function getAdsLib(): Promise<AdsLib | null> {
  if (!USE_NATIVE_ADS) return null;
  if (!adsLibPromise) {
    adsLibPromise = import('react-native-google-mobile-ads')
      .then((mod) => {
        adsLib = mod;
        return mod;
      })
      .catch(() => null);
  }
  return adsLibPromise;
}

/** 프로덕션 전면 광고 유닛 (AdMob 콘솔 발급값). `__DEV__`에서는 TestIds로 대체된다. */
function getProductionInterstitialUnitId(): string {
  return Platform.select({
    ios: 'ca-app-pub-2202662035854210/5547432578',
    android: 'ca-app-pub-2202662035854210/8204516938',
    // 웹·기타 플랫폼은 USE_NATIVE_ADS가 false라 실제로 도달하지 않는 분기
    default: 'ca-app-pub-2202662035854210/8204516938',
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

/** 전면 노출 주기 — N번째 매치 완료마다 1회 (승패 무관) */
const MATCHES_PER_INTERSTITIAL = 2;
/** 연속 전면 최소 간격. 한 판이 수 초인 게임이라 주기만으로는 간격이 너무 좁다 */
const STAGE_AD_COOLDOWN_MS = 60_000;

let lastStageInterstitialClosedAt = 0;
let matchesSinceLastAd = 0;
/**
 * 전면 노출 플로우가 인스턴스를 점유 중인지 여부.
 * 점유 중에 preload가 인스턴스를 교체하면 표시 중인 광고의 CLOSED 리스너가
 * 사라져 결과 화면이 로딩 상태로 멈춘다.
 */
let interstitialBusy = false;

/** 보상형 광고 인스턴스 */
let rewarded: ReturnType<AdsLib['RewardedAd']['createForAdRequest']> | null = null;
/** 보상형도 동일 — 표시/대기 중 교체 금지 */
let rewardedBusy = false;

function getProductionRewardedUnitId(): string {
  return Platform.select({
    ios: 'ca-app-pub-2202662035854210/2394655629',
    android: 'ca-app-pub-2202662035854210/8411516012',
    default: 'ca-app-pub-2202662035854210/8411516012',
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
 * 전면 광고 미리 로드. 앱 부팅 시 또는 전면 종료 직후 호출.
 * - 노출 플로우가 인스턴스를 쓰는 중이면 아무것도 하지 않는다.
 * - 이미 로드된 광고가 있으면 재생성하지 않는다(재생성 = 처음부터 다시 로드 = 대기 시간).
 */
export function preloadInterstitial(): void {
  if (!ADS_ENABLED) return;
  void initAds().then(async () => {
    const lib = await getAdsLib();
    if (!lib) return;
    if (interstitialBusy) return;
    if (interstitial?.loaded) return;
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
/** AppState가 active로 돌아온 뒤 grace period (ms) — CLOSED가 먼저 도착할 여유만 준다 */
const AD_FOREGROUND_GRACE_MS = 250;
/** 보상형 로드 대기 최대 시간 (ms) — 유저가 직접 "광고 보기"를 누른 경우에만 적용 */
const REWARDED_LOAD_TIMEOUT_MS = 6000;

/**
 * 매치 완료(승·패 무관) 후 호출. `MATCHES_PER_INTERSTITIAL`판마다,
 * 직전 전면이 닫힌 지 `STAGE_AD_COOLDOWN_MS` 이상 지났을 때만 노출.
 *
 * **유저를 광고 때문에 기다리게 하지 않는 것이 최우선.**
 * - 노출 조건 판단은 전부 동기 — await로 결과 화면을 붙잡지 않는다.
 * - 이미 로드된 광고가 없으면 그냥 건너뛰고 다음 기회를 위해 로드만 걸어둔다.
 * - 표시 실패·CLOSED 미발생 시에도 타임아웃/AppState fallback으로 반드시 resolve.
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

  const lib = adsLib;
  const ad = interstitial;

  // 준비된 광고가 없으면 절대 기다리지 않는다 — 이번 판은 건너뛰고 다음 판을 위해 로드만 시작.
  // (matchesSinceLastAd는 유지되므로 다음 매치에서 다시 시도한다)
  if (!lib || !ad?.loaded) {
    preloadInterstitial();
    return Promise.resolve();
  }

  // preload가 인스턴스를 갈아치우지 못하도록 동기적으로 점유를 선언한다.
  interstitialBusy = true;

  return new Promise((resolve) => {
    let resolved = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
    let adShown = false;
    /** 광고 표시로 앱이 foreground를 벗어난 적이 있는지 */
    let leftForeground = false;

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
      interstitialBusy = false;
      preloadInterstitial();
      resolve();
    };

    const finishAfterClosed = () => {
      lastStageInterstitialClosedAt = Date.now();
      matchesSinceLastAd = 0;
      finish();
    };

    try {
      const { AdEventType } = lib;

      ad.removeAllListeners();
      ad.addAdEventListener(AdEventType.CLOSED, finishAfterClosed);
      ad.addAdEventListener(AdEventType.ERROR, finish);

      adShown = true;

      // 광고 표시 후 타임아웃 — CLOSED 이벤트 미발생 대비
      timeoutId = setTimeout(() => {
        if (!resolved) {
          finishAfterClosed();
        }
      }, AD_SHOW_TIMEOUT_MS);

      // AppState 감지 — 광고로 앱이 내려갔다가 돌아온 경우에만 완료 처리.
      // (표시 직후의 inactive→active 전환을 광고 종료로 오인하면 광고 뒤에서 결과가 재생된다)
      appStateSubscription = AppState.addEventListener('change', (nextState) => {
        if (nextState !== 'active') {
          leftForeground = true;
          return;
        }
        if (!leftForeground || !adShown || resolved) return;
        setTimeout(() => {
          if (!resolved) {
            finishAfterClosed();
          }
        }, AD_FOREGROUND_GRACE_MS);
      });

      void ad.show().catch(finish);
    } catch {
      finish();
    }
  });
}

/** 보상형 광고 미리 로드. 앱 부팅 시 또는 close 직후 호출. */
export function preloadRewardedAd(): void {
  if (!ADS_ENABLED) return;
  void initAds().then(async () => {
    const lib = await getAdsLib();
    if (!lib) return;
    if (rewardedBusy) return;
    if (rewarded?.loaded) return;
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

  rewardedBusy = true;

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
      rewardedBusy = false;
      preloadRewardedAd();
      resolve(result);
    };

    /** 로드 대기 포기 — 진행 중인 로드는 살려둔다 */
    const finishKeepingLoad = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      rewardedBusy = false;
      resolve(false);
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

          if (timeoutId) clearTimeout(timeoutId);
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

        // 보상형은 유저가 "광고 보기"를 누른 상태라 조금 더 기다려 주되, 무한 대기는 막는다.
        timeoutId = setTimeout(finishKeepingLoad, REWARDED_LOAD_TIMEOUT_MS);
        // 보상형은 AdEventType.LOADED를 쓰면 라이브러리가 throw 한다. (RewardedAdEventType.LOADED 사용)
        ad.addAdEventListener(RewardedAdEventType.LOADED, present);
        ad.addAdEventListener(AdEventType.ERROR, () => finish(false));
      } catch {
        finish(false);
      }
    });
  });
}
