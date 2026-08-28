import * as Speech from 'expo-speech';

import i18n, { getCurrentLanguage } from '@/locales';
import { ensureGameAudioSession } from '@/utils/audioService';
import { duckBgm } from '@/utils/bgmService';

export type DuelSpeakCue = 'ready' | 'steady' | 'bang';

const SPEECH_LANG: Record<string, string> = {
  ko: 'ko-KR',
  en: 'en-US',
  ja: 'ja-JP',
};

const FALLBACK_TEXT: Record<DuelSpeakCue, string> = {
  ready: 'Ready!',
  steady: 'Steady!',
  bang: 'Bang!',
};

/** 큐별 TTS — 짧고 빠르게, 저음→고음으로 긴장 고조 */
const CUE_VOICE: Record<DuelSpeakCue, { pitch: number; rate: number }> = {
  ready: { pitch: 0.68, rate: 1.48 },
  steady: { pitch: 0.76, rate: 1.58 },
  bang: { pitch: 1.65, rate: 1.78 },
};

let warmupPromise: Promise<void> | null = null;

function speechLocale(): string {
  const code = getCurrentLanguage().split('-')[0] ?? 'en';
  return SPEECH_LANG[code] ?? SPEECH_LANG.en!;
}

/** TTS 엔진·오디오 세션 priming — 결투 화면 진입 시 1회 */
export function warmupDuelSpeech(): void {
  if (warmupPromise != null) return;
  warmupPromise = (async () => {
    await ensureGameAudioSession();
    await Speech.getAvailableVoicesAsync();
  })().catch(() => {
    warmupPromise = null;
  });
}

/** 결투 큐 음성 중단 (라운드 리셋·조기탭 등) */
export function stopDuelSignalSpeech(): void {
  try {
    void Speech.stop();
  } catch {
    /* ignore */
  }
}

async function speakDuelCueInternal(cue: DuelSpeakCue): Promise<void> {
  await ensureGameAudioSession();
  if (cue !== 'bang') {
    stopDuelSignalSpeech();
  }

  const text = i18n.t(`speech.${cue}`, { defaultValue: FALLBACK_TEXT[cue] });
  if (!text.trim()) return;

  const language = speechLocale();
  const voice = CUE_VOICE[cue];

  Speech.speak(text, {
    language,
    pitch: voice.pitch,
    rate: voice.rate,
    /** expo-audio와 같은 AVAudioSession — 무음 모드·BGM 재생 중에도 TTS 출력 */
    useApplicationAudioSession: true,
  });
}

/**
 * READY / STEADY / BANG — locale `speech.*` TTS (빠르고 임팩트 있게).
 * 총성은 플레이어·NPC가 실제 발사할 때 `playGunshot`으로 재생.
 * 게임 진행 핵심 큐라서 효과음 설정을 꺼도 항상 읽는다.
 */
export function speakDuelCue(cue: DuelSpeakCue): void {
  duckBgm(true);
  warmupDuelSpeech();
  void speakDuelCueInternal(cue).catch(() => {
    /* 시뮬레이터·미지원 기기 */
  });
}
