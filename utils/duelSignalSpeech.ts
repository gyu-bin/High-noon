import * as Speech from 'expo-speech';

import i18n, { getCurrentLanguage } from '@/locales';
import { ensureGameAudioSession, playDuelCue, playDuelVoice } from '@/utils/audioService';
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

/**
 * 큐별 TTS — 저음→고음으로 긴장을 쌓고 BANG에서 터뜨린다.
 * 아래에 임팩트 사운드(서브베이스)가 깔리므로 BANG 피치를 너무 올리면
 * 목소리만 얇게 떠서 오히려 힘이 빠진다.
 */
const CUE_VOICE: Record<DuelSpeakCue, { pitch: number; rate: number }> = {
  ready: { pitch: 0.62, rate: 1.35 },
  steady: { pitch: 0.72, rate: 1.5 },
  bang: { pitch: 1.2, rate: 1.85 },
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
 * READY / STEADY / BANG — 임팩트 사운드 + 음성.
 *
 * 음성은 `scripts/gen_duel_cue_voice.py`로 미리 구운 파일을 쓴다. 기기 TTS는
 * 발화 시작이 기기·엔진마다 수십~수백 ms씩 흔들리는데, 이 게임은 그 신호를 보고
 * 반응 속도를 재기 때문에 그 편차가 그대로 기록에 섞인다. 파일 재생은 지연이
 * 일정하다. 음성이 없는 언어에서만 기기 TTS로 폴백한다.
 *
 * 총성은 플레이어·NPC가 실제 발사할 때 `playGunshot`으로 재생.
 * 게임 진행 핵심 큐라서 효과음 설정을 꺼도 항상 재생한다.
 */
export function speakDuelCue(cue: DuelSpeakCue): void {
  duckBgm(true);
  playDuelCue(cue);

  const lang = getCurrentLanguage().split('-')[0] ?? 'en';
  if (playDuelVoice(lang, cue)) return;

  warmupDuelSpeech();
  void speakDuelCueInternal(cue).catch(() => {
    /* 시뮬레이터·미지원 기기 */
  });
}
