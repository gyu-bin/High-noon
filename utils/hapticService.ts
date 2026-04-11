import * as Haptics from 'expo-haptics';

import { useSettingsStore } from '@/store/settingsStore';

export type HapticTriggerType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'error'
  | 'success'
  /** 짧고 가벼움 — 뱅 직후 플레이어 탭 확인용(heavy와 구분) */
  | 'selection';

/**
 * BANG: heavy / 얼리: error / 승리: success / 하트 소멸: medium
 * 그 외: light·medium·heavy = impact, error·success = notification
 */
export async function trigger(type: HapticTriggerType): Promise<void> {
  if (!useSettingsStore.getState().hapticEnabled) return;
  try {
    switch (type) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      case 'selection':
        await Haptics.selectionAsync();
        return;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        return;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        return;
      case 'error':
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error,
        );
        return;
      case 'success':
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        return;
      default:
        return;
    }
  } catch {
    /* 기기 미지원 등 */
  }
}
