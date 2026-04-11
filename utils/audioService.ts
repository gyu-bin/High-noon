import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
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

const SOURCES: Record<SoundName, number> = {
  ready_click: require('@/assets/sounds/ready_click.mp3'),
  steady_click: require('@/assets/sounds/steady_click.mp3'),
  bang_shot: require('@/assets/sounds/bang_shot.mp3'),
  early_tap: require('@/assets/sounds/early_tap.mp3'),
  win_fanfare: require('@/assets/sounds/win_fanfare.mp3'),
  lose_sad: require('@/assets/sounds/lose_sad.mp3'),
  heart_break: require('@/assets/sounds/heart_break.mp3'),
  level_clear: require('@/assets/sounds/level_clear.mp3'),
};

const cache = new Map<SoundName, AudioPlayer>();
let modeReady = false;
let preloadPromise: Promise<void> | null = null;

const PLAYER_OPTIONS = {
  /** 짧은 SFX 여러 개: 로드 안정화 */
  downloadFirst: true as const,
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

/** 짧은 효과음 재생 (설정 off 시 무시) */
export async function play(name: SoundName): Promise<void> {
  if (!useSettingsStore.getState().soundEnabled) return;
  try {
    await ensureAudioMode();
    let player = cache.get(name);
    if (!player) {
      await preloadAll();
      player = cache.get(name);
    }
    if (!player) return;
    player.pause();
    await player.seekTo(0);
    player.play();
  } catch {
    /* 시뮬레이터·에셋 누락 등 */
  }
}
