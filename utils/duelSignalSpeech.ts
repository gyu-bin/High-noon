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
 * READY / STEADY / BANG — 임팩트 + ElevenLabs 보이스 묶음(1~5) 랜덤.
 * READY에서 한 목소리를 고르고 STEADY/BANG까지 유지. TTS 없음.
 */
export function speakDuelCue(cue: DuelSpeakCue): void {
  duckBgm(true);
  warmupDuelSpeech();
  if (cue !== 'bang') {
    stopDuelSignalSpeech();
  }
  playDuelCue(cue);
}
