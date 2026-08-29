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
  'cue_ready_v1',
  'cue_ready_v2',
  'cue_ready_v3',
  'cue_ready_v4',
  'cue_ready_v5',
  'cue_steady_v1',
  'cue_steady_v2',
  'cue_steady_v3',
  'cue_steady_v4',
  'cue_steady_v5',
  'cue_bang_v1',
  'cue_bang_v2',
  'cue_bang_v3',
  'cue_bang_v4',
  'cue_bang_v5',
  'early_tap',
  'win_fanfare',
  'lose_sad',
  'defeat_thud',
  'heart_break',
  'level_clear',
] as const;

export type SoundName = (typeof SOUND_NAMES)[number];

/** ElevenLabs 보이스 묶음 개수 (Harry / Liam / Charlie / Will / Adam) */
export const DUEL_VOICE_PACK_COUNT = 5;

/** 짧은 SFX는 PCM(WAV) — 기기에서 디코더 priming/로딩 지연 없이 즉시 재생 */
const SOURCES: Record<SoundName, number> = {
  ready_click: require('@/assets/sounds/ready_click.wav'),
  steady_click: require('@/assets/sounds/steady_click.wav'),
  bang_shot: require('@/assets/sounds/bang_shot.wav'),
  cue_ready_v1: require('@/assets/sounds/cue_ready_v1.wav'),
  cue_ready_v2: require('@/assets/sounds/cue_ready_v2.wav'),
  cue_ready_v3: require('@/assets/sounds/cue_ready_v3.wav'),
  cue_ready_v4: require('@/assets/sounds/cue_ready_v4.wav'),
  cue_ready_v5: require('@/assets/sounds/cue_ready_v5.wav'),
  cue_steady_v1: require('@/assets/sounds/cue_steady_v1.wav'),
  cue_steady_v2: require('@/assets/sounds/cue_steady_v2.wav'),
  cue_steady_v3: require('@/assets/sounds/cue_steady_v3.wav'),
  cue_steady_v4: require('@/assets/sounds/cue_steady_v4.wav'),
  cue_steady_v5: require('@/assets/sounds/cue_steady_v5.wav'),
  cue_bang_v1: require('@/assets/sounds/cue_bang_v1.wav'),
  cue_bang_v2: require('@/assets/sounds/cue_bang_v2.wav'),
  cue_bang_v3: require('@/assets/sounds/cue_bang_v3.wav'),
  cue_bang_v4: require('@/assets/sounds/cue_bang_v4.wav'),
  cue_bang_v5: require('@/assets/sounds/cue_bang_v5.wav'),
  early_tap: require('@/assets/sounds/early_tap.wav'),
  win_fanfare: require('@/assets/sounds/win_fanfare.wav'),
  lose_sad: require('@/assets/sounds/lose_sad.wav'),
  defeat_thud: require('@/assets/sounds/defeat_thud.wav'),
  heart_break: require('@/assets/sounds/heart_break.wav'),
  level_clear: require('@/assets/sounds/level_clear.wav'),
};

function duelVoiceName(
  cue: 'ready' | 'steady' | 'bang',
  pack: number,
): SoundName {
  const p = Math.min(DUEL_VOICE_PACK_COUNT, Math.max(1, pack));
  return `cue_${cue}_v${p}` as SoundName;
}

/** READY에서 뽑은 보이스 묶음 — STEADY/BANG까지 같은 목소리 유지 */
let activeVoicePack: number | null = null;

const cache = new Map<SoundName, AudioPlayer>();
let preloadPromise: Promise<void> | null = null;

const PLAYER_OPTIONS = {
  downloadFirst: false as const,
  keepAudioSessionActive: true as const,
};

/** SFX·보이스 공용 — 재생 직전 호출 (세션·무음 모드 보장) */
export async function ensureGameAudioSession(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    allowsRecording: false,
    shouldRouteThroughEarpiece: false,
    interruptionMode: 'mixWithOthers',
  });
  await setIsAudioActiveAsync(true);
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

function pickVoicePack(): number {
  return 1 + Math.floor(Math.random() * DUEL_VOICE_PACK_COUNT);
}

/**
 * 결투 READY/STEADY/BANG — 보이스 묶음(1~5) 랜덤.
 * READY에서 묶음을 고르고, 같은 라운드의 STEADY/BANG은 동일 목소리.
 * 게임 핵심이라 SFX off여도 재생.
 */
export function playDuelCue(cue: 'ready' | 'steady' | 'bang'): void {
  if (cue === 'ready' || activeVoicePack == null) {
    activeVoicePack = pickVoicePack();
  }
  const pack = activeVoicePack;
  void playInternal(duelVoiceName(cue, pack));
  if (cue === 'bang') {
    activeVoicePack = null;
  }
}

/**
 * 진행 중인 결투 큐 중단.
 * @param clearPack 라운드 중단 시에만 true. 큐 전환(READY→STEADY)은 false로 세트 유지.
 */
export function stopDuelCues(opts?: { clearPack?: boolean }): void {
  if (opts?.clearPack !== false) {
    activeVoicePack = null;
  }
  const names: SoundName[] = [];
  for (let p = 1; p <= DUEL_VOICE_PACK_COUNT; p += 1) {
    names.push(duelVoiceName('ready', p));
    names.push(duelVoiceName('steady', p));
    names.push(duelVoiceName('bang', p));
  }
  for (const name of names) {
    const player = cache.get(name);
    if (!player) continue;
    try {
      player.pause();
      void player.seekTo(0);
    } catch {
      /* ignore */
    }
  }
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
