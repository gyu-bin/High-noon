import {
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
} from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

import { useSettingsStore } from '@/store/settingsStore';

export type BgmTrack = 'menu' | 'duel' | 'boss';

const SOURCES: Record<BgmTrack, number> = {
  menu: require('@/assets/sounds/bgm_menu.mp3'),
  duel: require('@/assets/sounds/bgm_duel.mp3'),
  boss: require('@/assets/sounds/bgm_boss.mp3'),
};

/** Mixkit Free License — The Duel (로비) / K.O. (경기) / Kroks (보스) */
const BASE_VOLUME: Record<BgmTrack, number> = {
  menu: 0.32,
  duel: 0.4,
  boss: 0.44,
};

const DUCK_VOLUME = 0.08;
const DUCK_MS = 480;
const FADE_MS = 380;
const LOAD_POLL_MS = 48;
const LOAD_TIMEOUT_MS = 12_000;

const players = new Map<BgmTrack, AudioPlayer>();
let activeTrack: BgmTrack | null = null;
let modeReady = false;
let bootedMenuBgm = false;
let duckTimer: ReturnType<typeof setTimeout> | null = null;
let fadeTimer: ReturnType<typeof setInterval> | null = null;
let playChain: Promise<void> = Promise.resolve();

async function ensureAudioMode(): Promise<void> {
  if (modeReady) return;
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    allowsRecording: false,
    shouldRouteThroughEarpiece: false,
    interruptionMode: 'duckOthers',
  });
  await setIsAudioActiveAsync(true);
  modeReady = true;
}

function musicOn(): boolean {
  return useSettingsStore.getState().musicEnabled;
}

function clearFadeTimer(): void {
  if (fadeTimer != null) {
    clearInterval(fadeTimer);
    fadeTimer = null;
  }
}

function getPlayer(track: BgmTrack): AudioPlayer {
  let player = players.get(track);
  if (!player) {
    player = createAudioPlayer(SOURCES[track], {
      downloadFirst: true,
      keepAudioSessionActive: true,
    });
    player.loop = true;
    player.volume = 0;
    players.set(track, player);
  }
  return player;
}

function setPlayerVolume(player: AudioPlayer, volume: number): void {
  try {
    player.volume = Math.max(0, Math.min(1, volume));
  } catch {
    /* ignore */
  }
}

async function waitForPlayerLoaded(player: AudioPlayer): Promise<void> {
  if (player.isLoaded) return;
  const started = Date.now();
  while (!player.isLoaded && Date.now() - started < LOAD_TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, LOAD_POLL_MS));
  }
}

function fadePlayerTo(player: AudioPlayer, target: number, onDone?: () => void): void {
  clearFadeTimer();
  const start = player.volume;
  const delta = target - start;
  if (Math.abs(delta) < 0.02) {
    setPlayerVolume(player, target);
    onDone?.();
    return;
  }
  const steps = 12;
  const stepMs = FADE_MS / steps;
  let step = 0;
  fadeTimer = setInterval(() => {
    step += 1;
    const t = step / steps;
    setPlayerVolume(player, start + delta * t);
    if (step >= steps) {
      clearFadeTimer();
      setPlayerVolume(player, target);
      onDone?.();
    }
  }, stepMs);
}

function pauseOtherTracks(except: BgmTrack): void {
  for (const [track, player] of players) {
    if (track === except) continue;
    try {
      player.pause();
      setPlayerVolume(player, 0);
    } catch {
      /* ignore */
    }
  }
}

async function startTrack(track: BgmTrack, opts?: { fadeIn?: boolean }): Promise<void> {
  if (!musicOn()) {
    stopBgm();
    return;
  }

  await ensureAudioMode();
  if (!musicOn()) return;

  const player = getPlayer(track);
  await waitForPlayerLoaded(player);

  if (activeTrack === track && player.playing) {
    setPlayerVolume(player, BASE_VOLUME[track]);
    return;
  }

  pauseOtherTracks(track);

  if (activeTrack != null && activeTrack !== track) {
    const prev = players.get(activeTrack);
    if (prev) {
      fadePlayerTo(prev, 0, () => {
        try {
          prev.pause();
        } catch {
          /* ignore */
        }
      });
    }
  }

  activeTrack = track;
  try {
    await player.seekTo(0);
  } catch {
    /* ignore */
  }

  const target = BASE_VOLUME[track];
  if (opts?.fadeIn === false) {
    setPlayerVolume(player, target);
  } else {
    setPlayerVolume(player, 0);
  }
  player.play();

  if (opts?.fadeIn === false) {
    return;
  }
  fadePlayerTo(player, target);
}

function enqueuePlay(track: BgmTrack, opts?: { fadeIn?: boolean }): void {
  playChain = playChain
    .then(() => startTrack(track, opts))
    .catch(() => {
      /* ignore */
    });
}

/** 앱 기동 시 BGM 플레이어 선생성 */
export async function preloadBgm(): Promise<void> {
  if (!musicOn()) return;
  try {
    await ensureAudioMode();
    (Object.keys(SOURCES) as BgmTrack[]).forEach((track) => {
      getPlayer(track);
    });
  } catch {
    /* ignore */
  }
}

/** 타이틀·앱 기동 직후 — 메뉴 BGM 즉시 시작 */
export async function bootMenuBgm(): Promise<void> {
  if (bootedMenuBgm) {
    playBgm('menu', { fadeIn: false });
    return;
  }
  bootedMenuBgm = true;
  await preloadBgm();
  playBgm('menu', { fadeIn: false });
}

/** 화면별 BGM 재생 — 같은 트랙이면 유지 */
export function playBgm(track: BgmTrack, opts?: { fadeIn?: boolean }): void {
  if (!musicOn()) {
    stopBgm();
    return;
  }
  enqueuePlay(track, opts);
}

/** BGM 정지 */
export function stopBgm(): void {
  if (duckTimer != null) {
    clearTimeout(duckTimer);
    duckTimer = null;
  }
  clearFadeTimer();
  activeTrack = null;
  for (const player of players.values()) {
    try {
      player.pause();
      setPlayerVolume(player, 0);
    } catch {
      /* ignore */
    }
  }
}

/** 뱅·페이크 순간 BGM ducking */
export function duckBgm(active = true): void {
  if (!musicOn() || activeTrack == null) return;
  const player = players.get(activeTrack);
  if (!player) return;

  if (duckTimer != null) {
    clearTimeout(duckTimer);
    duckTimer = null;
  }

  if (active) {
    setPlayerVolume(player, DUCK_VOLUME);
    duckTimer = setTimeout(() => {
      duckTimer = null;
      if (activeTrack != null && musicOn()) {
        const p = players.get(activeTrack);
        if (p) fadePlayerTo(p, BASE_VOLUME[activeTrack]);
      }
    }, DUCK_MS);
    return;
  }

  fadePlayerTo(player, BASE_VOLUME[activeTrack]);
}

/** 설정에서 BGM 끄면 즉시 정지 */
export function syncBgmWithSettings(): void {
  if (!musicOn()) stopBgm();
}

/** persist hydration 이후 BGM 재시도 */
export function retryBgmAfterHydration(track: BgmTrack | null): void {
  if (track == null || !musicOn()) return;
  playBgm(track, { fadeIn: false });
}
