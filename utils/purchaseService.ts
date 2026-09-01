/**
 * 인앱 결제 (react-native-iap) — 광고 제거 Non-consumable 1종.
 *
 * App Store Connect / Play Console 상품 ID는 아래 상수와 반드시 일치해야 한다.
 * 미등록·판매불가면 fetchProducts가 비고, 구매 시트가 뜨지 않는다.
 *
 * IAP_ENABLED=false 이면 UI·init·구매 전부 비활성.
 *
 * Android는 부팅 직후 BillingClient init을 피하고(메뉴에서 lazy),
 * Nitro 모듈이 있을 때만 로드한다. BILLING 권한만 단독으로 넣지 말 것 —
 * Play가 AIDL로 오인한다. billingclient는 react-native-iap이 가져온다.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { useProgressStore } from '@/store/progressStore';

// react-native-iap / Nitro HybridObject는 side-effect import 이후에만 안정적으로 붙는다.
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react-native-nitro-modules');
  } catch {
    // Expo Go · 웹 — 네이티브 IAP 없음
  }
}

/**
 * 스토어 1.4 네이티브 + runtime 1.4 OTA 전용.
 * 1.3 바이너리 차단은 runtimeVersion(1.4)으로 이미 분리됨 — 심사 빌드와 동일하게 항상 ON.
 */
export const IAP_ENABLED = true;

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

/**
 * react-native-iap 15는 Nitro TurboModule이 필요.
 * Expo `requireOptionalNativeModule`은 Expo 모듈만 찾으므로 쓰면 항상 false가 된다.
 */
function hasNitroRuntime(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rn = require('react-native') as {
      TurboModuleRegistry?: { get?: (name: string) => unknown };
      NativeModules?: Record<string, unknown>;
    };
    if (rn.TurboModuleRegistry?.get?.('NitroModules') != null) return true;
    if (rn.NativeModules?.NitroModules != null) return true;
    return (
      typeof (globalThis as { NitroModulesProxy?: unknown }).NitroModulesProxy !==
      'undefined'
    );
  } catch {
    return false;
  }
}

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
  // Android만 Nitro 선행 확인 — iOS 스토어 1.4는 rniap이 이미 링크되어 있음
  if (Platform.OS === 'android' && !hasNitroRuntime()) return null;
  if (!iapLibPromise) {
    iapLibPromise = import('react-native-iap')
      .then((mod) => mod)
      .catch(() => null);
  }
  return iapLibPromise;
}

