/**
 * 인앱 결제 (react-native-iap 기반) — 광고 제거 IAP 하나만 지원.
 *
 * 사용 흐름:
 *   1) 앱 부팅: `initPurchases()` 호출로 스토어 연결 + 이전 구매 복원 확인
 *   2) 유저가 "광고 제거" 버튼 탭: `purchaseAdRemoval()` → 스토어 결제 UI 표시
 *   3) 결제 성공 → 리스너가 `progressStore.setAdFree(true)` + `finishTransaction()`
 *   4) 기기 변경 등에서 "구매 복원" 탭: `restorePurchases()` → 이전 결제 다시 활성화
 *
 * Expo Go / 웹 등 네이티브 미탑재 환경에서는 모든 함수가 즉시 false/no-op.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { useProgressStore } from '@/store/progressStore';

/** iOS · Android 공통 상품 ID (스토어 콘솔에도 이 ID로 등록해야 함) */
export const AD_REMOVAL_PRODUCT_ID = 'com.highnoon.app.remove_ads';

/** 하위 호환용 export (기존 stub이 쓰던 것) */
export const HIGH_NOON_PRO_ENTITLEMENT_ID = 'High noon Pro';
export const STORE_PRODUCT_IDS = { lifetime: AD_REMOVAL_PRODUCT_ID } as const;
export type HighNoonStoreProductId = keyof typeof STORE_PRODUCT_IDS;

const USE_NATIVE_IAP =
  Platform.OS !== 'web' &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

type IapLib = typeof import('react-native-iap');

let iapLibPromise: Promise<IapLib | null> | null = null;
let initialized = false;
let purchaseListener: { remove: () => void } | null = null;
let errorListener: { remove: () => void } | null = null;

async function getIapLib(): Promise<IapLib | null> {
  if (!USE_NATIVE_IAP) return null;
  if (!iapLibPromise) {
    iapLibPromise = import('react-native-iap').catch(() => null);
  }
  return iapLibPromise;
}

export function purchasesRuntimeEnabled(): boolean {
  return USE_NATIVE_IAP;
}

/** 앱 부팅 시 1회 호출 — 스토어 연결 + 결제 리스너 등록 + 잔존 구매 활성화 */
export async function initPurchases(): Promise<void> {
  if (initialized) return;
  const lib = await getIapLib();
  if (!lib) return;

  try {
    await lib.initConnection();
    initialized = true;

    // 결제 완료 리스너 — 스토어에서 어떤 시점이든 트랜잭션이 도착하면 처리
    purchaseListener = lib.purchaseUpdatedListener(async (purchase) => {
      try {
        const productId = purchase.productId;
        if (productId === AD_REMOVAL_PRODUCT_ID) {
          useProgressStore.getState().setAdFree(true);
        }
        // Non-consumable — isConsumable false로 트랜잭션 종결
        await lib.finishTransaction({ purchase, isConsumable: false });
      } catch {
        // 무시 — 다음 부팅 시 미완료 트랜잭션이 다시 도착함
      }
    });

    errorListener = lib.purchaseErrorListener(() => {
      // 유저 취소·네트워크 오류 등. UI 층에서 처리하므로 여기서는 조용히.
    });

    // 앱 시작 시 잔존 구매 확인 (기기 변경 후 첫 실행 등)
    void refreshAdFreeFromReceipts();
  } catch {
    initialized = false;
  }
}

/** 스토어에 등록된 상품 정보 조회 (가격 표시용) */
export async function fetchAdRemovalProduct(): Promise<{
  productId: string;
  localizedPrice: string;
} | null> {
  const lib = await getIapLib();
  if (!lib || !initialized) return null;
  try {
    const products = await lib.fetchProducts({
      skus: [AD_REMOVAL_PRODUCT_ID],
      type: 'in-app',
    });
    const list = Array.isArray(products) ? products : [];
    const p = list.find((x): x is Extract<typeof x, { id: string }> =>
      x != null && 'id' in x && x.id === AD_REMOVAL_PRODUCT_ID,
    );
    if (!p) return null;
    return {
      productId: p.id,
      localizedPrice: 'displayPrice' in p ? p.displayPrice : String(AD_REMOVAL_PRODUCT_ID),
    };
  } catch {
    return null;
  }
}

/**
 * 광고 제거 상품 결제 요청.
 * 반환값이 true = 결제 요청이 스토어에 전달됨 (실제 완료는 리스너에서 처리)
 * false = 결제 요청 전달 실패 (스토어 연결 실패·상품 없음 등)
 */
export async function purchaseAdRemoval(): Promise<boolean> {
  const lib = await getIapLib();
  if (!lib || !initialized) return false;

  // 이미 광고 제거 상태면 스킵
  if (useProgressStore.getState().isAdFree) return true;

  try {
    await lib.requestPurchase({
      type: 'in-app',
      request: {
        ios: { sku: AD_REMOVAL_PRODUCT_ID },
        android: { skus: [AD_REMOVAL_PRODUCT_ID] },
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * 구매 복원 — 다른 기기에서 이미 구매한 유저용 (Apple 심사 필수 버튼).
 * 성공적으로 광고 제거 권한을 복원했으면 true.
 */
export async function restorePurchases(): Promise<boolean> {
  const lib = await getIapLib();
  if (!lib || !initialized) return false;
  try {
    const purchases = await lib.getAvailablePurchases();
    const owns = purchases.some((p) => p.productId === AD_REMOVAL_PRODUCT_ID);
    if (owns) {
      useProgressStore.getState().setAdFree(true);
    }
    return owns;
  } catch {
    return false;
  }
}

/** 부팅 시 조용히 영수증 검사해 이미 산 유저 자동 활성화 */
async function refreshAdFreeFromReceipts(): Promise<void> {
  const lib = await getIapLib();
  if (!lib || !initialized) return;
  try {
    const purchases = await lib.getAvailablePurchases();
    if (purchases.some((p) => p.productId === AD_REMOVAL_PRODUCT_ID)) {
      useProgressStore.getState().setAdFree(true);
    }
  } catch {
    // 무시
  }
}

/** 앱 종료 시(선택) — 대부분 unmount 필요 없음 */
export async function shutdownPurchases(): Promise<void> {
  purchaseListener?.remove();
  errorListener?.remove();
  const lib = await getIapLib();
  if (!lib) return;
  try {
    await lib.endConnection();
  } catch {
    // 무시
  }
  initialized = false;
}

// ─── 아래는 이전 코드가 참조하던 stub — 삭제 예정 ─────────────────────
export async function fetchCustomerInfo(): Promise<null> {
  return null;
}
export async function presentSubscriptionPaywall(): Promise<boolean> {
  return purchaseAdRemoval();
}
export async function presentSubscriptionPaywallIfNeeded(): Promise<boolean> {
  return false;
}
export async function purchaseStoreProductById(): Promise<boolean> {
  return purchaseAdRemoval();
}
export async function presentCustomerCenter(): Promise<void> {}
