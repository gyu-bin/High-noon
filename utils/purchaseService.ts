import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases';
import type { PurchasesError } from 'react-native-purchases';

import { useProgressStore } from '@/store/progressStore';

/** RevenueCat 대시보드 entitlement 식별자와 동일해야 합니다 */
export const HIGH_NOON_PRO_ENTITLEMENT_ID = 'High noon Pro';

/** App Store / Play Console 상품 ID — Offering 패키지와 맞춰 두세요 */
export const STORE_PRODUCT_IDS = {
  lifetime: 'lifetime',
  yearly: 'yearly',
  monthly: 'monthly',
} as const;

export type HighNoonStoreProductId = keyof typeof STORE_PRODUCT_IDS;

/** RevenueCat Test Store — Expo Go에서도 `test_` 키일 때 동작 */
const REVENUECAT_API_KEY_IOS = 'test_kHXkbQMrACdalaMpQaJgjciHZUG';
const REVENUECAT_API_KEY_ANDROID = 'test_kHXkbQMrACdalaMpQaJgjciHZUG';

const IS_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export function purchasesRuntimeEnabled(): boolean {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  if (!IS_EXPO_GO) return true;
  const key =
    Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
  return key.startsWith('test_');
}

let configured = false;
let customerInfoListenerRegistered = false;

function logPurchasesError(context: string, err: unknown): void {
  if (__DEV__) {
    console.warn(`[Purchases] ${context}`, err);
  }
}

function isPurchasesError(e: unknown): e is PurchasesError {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    typeof (e as PurchasesError).code === 'string'
  );
}

function isUserCancelledPurchase(e: unknown): boolean {
  if (!isPurchasesError(e)) return false;
  return (
    e.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR ||
    e.userCancelled === true
  );
}

/** RevenueCat 캐시 기준으로 Pro(광고 제거 등) UI 상태 동기화 */
export function hasHighNoonPro(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements.active[HIGH_NOON_PRO_ENTITLEMENT_ID] != null;
}

function syncProEntitlementFromCustomerInfo(customerInfo: CustomerInfo): void {
  useProgressStore.getState().setAdFree(hasHighNoonPro(customerInfo));
}

function registerCustomerInfoListenerOnce(): void {
  if (customerInfoListenerRegistered || !purchasesRuntimeEnabled()) return;
  customerInfoListenerRegistered = true;
  Purchases.addCustomerInfoUpdateListener((info) => {
    syncProEntitlementFromCustomerInfo(info);
  });
}

async function refreshEntitlementFromPurchases(): Promise<void> {
  if (!purchasesRuntimeEnabled()) return;
  try {
    const info = await Purchases.getCustomerInfo();
    syncProEntitlementFromCustomerInfo(info);
  } catch (e) {
    logPurchasesError('refreshEntitlementFromPurchases', e);
  }
}

type PurchasesOffering = NonNullable<PurchasesOfferings['current']>;

function eachOffering(offerings: PurchasesOfferings): Iterable<PurchasesOffering> {
  const seen = new Set<string>();
  const out: PurchasesOffering[] = [];
  if (offerings.current?.identifier) {
    seen.add(offerings.current.identifier);
    out.push(offerings.current);
  }
  for (const o of Object.values(offerings.all ?? {})) {
    if (o?.identifier && !seen.has(o.identifier)) {
      seen.add(o.identifier);
      out.push(o);
    }
  }
  return out;
}

/** 스토어 상품 ID(`lifetime` 등)로 패키지 탐색 */
export function findPackageByStoreProductId(
  offerings: PurchasesOfferings,
  storeProductId: string,
): PurchasesPackage | null {
  for (const off of eachOffering(offerings)) {
    const found = off.availablePackages?.find(
      (p) => p.product.identifier === storeProductId,
    );
    if (found) return found;
  }
  return null;
}

/** 현재 offering에서 첫 패키지로 구매(페이월 UI 미지원·오류 시 대체) */
async function purchaseFirstAvailablePackage(): Promise<boolean> {
  try {
    const offerings = await Purchases.getOfferings();
    let pkg = offerings.current?.availablePackages?.[0];
    if (!pkg && offerings.all) {
      for (const o of Object.values(offerings.all)) {
        const p = o.availablePackages?.[0];
        if (p) {
          pkg = p;
          break;
        }
      }
    }
    if (!pkg) return false;
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    syncProEntitlementFromCustomerInfo(customerInfo);
    return hasHighNoonPro(customerInfo);
  } catch (e) {
    if (!isUserCancelledPurchase(e)) {
      logPurchasesError('purchaseFirstAvailablePackage', e);
    }
    return false;
  }
}

export async function initPurchases(): Promise<void> {
  if (configured) return;
  if (!purchasesRuntimeEnabled()) {
    configured = true;
    return;
  }
  try {
    await Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

    if (Platform.OS === 'ios') {
      Purchases.configure({ apiKey: REVENUECAT_API_KEY_IOS });
    } else if (Platform.OS === 'android') {
      Purchases.configure({ apiKey: REVENUECAT_API_KEY_ANDROID });
    }

    registerCustomerInfoListenerOnce();
    configured = true;
    const info = await Purchases.getCustomerInfo();
    syncProEntitlementFromCustomerInfo(info);
  } catch (e) {
    logPurchasesError('initPurchases', e);
    configured = true;
  }
}