export function purchasesRuntimeEnabled(): boolean {
  if (!IAP_ENABLED || !USE_NATIVE_IAP) return false;
  if (Platform.OS === 'android') return hasNitroRuntime();
  return true;
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

function purchaseErrorCode(error: unknown): string {
  const err = error as { code?: string | number };
  return String(err?.code ?? '').toLowerCase();
}

function isAlreadyOwnedError(error: unknown): boolean {
  const code = purchaseErrorCode(error);
  const message = String((error as { message?: string })?.message ?? '').toLowerCase();
  return (
    code === 'already-owned' ||
    message.includes('already owned') ||
    message.includes('already purchased')
  );
}

function isAlreadyPreparedError(error: unknown): boolean {
  return purchaseErrorCode(error) === 'already-prepared';
}

async function handleAlreadyOwned(lib: IapLib): Promise<boolean> {
  const owned = await applyAdRemovalOwnership(lib);
  return owned;
}

function purchaseMatchesAdRemoval(p: {
  productId?: string | null;
  id?: string | null;
  ids?: string[] | null;
}): boolean {
  if (
    p.productId === AD_REMOVAL_PRODUCT_ID ||
    p.id === AD_REMOVAL_PRODUCT_ID
  ) {
    return true;
  }
  return p.ids?.includes(AD_REMOVAL_PRODUCT_ID) ?? false;
}

function attachPurchaseListeners(lib: IapLib): void {
  purchaseListener?.remove();
  errorListener?.remove();

  purchaseListener = lib.purchaseUpdatedListener(async (purchase) => {
    try {
      if (purchaseMatchesAdRemoval(purchase)) {
        useProgressStore.getState().setAdFree(true);
        settlePendingPurchase({ ok: true });
      } else if (pendingPurchase) {
        // 예상 SKU와 필드명이 다를 때 ids 배열로 한 번 더 확인
        const ids = (purchase as { ids?: string[] | null }).ids;
        if (ids?.includes(AD_REMOVAL_PRODUCT_ID)) {
          useProgressStore.getState().setAdFree(true);
          settlePendingPurchase({ ok: true });
        }
      }
      await lib.finishTransaction({ purchase, isConsumable: false });
    } catch {
      // 미완료 트랜잭션은 다음 부팅 때 purchaseUpdated로 다시 온다
    }
  });

  errorListener = lib.purchaseErrorListener((error) => {
    if (isAlreadyOwnedError(error)) {
      void handleAlreadyOwned(lib).then((owned) => {
        if (owned) {
          settlePendingPurchase({ ok: true });
          return;
        }
        settlePendingPurchase(mapPurchaseError(error));
      });
      return;
    }
    settlePendingPurchase(mapPurchaseError(error));
  });
}

/** 완료된 non-consumable 포함 — StoreKit2 entitlement / restore / active items */
async function detectAdRemovalOwnership(lib: IapLib): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const currentEntitlement = (
      lib as {
        currentEntitlementIOS?: (
          sku: string,
        ) => Promise<{ productId?: string; id?: string } | null>;
      }
    ).currentEntitlementIOS;
    if (typeof currentEntitlement === 'function') {
      try {
        const entitlement = await currentEntitlement(AD_REMOVAL_PRODUCT_ID);
        if (entitlement && purchaseMatchesAdRemoval(entitlement)) return true;
      } catch {
        // 다음 방법 시도
      }
    }
  }

  try {
    const active = await lib.getAvailablePurchases({
      onlyIncludeActiveItemsIOS: Platform.OS === 'ios' ? true : null,
    });
    if (active.some(purchaseMatchesAdRemoval)) return true;
  } catch {
    // 다음 방법 시도
  }

  try {
    const purchases = await lib.getAvailablePurchases();
    if (purchases.some(purchaseMatchesAdRemoval)) return true;
  } catch {
    // 다음 방법 시도
  }

  if (Platform.OS === 'ios') {
    const getAllTransactions = (
      lib as {
        getAllTransactionsIOS?: () => Promise<
          Array<{ productId?: string; id?: string }>
        >;
      }
    ).getAllTransactionsIOS;
    if (typeof getAllTransactions === 'function') {
      try {
        const txs = await getAllTransactions();
        if (txs.some(purchaseMatchesAdRemoval)) return true;
      } catch {
        // 무시
      }
    }
  }

  return false;
}

async function applyAdRemovalOwnership(lib: IapLib): Promise<boolean> {
  const owns = await detectAdRemovalOwnership(lib);
  if (owns) {
    useProgressStore.getState().setAdFree(true);
  }
  return owns;
}

async function initPurchasesInternal(): Promise<boolean> {
  if (initialized) return true;
  const lib = await getIapLib();
  if (!lib) return false;

  try {
    try {
      await lib.initConnection();
    } catch (error) {
      if (!isAlreadyPreparedError(error)) {
        throw error;
      }
    }

    attachPurchaseListeners(lib);
    initialized = true;
    void refreshAdFreeFromReceipts();
    return true;
  } catch {
    initialized = false;
    return false;
  }
}

/**
 * 스토어 연결 + 리스너 + 잔존 구매 확인.
 * Android는 부팅 직후 BillingClient/Activity 미준비로 네이티브 크래시가 날 수 있어
 * `_layout`에서는 건너뛰고, 메뉴·구매 시에만 호출한다.
 */
