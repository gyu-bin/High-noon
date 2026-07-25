import AsyncStorage from '@react-native-async-storage/async-storage';

const OTA_JUST_APPLIED_KEY = 'high-noon-ota-just-applied';

/** reloadAsync 직전 — 재시작 후 부트 스플래시에서 토스트용 */
export async function markOtaJustApplied(): Promise<void> {
  try {
    await AsyncStorage.setItem(OTA_JUST_APPLIED_KEY, Date.now().toString());
    // iOS에서 setItem 직후 즉시 reload 하면 플래그가 안 남는 경우가 있어 짧게 대기
    await new Promise((r) => setTimeout(r, 80));
  } catch {
    /* ignore */
  }
}

/** 한 번만 소비. true면 업데이트 완료 안내 표시 */
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
