import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import {
  ANDROID_PACKAGE,
  IOS_APP_STORE_ID,
  MINIMUM_STORE_VERSION,
} from '@/constants/release';

function parseVersion(version: string): number[] {
  return version.split('.').map((part) => {
    const n = Number(part);
    return Number.isFinite(n) ? n : 0;
  });
}

/** a < b → 음수, a === b → 0, a > b → 양수 */
export function compareStoreVersions(a: string, b: string): number {
  const av = parseVersion(a);
  const bv = parseVersion(b);
  const len = Math.max(av.length, bv.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (av[i] ?? 0) - (bv[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function getInstalledStoreVersion(): string {
  return (
    Constants.expoConfig?.version ??
    Constants.nativeAppVersion ??
    '0'
  );
}

/** 스토어에서 더 새 버전이 필요한지 (Expo Go / 개발 빌드 제외) */
export function isStoreUpdateRequired(): boolean {
  if (__DEV__) return false;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return false;
  }
  if (Platform.OS === 'web') return false;

  const installed = getInstalledStoreVersion();
  return compareStoreVersions(installed, MINIMUM_STORE_VERSION) < 0;
}

export function getStoreListingUrl(): string {
  if (Platform.OS === 'android') {
    return `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
  }
  return `https://apps.apple.com/app/id${IOS_APP_STORE_ID}`;
}