export async function initPurchases(): Promise<void> {
  if (!IAP_ENABLED || !USE_NATIVE_IAP) return;
  if (Platform.OS === 'android' && !hasNitroRuntime()) return;
  if (!initPromise) {
    initPromise = initPurchasesInternal().finally(() => {
      if (!initialized) initPromise = null;
    });
  }
  await initPromise;
}

/** 부팅용 — Android는 lazy (메뉴에서 init). iOS만 미리 연결한다. */
export async function initPurchasesOnBoot(): Promise<void> {
  if (Platform.OS === 'android') return;
  await initPurchases();
}

/** init이 끝날 때까지 대기. 실패하면 false */
export async function ensurePurchasesReady(): Promise<boolean> {
  if (!IAP_ENABLED) return false;
  if (initialized) return true;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await initPurchases();
    if (initialized) return true;
    if (attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return initialized;
}

function normalizeAdRemovalProduct(
  raw: unknown,
): { productId: string; localizedPrice: string } | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const productId = String(rec.id ?? rec.productId ?? '');
  if (productId !== AD_REMOVAL_PRODUCT_ID) return null;
  const localizedPrice =
    typeof rec.displayPrice === 'string'
      ? rec.displayPrice
      : typeof rec.localizedPrice === 'string'
        ? rec.localizedPrice
        : '';
  return { productId, localizedPrice };
}

function productsToList(products: unknown): unknown[] {
  if (Array.isArray(products)) return products;
  if (products != null && typeof products === 'object') return [products];
  return [];
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
    for (const item of productsToList(products)) {
      const normalized = normalizeAdRemovalProduct(item);
      if (normalized) return normalized;
    }
  } catch {
    // in-app 조회 실패 — all 타입으로 재시도
  }

  try {
    const products = await lib.fetchProducts({
      skus: [AD_REMOVAL_PRODUCT_ID],
      type: 'all',
    });
    for (const item of productsToList(products)) {
      const normalized = normalizeAdRemovalProduct(item);
      if (normalized) return normalized;
    }
  } catch {
    // 가격 표시 실패 — 구매 자체는 SKU로 가능
  }
  return null;
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

  // 가격 표시용 fetch — 실패해도 SKU로 결제 시트는 열 수 있음 (StoreKit / Play Billing)
  void fetchAdRemovalProduct();

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
            apple: { sku: AD_REMOVAL_PRODUCT_ID },
            google: { skus: [AD_REMOVAL_PRODUCT_ID] },
          },
        });
        // 성공/실패는 purchaseUpdated / purchaseError 리스너가 settle
      } catch (error) {
        if (isAlreadyOwnedError(error)) {
          const owned = await handleAlreadyOwned(lib);
          if (owned) {
            settlePendingPurchase({ ok: true });
            return;
          }
        }
        settlePendingPurchase(mapPurchaseError(error));
      }
    })();
  });
}

/**
 * 구매 복원 — Apple 심사 필수.
 * restorePurchases() 직후 entitlement 조회는 타이밍상 빗나갈 수 있어 짧게 재시도한다.
 */
export async function restorePurchases(): Promise<boolean> {
  if (useProgressStore.getState().isAdFree) return true;

  const ready = await ensurePurchasesReady();
  const lib = await getIapLib();
  if (!lib || !ready) return false;

  try {
    if (Platform.OS === 'ios' && typeof lib.syncIOS === 'function') {
      try {
        await lib.syncIOS();
      } catch {
        // sync 실패해도 restore / entitlement 조회는 시도
      }
    }

    if (typeof lib.restorePurchases === 'function') {
      try {
        await lib.restorePurchases();
      } catch {
        // entitlement 조회로 재확인
      }
    }

    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (await applyAdRemovalOwnership(lib)) return true;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }
    return false;
  } catch {
    return false;
  }
}

async function refreshAdFreeFromReceipts(): Promise<void> {
  const lib = await getIapLib();
  if (!lib || !initialized) return;
  try {
    await applyAdRemovalOwnership(lib);
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
