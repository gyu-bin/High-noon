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

/** 결투 큐 음성 중단 (라운드 리셋·조기탭 등) — 보이스 세트도 초기화 */
export function stopDuelSignalSpeech(): void {
  stopDuelCues({ clearPack: true });
}

/**
 * READY / STEADY / BANG — ElevenLabs 보이스 묶음(1~5) 랜덤.
 * READY에서 한 목소리를 고르고 STEADY/BANG까지 유지. TTS·임팩트 없음.
 */
export function speakDuelCue(cue: DuelSpeakCue): void {
  duckBgm(true);
  warmupDuelSpeech();
  // 이전 큐 오디오만 끊고, 세트는 유지 (clearPack이면 STEADY마다 새 목소리)
  if (cue !== 'bang') {
    stopDuelCues({ clearPack: false });
  }
  playDuelCue(cue);
}
