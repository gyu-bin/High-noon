import { duckBgm } from '@/utils/bgmService';
import { play, preloadAll, type SoundName } from '@/utils/audioService';
import { useSettingsStore } from '@/store/settingsStore';

const CUE_SFX: Record<'ready' | 'steady', SoundName> = {
  ready: 'ready_click',
  steady: 'steady_click',
};

export type DuelSpeakCue = 'ready' | 'steady' | 'bang';

export function stopDuelSignalSpeech(): void {
  /* SFX 큐 — 엔진 정리용 no-op */
}

/** READY / STEADY — 전용 효과음(ready_click·steady_click) · BANG은 `playBangShotDuel` */
export function speakDuelCue(cue: DuelSpeakCue): void {
  if (!useSettingsStore.getState().soundEnabled) return;
  if (cue === 'bang') return;

  void preloadAll();
  duckBgm(true);
  play(CUE_SFX[cue]);
}
