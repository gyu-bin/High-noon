/**
 * 인앱 결제 (react-native-iap) — 광고 제거 Non-consumable 1종.
 *
 * App Store Connect 상품 ID는 아래 상수와 반드시 일치해야 한다.
 * ASC에 미등록·판매불가면 fetchProducts가 비고, 구매 시트가 뜨지 않는다.
 *
 * IAP_ENABLED=false 이면 UI·init·구매 전부 비활성.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { useProgressStore } from '@/store/progressStore';
import { compareStoreVersions } from '@/utils/storeUpdate';

/**
 * 광고 제거 IAP는 1.4 네이티브부터.
 * 1.3 스토어 바이너리에 이 JS를 OTA로 넣으면 StoreKit 초기화가 앱을 죽인다.
 */
export const IAP_ENABLED =
  compareStoreVersions(Constants.nativeAppVersion ?? '0', '1.4') >= 0;

/** iOS · Android 공통 상품 ID — App Store Connect / Play Console과 동일해야 함 */
export const AD_REMOVAL_PRODUCT_ID = 'com.highnoon.app.remove_ads';

export const HIGH_NOON_PRO_ENTITLEMENT_ID = 'High noon Pro';
export const STORE_PRODUCT_IDS = { lifetime: AD_REMOVAL_PRODUCT_ID } as const;
export type HighNoonStoreProductId = keyof typeof STORE_PRODUCT_IDS;

export type PurchaseOutcome =
  | { ok: true }
  | {
      ok: false;
      reason: 'cancelled' | 'unavailable' | 'not_ready' | 'failed';
      message: string;
    };

const USE_NATIVE_IAP =
  Platform.OS !== 'web' &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

type IapLib = typeof import('react-native-iap');

let iapLibPromise: Promise<IapLib | null> | null = null;
let initialized = false;
let initPromise: Promise<boolean> | null = null;
let purchaseListener: { remove: () => void } | null = null;
let errorListener: { remove: () => void } | null = null;

type PendingPurchase = {
  resolve: (result: PurchaseOutcome) => void;
  timer: ReturnType<typeof setTimeout>;
};
let pendingPurchase: PendingPurchase | null = null;

function settlePendingPurchase(result: PurchaseOutcome) {
  if (!pendingPurchase) return;
  clearTimeout(pendingPurchase.timer);
  const { resolve } = pendingPurchase;
  pendingPurchase = null;
  resolve(result);
}

async function getIapLib(): Promise<IapLib | null> {
  if (!IAP_ENABLED || !USE_NATIVE_IAP) return null;
  if (!iapLibPromise) {
    iapLibPromise = import('react-native-iap').catch(() => null);
  }
  return iapLibPromise;
}

export function purchasesRuntimeEnabled(): boolean {
  return IAP_ENABLED && USE_NATIVE_IAP;
}

export function isPurchasesInitialized(): boolean {
  return initialized;
}

