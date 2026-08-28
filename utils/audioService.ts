import {
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
} from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

import { useSettingsStore } from '@/store/settingsStore';

export const SOUND_NAMES = [
  'ready_click',
  'steady_click',
  'bang_shot',
  'cue_ready',
  'cue_steady',
  'cue_bang',
  'early_tap',
  'win_fanfare',
  'lose_sad',
  'defeat_thud',
  'heart_break',
  'level_clear',
] as const;

export type SoundName = (typeof SOUND_NAMES)[number];

/** 짧은 SFX는 PCM(WAV) — 기기에서 디코더 priming/로딩 지연 없이 즉시 재생 */
const SOURCES: Record<SoundName, number> = {
  ready_click: require('@/assets/sounds/ready_click.wav'),
  steady_click: require('@/assets/sounds/steady_click.wav'),
  bang_shot: require('@/assets/sounds/bang_shot.wav'),
  cue_ready: require('@/assets/sounds/cue_ready.wav'),
  cue_steady: require('@/assets/sounds/cue_steady.wav'),
  cue_bang: require('@/assets/sounds/cue_bang.wav'),
  early_tap: require('@/assets/sounds/early_tap.wav'),
  win_fanfare: require('@/assets/sounds/win_fanfare.wav'),
  lose_sad: require('@/assets/sounds/lose_sad.wav'),
  defeat_thud: require('@/assets/sounds/defeat_thud.wav'),
  heart_break: require('@/assets/sounds/heart_break.wav'),
  level_clear: require('@/assets/sounds/level_clear.wav'),
};

const DUEL_CUE_NAMES = {
  ready: 'cue_ready',
  steady: 'cue_steady',
  bang: 'cue_bang',
} as const satisfies Record<string, SoundName>;

const cache = new Map<SoundName, AudioPlayer>();
let modeReady = false;
let preloadPromise: Promise<void> | null = null;

const PLAYER_OPTIONS = {
  /** 로컬 번들 에셋이므로 downloadFirst 불필요(원격 전용 옵션) — 즉시 로드 */
  downloadFirst: false as const,
  /** 재생 종료 시 세션을 바로 끊지 않아 연속 효과음에 유리 */
  keepAudioSessionActive: true as const,
};

/** SFX·TTS 공용 — speak/재생 직전 호출 (세션·무음 모드 보장) */
export async function ensureGameAudioSession(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    allowsRecording: false,
    shouldRouteThroughEarpiece: false,
    interruptionMode: 'mixWithOthers',
  });
  await setIsAudioActiveAsync(true);
  modeReady = true;
}

async function ensureAudioMode(): Promise<void> {
  await ensureGameAudioSession();
}

/** 앱 기동 시 한 번 호출 — 모든 SFX를 메모리에 적재 */
export async function preloadAll(): Promise<void> {
  if (preloadPromise != null) return preloadPromise;

  preloadPromise = (async () => {
    try {
      await ensureAudioMode();
      await Promise.all(
        SOUND_NAMES.map(async (name) => {
          if (cache.has(name)) return;
          const player = createAudioPlayer(SOURCES[name], PLAYER_OPTIONS);
          cache.set(name, player);
        }),
      );
    } catch {
      for (const p of cache.values()) {
        p.remove();
      }
      cache.clear();
      preloadPromise = null;
    }
  })();

  return preloadPromise;
}

async function playFromPlayer(player: AudioPlayer | undefined): Promise<void> {
  if (!player) return;
  try {
    player.pause();
    void player.seekTo(0);
    player.play();
  } catch {
    /* ignore */
  }
}

/** 뱅 시점 단일 총성 — 플레이어/NPC가 쐈을 때만 호출 */
export function playGunshot(): void {
  if (!useSettingsStore.getState().soundEnabled) return;
  const main = cache.get('bang_shot');
  if (main) {
    void playFromPlayer(main);
    return;
  }
  void preloadAll().then(() => {
    const loaded = cache.get('bang_shot');
    if (!loaded) return;
    void playFromPlayer(loaded);
  });
}

/**
 * @deprecated 단일 총성은 `playGunshot` 사용
 */
export function playBangShotDuel(_staggerMs = 52): void {
  playGunshot();
}

/** 짧은 효과음 재생 (설정 off 시 무시) */
export function play(name: SoundName): void {
  if (!useSettingsStore.getState().soundEnabled) return;
  void playInternal(name);
}

/** 결투 READY/STEADY/BANG 큐 — 게임 핵심이라 SFX off여도 재생 */
export function playDuelCue(cue: 'ready' | 'steady' | 'bang'): void {
  void playInternal(DUEL_CUE_NAMES[cue]);
}

async function playInternal(name: SoundName): Promise<void> {
  try {
    await ensureAudioMode();
    let player = cache.get(name);
    if (!player) {
      await preloadAll();
      player = cache.get(name);
    }
    if (!player) return;
    void playFromPlayer(player);
  } catch {
    /* 시뮬레이터·에셋 누락 등 */
  }
}

/** 결과 화면용 BGM/효과음 (전용 클립 추가 시 SOUND_NAMES에 연결) */
export async function bgmPlay(name: 'result_win' | 'result_lose'): Promise<void> {
  if (!useSettingsStore.getState().soundEnabled) return;
  if (name === 'result_win') {
    return playInternal('win_fanfare');
  }
  return playInternal('lose_sad');
}
