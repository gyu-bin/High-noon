import {
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
} from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import { AppState } from 'react-native';

import { useSettingsStore } from '@/store/settingsStore';

export const SOUND_NAMES = [
  'ready_click',
  'steady_click',
  'bang_shot',
  'cue_ready',
  'cue_steady',
  'cue_bang',
  'cue_ready_impact',
  'cue_steady_impact',
  'cue_bang_impact',
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
  // 영어 보이스 클립 (Eddy)
  cue_ready: require('@/assets/sounds/cue_ready.wav'),
  cue_steady: require('@/assets/sounds/cue_steady.wav'),
  cue_bang: require('@/assets/sounds/cue_bang.wav'),
  // 임팩트 — scripts/gen_duel_cue_sounds.py
  cue_ready_impact: require('@/assets/sounds/cue_ready_impact.wav'),
  cue_steady_impact: require('@/assets/sounds/cue_steady_impact.wav'),
  cue_bang_impact: require('@/assets/sounds/cue_bang_impact.wav'),
  early_tap: require('@/assets/sounds/early_tap.wav'),
  win_fanfare: require('@/assets/sounds/win_fanfare.wav'),
  lose_sad: require('@/assets/sounds/lose_sad.wav'),
  defeat_thud: require('@/assets/sounds/defeat_thud.wav'),
  heart_break: require('@/assets/sounds/heart_break.wav'),
  level_clear: require('@/assets/sounds/level_clear.wav'),
};

const DUEL_VOICE_NAMES = {
  ready: 'cue_ready',
  steady: 'cue_steady',
  bang: 'cue_bang',
} as const satisfies Record<string, SoundName>;

const DUEL_IMPACT_NAMES = {
  ready: 'cue_ready_impact',
  steady: 'cue_steady_impact',
  bang: 'cue_bang_impact',
} as const satisfies Record<string, SoundName>;

const cache = new Map<SoundName, AudioPlayer>();
let modeReady = false;
let sessionPromise: Promise<void> | null = null;
let appStateSub: ReturnType<typeof AppState.addEventListener> | null = null;
let preloadPromise: Promise<void> | null = null;

const PLAYER_OPTIONS = {
  /** 로컬 번들 에셋이므로 downloadFirst 불필요(원격 전용 옵션) — 즉시 로드 */
  downloadFirst: false as const,
  /** 재생 종료 시 세션을 바로 끊지 않아 연속 효과음에 유리 */
  keepAudioSessionActive: true as const,
};

/**
 * SFX·보이스 공용 — 재생 직전 호출 (세션·무음 모드 보장).
 *
 * **세션은 한 번만 연다.** 예전에는 효과음을 재생할 때마다 `setAudioModeAsync` +
 * `setIsAudioActiveAsync`를 다시 호출했다(`modeReady` 가드가 대입만 되고 읽히지 않았다).
 * 그 두 호출이 하필 뱅 시점에 몰려서 — 임팩트·보이스 2개 재생 × 2회 = 4회 —
 * 반응 측정이 시작되는 바로 그 순간에 네이티브 작업이 쌓였다. iOS의 오디오 세션
 * 활성화는 무거워서 프레임 히치를 만들 수 있고, 그 비용은 기기마다 다르다.
 *
 * 단, 앱이 백그라운드에 다녀오면 OS가 세션을 내리므로 그때는 다시 열어야 한다.
 */
export async function ensureGameAudioSession(): Promise<void> {
  if (modeReady) return;
  if (!sessionPromise) {
    sessionPromise = (async () => {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        allowsRecording: false,
        shouldRouteThroughEarpiece: false,
        interruptionMode: 'mixWithOthers',
      });
      await setIsAudioActiveAsync(true);
      modeReady = true;
      watchForegroundReturn();
    })().catch((e: unknown) => {
      sessionPromise = null;
      throw e;
    });
  }
  return sessionPromise;
}

/** 백그라운드로 내려가면 세션 재개방이 필요하다고 표시 */
function watchForegroundReturn(): void {
  if (appStateSub) return;
  appStateSub = AppState.addEventListener('change', (next) => {
    if (next === 'active') return;
    modeReady = false;
    sessionPromise = null;
  });
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

/**
 * 결투 READY/STEADY/BANG — 임팩트(타이밍 기준) + 영어 보이스.
 * 게임 핵심이라 SFX off여도 재생.
 */
export function playDuelCue(cue: 'ready' | 'steady' | 'bang'): void {
  void playInternal(DUEL_IMPACT_NAMES[cue]);
  void playInternal(DUEL_VOICE_NAMES[cue]);
}

/** 진행 중인 결투 큐(임팩트·보이스) 중단 */
export function stopDuelCues(): void {
  const names = [
    ...Object.values(DUEL_VOICE_NAMES),
    ...Object.values(DUEL_IMPACT_NAMES),
  ];
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