function mapPurchaseError(error: unknown): PurchaseOutcome {
  const err = error as {
    code?: string | number;
    message?: string;
    userInfo?: { message?: string };
  };
  const code = String(err?.code ?? '').toLowerCase();
  const message = String(err?.message ?? err?.userInfo?.message ?? '');
  const blob = `${code} ${message}`.toLowerCase();

  if (
    blob.includes('cancel') ||
    blob.includes('user-cancelled') ||
    blob.includes('user_cancelled') ||
    blob.includes('usercancelled') ||
    code === '2' ||
    code === 'e_user_cancelled'
  ) {
    return {
      ok: false,
      reason: 'cancelled',
      message: '결제가 취소되었습니다.',
    };
  }

  if (
    blob.includes('sku-not-found') ||
    blob.includes('skunotfound') ||
    blob.includes('item-unavailable') ||
    blob.includes('itemunavailable') ||
    blob.includes('item_unavailable') ||
    blob.includes('product not available') ||
    (blob.includes('skerror') && blob.includes('unavailable'))
  ) {
    return {
      ok: false,
      reason: 'unavailable',
      message:
        '앱스토어에서 상품을 찾을 수 없습니다. 상품 ID·판매 상태·유료 앱 계약을 확인해 주세요.',
    };
  }

  return {
    ok: false,
    reason: 'failed',
    message: message.trim() || '결제를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  };
}

async function initPurchasesInternal(): Promise<boolean> {
  if (initialized) return true;
  const lib = await getIapLib();
  if (!lib) return false;

  try {
    await lib.initConnection();

    purchaseListener?.remove();
    errorListener?.remove();

    purchaseListener = lib.purchaseUpdatedListener(async (purchase) => {
      try {
        const productId = purchase.productId;
        if (productId === AD_REMOVAL_PRODUCT_ID) {
          useProgressStore.getState().setAdFree(true);
          settlePendingPurchase({ ok: true });
        }
        await lib.finishTransaction({ purchase, isConsumable: false });
      } catch {
        // 다음 부팅 시 미완료 트랜잭션이 다시 도착함
      }
    });

    errorListener = lib.purchaseErrorListener((error) => {
      settlePendingPurchase(mapPurchaseError(error));
    });

    initialized = true;
    void refreshAdFreeFromReceipts();
    return true;
  } catch {
    initialized = false;
    return false;
  }
}

/** 앱 부팅 시 1회 — 스토어 연결 + 리스너 + 잔존 구매 확인 */
export async function initPurchases(): Promise<void> {
  if (!IAP_ENABLED) return;
  if (!initPromise) {
    initPromise = initPurchasesInternal().finally(() => {
      if (!initialized) initPromise = null;
    });
  }
  await initPromise;
}

/** init이 끝날 때까지 대기. 실패하면 false */
export async function ensurePurchasesReady(): Promise<boolean> {
  if (!IAP_ENABLED) return false;
  if (initialized) return true;
  await initPurchases();
  return initialized;
}

/** 스토어에 등록된 상품 정보 조회 (가격 표시용). init을 기다린다. */
export async function fetchAdRemovalProduct(): Promise<{
  productId: string;
  localizedPrice: string;
} | null> {
  const ready = await ensurePurchasesReady();
  const lib = await getIapLib();
  if (!lib || !ready) return null;
  try {
    const products = await lib.fetchProducts({
      skus: [AD_REMOVAL_PRODUCT_ID],
      type: 'in-app',
    });
    const list = Array.isArray(products) ? products : [];
    const p = list.find(
      (x): x is Extract<typeof x, { id: string }> =>
        x != null && 'id' in x && x.id === AD_REMOVAL_PRODUCT_ID,
    );
    if (!p) return null;
    return {
      productId: p.id,
      localizedPrice:
        'displayPrice' in p && typeof p.displayPrice === 'string'
          ? p.displayPrice
          : '',
    };
  } catch {
    return null;
  }
}

/**
 * 광고 제거 결제 요청.
 * 실제 완료/실패는 StoreKit 이벤트까지 기다린 뒤 반환한다.
 * (requestPurchase만 resolve되면 성공으로 처리하던 버그를 고침)
 */
export async function purchaseAdRemoval(): Promise<PurchaseOutcome> {
  const ready = await ensurePurchasesReady();
  const lib = await getIapLib();
  if (!lib || !ready) {
    return {
      ok: false,
      reason: 'not_ready',
      message: '스토어 연결을 준비하는 중입니다. 잠시 후 다시 시도해 주세요.',
    };
  }

  if (useProgressStore.getState().isAdFree) {
    return { ok: true };
  }

  const product = await fetchAdRemovalProduct();
  if (!product) {
    return {
      ok: false,
      reason: 'unavailable',
      message:
        '구매 상품을 불러오지 못했습니다. 네트워크와 App Store 로그인을 확인한 뒤 다시 시도해 주세요.',
    };
  }

  if (pendingPurchase) {
    return {
      ok: false,
      reason: 'failed',
      message: '이미 결제창이 열려 있습니다.',
    };
  }

  return new Promise<PurchaseOutcome>((resolve) => {
    pendingPurchase = {
      resolve,
      timer: setTimeout(() => {
        settlePendingPurchase({
          ok: false,
          reason: 'failed',
          message: '결제 응답이 없습니다. 잠시 후 다시 시도해 주세요.',
        });
      }, 120_000),
    };

    void (async () => {
      try {
        await lib.requestPurchase({
          type: 'in-app',
          request: {
            ios: { sku: AD_REMOVAL_PRODUCT_ID },
            android: { skus: [AD_REMOVAL_PRODUCT_ID] },
          },
        });
        // 성공/실패는 purchaseUpdated / purchaseError 리스너가 settle
      } catch (error) {
        settlePendingPurchase(mapPurchaseError(error));
      }
    })();
  });
}

/**
 * 구매 복원 — Apple 심사 필수.
 */
export async function restorePurchases(): Promise<boolean> {
  const ready = await ensurePurchasesReady();
  const lib = await getIapLib();
  if (!lib || !ready) return false;
  try {
    // iOS: App Store와 영수증 동기화 후 가용 구매 조회
    const sync = (lib as { syncIOS?: () => Promise<boolean> }).syncIOS;
    if (Platform.OS === 'ios' && typeof sync === 'function') {
      try {
        await sync();
      } catch {
        // sync 실패해도 getAvailablePurchases는 시도
      }
    }
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

export async function shutdownPurchases(): Promise<void> {
  purchaseListener?.remove();
  errorListener?.remove();
  purchaseListener = null;
  errorListener = null;
  settlePendingPurchase({
    ok: false,
    reason: 'failed',
    message: '결제가 중단되었습니다.',
  });
  const lib = await getIapLib();
  if (lib) {
    try {
      await lib.endConnection();
    } catch {
      // 무시
    }
  }
  initialized = false;
  initPromise = null;
}

// ─── 하위 호환 stub ───────────────────────────────────────────────
export async function fetchCustomerInfo(): Promise<null> {
  return null;
}
export async function presentSubscriptionPaywall(): Promise<boolean> {
  const r = await purchaseAdRemoval();
  return r.ok;
}
export async function presentSubscriptionPaywallIfNeeded(): Promise<boolean> {
  return false;
}
export async function purchaseStoreProductById(): Promise<boolean> {
  const r = await purchaseAdRemoval();
  return r.ok;
}
export async function presentCustomerCenter(): Promise<void> {}
