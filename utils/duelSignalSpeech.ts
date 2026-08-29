import { ensureGameAudioSession, playDuelCue, stopDuelCues } from '@/utils/audioService';
import { duckBgm } from '@/utils/bgmService';

export type DuelSpeakCue = 'ready' | 'steady' | 'bang';

let warmupPromise: Promise<void> | null = null;

/** 오디오 세션 priming — 결투 화면 진입 시 1회 */
export function warmupDuelSpeech(): void {
  if (warmupPromise != null) return;
  warmupPromise = ensureGameAudioSession().catch(() => {
    warmupPromise = null;
  });
}

/** 결투 큐 음성 중단 (라운드 리셋·조기탭 등) */
export function stopDuelSignalSpeech(): void {
  stopDuelCues();
}

/**
 * READY / STEADY / BANG — 영어 보이스 클립 (강약·늘림).
 * 언어 설정과 무관하게 동일. 총성은 발사 시 `playGunshot`.
 * 게임 핵심 큐라서 효과음 설정을 꺼도 항상 재생.
 */
export function speakDuelCue(cue: DuelSpeakCue): void {
  duckBgm(true);
  warmupDuelSpeech();
  if (cue !== 'bang') {
    stopDuelSignalSpeech();
  }
  playDuelCue(cue);
}
