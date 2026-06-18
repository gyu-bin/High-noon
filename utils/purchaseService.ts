/** 인앱 결제 비활성화 — RevenueCat 연동 시 git 히스토리의 purchaseService.ts 참고 */

export const HIGH_NOON_PRO_ENTITLEMENT_ID = 'High noon Pro';

export const STORE_PRODUCT_IDS = {
  lifetime: 'lifetime',
  yearly: 'yearly',
  monthly: 'monthly',
} as const;

export type HighNoonStoreProductId = keyof typeof STORE_PRODUCT_IDS;

export function purchasesRuntimeEnabled(): boolean {
  return false;
}

export async function initPurchases(): Promise<void> {}

export async function fetchCustomerInfo(): Promise<null> {
  return null;
}

export async function presentSubscriptionPaywall(): Promise<boolean> {
  return false;
}

export async function presentSubscriptionPaywallIfNeeded(): Promise<boolean> {
  return false;
}

export async function purchaseStoreProductById(
  _productId: HighNoonStoreProductId,
): Promise<boolean> {
  return false;
}

export async function presentCustomerCenter(): Promise<void> {}

export async function purchaseAdRemoval(): Promise<boolean> {
  return false;
}

export async function restorePurchases(): Promise<boolean> {
  return false;
}
