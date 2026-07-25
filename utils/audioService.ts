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
  'early_tap',
  'win_fanfare',
  'lose_sad',
  'heart_break',
  'level_clear',
] as const;

export type SoundName = (typeof SOUND_NAMES)[number];

/** 짧은 SFX는 PCM(WAV) — 기기에서 디코더 priming/로딩 지연 없이 즉시 재생 */
const SOURCES: Record<SoundName, number> = {
  ready_click: require('@/assets/sounds/ready_click.wav'),
  steady_click: require('@/assets/sounds/steady_click.wav'),
  bang_shot: require('@/assets/sounds/bang_shot.wav'),
  early_tap: require('@/assets/sounds/early_tap.wav'),
  win_fanfare: require('@/assets/sounds/win_fanfare.wav'),
  lose_sad: require('@/assets/sounds/lose_sad.wav'),
  heart_break: require('@/assets/sounds/heart_break.wav'),
  level_clear: require('@/assets/sounds/level_clear.wav'),
};

const cache = new Map<SoundName, AudioPlayer>();
/** `bang_shot` 겹침 재생(듀얼)용 두 번째 인스턴스 */
let bangShotAlt: AudioPlayer | null = null;
let modeReady = false;
let preloadPromise: Promise<void> | null = null;

const PLAYER_OPTIONS = {
  /** 로컬 번들 에셋이므로 downloadFirst 불필요(원격 전용 옵션) — 즉시 로드 */
  downloadFirst: false as const,
  /** 재생 종료 시 세션을 바로 끊지 않아 연속 효과음에 유리 */
  keepAudioSessionActive: true as const,
};

async function ensureAudioMode(): Promise<void> {
  if (modeReady) return;
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    allowsRecording: false,
    shouldRouteThroughEarpiece: false,
    interruptionMode: 'duckOthers',
  });
  // 세션 활성화가 빠지면 기기(특히 iOS)에서 짧은 SFX가 무음이 되는 경우가 있다.
  await setIsAudioActiveAsync(true);
  modeReady = true;
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
      if (!bangShotAlt) {
        bangShotAlt = createAudioPlayer(SOURCES.bang_shot, PLAYER_OPTIONS);
      }
    } catch {
      for (const p of cache.values()) {
        p.remove();
      }
      cache.clear();
      bangShotAlt?.remove();
      bangShotAlt = null;
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

/**
 * 뱅 시점 — 두 명이 동시에 쏘는 느낌으로 같은 클립을 짧게 어긋나 재생.
 * (로컬 2인은 `onBangPhaseEnter`가 한 번만 살아남아도 두 발이 나가게 함)
 */
export function playBangShotDuel(staggerMs = 52): void {
  if (!useSettingsStore.getState().soundEnabled) return;

  const fireAlt = () => {
    if (!useSettingsStore.getState().soundEnabled) return;
    if (!bangShotAlt) {
      bangShotAlt = createAudioPlayer(SOURCES.bang_shot, PLAYER_OPTIONS);
    }
    void playFromPlayer(bangShotAlt);
  };

  const main = cache.get('bang_shot');
  if (main) {
    void playFromPlayer(main);
    setTimeout(fireAlt, staggerMs);
    return;
  }

  void preloadAll().then(() => {
    const loaded = cache.get('bang_shot');
    if (!loaded) return;
    void playFromPlayer(loaded);
    setTimeout(fireAlt, staggerMs);
  });
}

/** 짧은 효과음 재생 (설정 off 시 무시) */
export function play(name: SoundName): void {
  if (!useSettingsStore.getState().soundEnabled) return;

  const run = async () => {
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
  };

  void run();
}

/** 결과 화면용 BGM/효과음 (전용 클립 추가 시 SOUND_NAMES에 연결) */
export async function bgmPlay(name: 'result_win' | 'result_lose'): Promise<void> {
  if (name === 'result_win') {
    return play('win_fanfare');
  }
  return play('lose_sad');
}
