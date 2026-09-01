import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const DEVICE_KEY_STORAGE = 'high-noon-pvp-device-key';

type SecureStoreMod = typeof import('expo-secure-store');

let secureStorePromise: Promise<SecureStoreMod | null> | null = null;

async function getSecureStore(): Promise<SecureStoreMod | null> {
  if (Platform.OS === 'web') return null;
  if (!secureStorePromise) {
    secureStorePromise = import('expo-secure-store').catch(() => null);
  }
  return secureStorePromise;
}

async function storageGet(key: string): Promise<string | null> {
  const secure = await getSecureStore();
  if (secure) {
    try {
      return await secure.getItemAsync(key);
    } catch {
      // Expo Go / 구버전 바이너리에서 네이티브 모듈 없을 수 있음
    }
  }
  return AsyncStorage.getItem(key);
}

async function storageSet(key: string, value: string): Promise<void> {
  const secure = await getSecureStore();
  if (secure) {
    try {
      await secure.setItemAsync(key, value);
      return;
    } catch {
      // fall through
    }
  }
  await AsyncStorage.setItem(key, value);
}

/** 네이티브 expo-crypto가 없어도 32바이트 hex 생성 */
async function randomHex32(): Promise<string> {
  try {
    const Crypto = await import('expo-crypto');
    const bytes = await Crypto.getRandomBytesAsync(32);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    // Expo Go에서 ExpoCryptoAES 없는 경우 등
  }

  const bytes = new Uint8Array(32);
  const webCrypto =
    typeof globalThis !== 'undefined'
      ? (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto
      : undefined;
  if (webCrypto?.getRandomValues) {
    webCrypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 기기 고유 키 (32+ chars). Anonymous Auth 없이도 PvP RPC 호출 가능.
 * Expo Go / 구버전 빌드에서도 크래시하지 않도록 네이티브 모듈은 optional.
 */
export async function getOrCreateDeviceKey(): Promise<string> {
  const existing = await storageGet(DEVICE_KEY_STORAGE);
  if (existing && existing.length >= 32) return existing;

  const hex = await randomHex32();
  await storageSet(DEVICE_KEY_STORAGE, hex);
  return hex;
}
