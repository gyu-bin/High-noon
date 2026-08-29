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
 * READY / STEADY / BANG — 임팩트(타이밍) + 영어 보이스 클립.
 *
 * 임팩트를 보이스와 같이 쳐서, TTS처럼 기기마다 흔들리지 않는
 * 일정한 신호로 반응 측정을 잡는다. TTS는 쓰지 않는다.
 *
 * 총성은 발사 시 `playGunshot`. 게임 핵심 큐라서 SFX off여도 재생.
 */
export function speakDuelCue(cue: DuelSpeakCue): void {
  duckBgm(true);
  warmupDuelSpeech();
  if (cue !== 'bang') {
    stopDuelSignalSpeech();
  }
  playDuelCue(cue);
}
