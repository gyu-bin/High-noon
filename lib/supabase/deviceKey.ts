import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_KEY_STORAGE = 'high-noon-pvp-device-key';

async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

/**
 * 기기 고유 키 (32+ chars). Anonymous Auth 없이도 PvP RPC 호출 가능.
 */
export async function getOrCreateDeviceKey(): Promise<string> {
  const existing = await storageGet(DEVICE_KEY_STORAGE);
  if (existing && existing.length >= 32) return existing;

  const bytes = await Crypto.getRandomBytesAsync(32);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  await storageSet(DEVICE_KEY_STORAGE, hex);
  return hex;
}
