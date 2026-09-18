import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';

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

/**
 * Expo Go와 이전 네이티브 빌드에도 없는 모듈을 요구하지 않도록 설치 키는
 * pgcrypto가 있는 랭킹 서버에서 발급한다. 클라이언트는 SecureStore에만 보관한다.
 */
async function issueDeviceKey(): Promise<string> {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    const bytes = new Uint8Array(32);
    cryptoApi.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  if (!isSupabaseConfigured) throw new Error('supabase_not_configured');
  const { data, error } = await getSupabase().rpc('pvp_issue_device_key');
  if (error) throw error;
  if (typeof data !== 'string' || !/^[a-f0-9]{64}$/i.test(data)) {
    throw new Error('invalid_device_key_response');
  }
  return data.toLowerCase();
}

/**
 * 기기 고유 키 (32+ chars). Anonymous Auth 없이도 PvP RPC 호출 가능.
 * Expo Go / 구버전 빌드에서도 크래시하지 않도록 네이티브 모듈은 optional.
 */
export async function getOrCreateDeviceKey(): Promise<string> {
  const existing = await storageGet(DEVICE_KEY_STORAGE);
  if (existing && existing.length >= 32) return existing;

  const hex = await issueDeviceKey();
  await storageSet(DEVICE_KEY_STORAGE, hex);
  return hex;
}
