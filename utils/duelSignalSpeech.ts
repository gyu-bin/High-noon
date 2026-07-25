import * as Speech from 'expo-speech';

import { duckBgm } from '@/utils/bgmService';

export type DuelSpeakCue = 'ready' | 'steady' | 'bang';

const CUE_SPEECH: Record<DuelSpeakCue, string> = {
  ready: 'Ready',
  steady: 'Steady',
  bang: 'Bang!',
};

/** 결투 큐 음성 중단 (라운드 리셋·조기탭 등) */
export function stopDuelSignalSpeech(): void {
  try {
    void Speech.stop();
  } catch {
    /* ignore */
  }
}

/**
 * READY / STEADY / BANG — 화면 텍스트를 TTS로 읽음.
 * BANG 총성은 호출측 `playBangShotDuel`이 담당.
 * 게임 진행 핵심 큐라서 효과음 설정을 꺼도 항상 읽는다.
 */
export function speakDuelCue(cue: DuelSpeakCue): void {
  stopDuelSignalSpeech();
  duckBgm(true);

  try {
    Speech.speak(CUE_SPEECH[cue], {
      language: 'en-US',
      pitch: cue === 'bang' ? 1.05 : 0.95,
      rate: cue === 'bang' ? 1.1 : 0.92,
    });
  } catch {
    /* 시뮬레이터·미지원 기기 */
  }
}
