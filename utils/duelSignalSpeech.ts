import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

import { useSettingsStore } from '@/store/settingsStore';

const PHRASES = {
  ready: 'Ready',
  steady: 'Steady',
  bang: 'Bang!',
} as const;

/** iOS는 rate×기본속도, Android는 TTS 기준 1.0=보통 */
const SPEAK_OPTIONS: Record<
  keyof typeof PHRASES,
  { rate: number; pitch: number }
> = {
  ready: {
    rate: Platform.OS === 'ios' ? 1.4 : 1.12,
    pitch: 1.02,
  },
  steady: {
    rate: Platform.OS === 'ios' ? 1.4 : 1.12,
    pitch: 1.02,
  },
  bang: {
    rate: Platform.OS === 'ios' ? 1.5 : 1.18,
    pitch: 1.04,
  },
};

export type DuelSpeakCue = keyof typeof PHRASES;

export function stopDuelSignalSpeech(): void {
  try {
    Speech.stop();
  } catch {
    /* no-op */
  }
}

/** Ready / Steady / Bang! TTS (효과음 설정 off 시 생략) */
export function speakDuelCue(cue: DuelSpeakCue): void {
  if (!useSettingsStore.getState().soundEnabled) return;
  try {
    Speech.stop();
    const text = PHRASES[cue];
    const opts = SPEAK_OPTIONS[cue];
    Speech.speak(text, {
      language: 'en-US',
      rate: opts.rate,
      pitch: opts.pitch,
      volume: 1,
    });
  } catch {
    /* 시뮬레이터·권한 등 */
  }
}