/** 최신 CustomerInfo — 웹/Expo Go 비지원 시 null */
export async function fetchCustomerInfo(): Promise<CustomerInfo | null> {
  await initPurchases();
  if (!purchasesRuntimeEnabled()) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    logPurchasesError('fetchCustomerInfo', e);
    return null;
  }
}

/**
 * RevenueCat Paywall(현재 Offering).
 * 일부 환경(Expo·RN)에서 페이월이 `document` 기반 하이브리드만 있어 실패하면 → 패키지 직구매로 대체.
 */
export async function presentSubscriptionPaywall(): Promise<boolean> {
  await initPurchases();
  if (!purchasesRuntimeEnabled()) return false;

  if (IS_EXPO_GO) {
    const ok = await purchaseFirstAvailablePackage();
    await refreshEntitlementFromPurchases();
    return ok;
  }

  try {
    const { default: RevenueCatUI, PAYWALL_RESULT } = await import(
      'react-native-purchases-ui',
    );
    const result = await RevenueCatUI.presentPaywall();
    await refreshEntitlementFromPurchases();
    if (
      result === PAYWALL_RESULT.PURCHASED ||
      result === PAYWALL_RESULT.RESTORED
    ) {
      return true;
    }
    return false;
  } catch (e) {
    logPurchasesError('presentSubscriptionPaywall', e);
    const ok = await purchaseFirstAvailablePackage();
    await refreshEntitlementFromPurchases();
    return ok;
  }
}

/** 이미 Pro면 스킵, 아니면 Paywall */
export async function presentSubscriptionPaywallIfNeeded(): Promise<boolean> {
  await initPurchases();
  if (!purchasesRuntimeEnabled()) return false;

  try {
    const info = await Purchases.getCustomerInfo();
    if (hasHighNoonPro(info)) return false;
  } catch {
    /* configure 실패 등 */
  }

  if (IS_EXPO_GO) {
    const ok = await purchaseFirstAvailablePackage();
    await refreshEntitlementFromPurchases();
    return ok;
  }

  try {
    const { default: RevenueCatUI, PAYWALL_RESULT } = await import(
      'react-native-purchases-ui',
    );
    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: HIGH_NOON_PRO_ENTITLEMENT_ID,
    });
    await refreshEntitlementFromPurchases();
    if (
      result === PAYWALL_RESULT.PURCHASED ||
      result === PAYWALL_RESULT.RESTORED
    ) {
      return true;
    }
    return false;
  } catch (e) {
    logPurchasesError('presentSubscriptionPaywallIfNeeded', e);
    const ok = await purchaseFirstAvailablePackage();
    await refreshEntitlementFromPurchases();
    return ok;
  }
}

/** Paywall 없이 특정 스토어 상품만 구매할 때 */
export async function purchaseStoreProductById(
  productId: HighNoonStoreProductId,
): Promise<boolean> {
  await initPurchases();
  if (!purchasesRuntimeEnabled()) return false;
  const storeId = STORE_PRODUCT_IDS[productId];
  try {
    const offerings = await Purchases.getOfferings();
    const pkg = findPackageByStoreProductId(offerings, storeId);
    if (!pkg) {
      logPurchasesError(
        'purchaseStoreProductById',
        new Error(`패키지 없음: ${storeId}`),
      );
      return false;
    }
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    syncProEntitlementFromCustomerInfo(customerInfo);
    return hasHighNoonPro(customerInfo);
  } catch (e) {
    if (!isUserCancelledPurchase(e)) {
      logPurchasesError('purchaseStoreProductById', e);
    }
    return false;
  }
}

/** Customer Center(구독 관리). 대시보드에서 Customer Center 구성 필요 */
export async function presentCustomerCenter(): Promise<void> {
  await initPurchases();
  if (!purchasesRuntimeEnabled()) return;
  if (IS_EXPO_GO) {
    return;
  }
  try {
    const { default: RevenueCatUI } = await import('react-native-purchases-ui');
    await RevenueCatUI.presentCustomerCenter({
      callbacks: {
        onRestoreCompleted: ({ customerInfo }) => {
          syncProEntitlementFromCustomerInfo(customerInfo);
        },
        onRestoreFailed: ({ error }) =>
          logPurchasesError('customerCenter.onRestoreFailed', error),
      },
    });
    await refreshEntitlementFromPurchases();
  } catch (e) {
    logPurchasesError('presentCustomerCenter', e);
  }
}

/** @deprecated `presentSubscriptionPaywall` 사용 권장 */
export async function purchaseAdRemoval(): Promise<boolean> {
  return presentSubscriptionPaywall();
}

export async function restorePurchases(): Promise<boolean> {
  await initPurchases();
  if (!purchasesRuntimeEnabled()) return false;
  try {
    const customerInfo = await Purchases.restorePurchases();
    syncProEntitlementFromCustomerInfo(customerInfo);
    return hasHighNoonPro(customerInfo);
  } catch (e) {
    logPurchasesError('restorePurchases', e);
    return false;
  }
}
