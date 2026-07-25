import AsyncStorage from '@react-native-async-storage/async-storage';

const OTA_JUST_APPLIED_KEY = 'high-noon-ota-just-applied';

/** reloadAsync 직전 — 재시작 후 스플래시/토스트용 플래그 */
export async function markOtaJustApplied(): Promise<void> {
  try {
    await AsyncStorage.setItem(OTA_JUST_APPLIED_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** 한 번만 소비. true면 업데이트 완료 토스트 표시 */
export async function consumeOtaJustApplied(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(OTA_JUST_APPLIED_KEY);
    if (value == null) return false;
    await AsyncStorage.removeItem(OTA_JUST_APPLIED_KEY);
    return true;
  } catch {
    return false;
  }
}
