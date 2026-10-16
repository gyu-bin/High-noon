import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';

import type { DuelPhase } from './useDuelEngine';
import { useSettingsStore } from '@/store/settingsStore';
import { ensureGameAudioSession } from '@/utils/audioService';
import { duckBgm } from '@/utils/bgmService';

/** NPC presentation only: wind recedes before the cue; the shot owns the silence. */
export function useNpcDuelSoundscape(phase: DuelPhase, paused: boolean) {
  const focused = useIsFocused();
  const inactive = paused || !focused;
  const soundEnabled = useSettingsStore(s => s.soundEnabled);
  const musicEnabled = useSettingsStore(s => s.musicEnabled);
  const wind = useRef<AudioPlayer | null>(null);
  const latest = useRef({ phase, soundEnabled, paused: inactive });
  latest.current = { phase, soundEnabled, paused: inactive };
  useEffect(() => {
    let cancelled = false;
    void ensureGameAudioSession().then(() => {
      if (cancelled) return;
      const player = createAudioPlayer(require('@/assets/sounds/duel_wind.wav'));
      player.loop = true;
      wind.current = player;
      const current = latest.current;
      const waiting = current.phase === '준비' || current.phase === '집중' || current.phase === '페이크';
      player.volume = current.phase === '준비' ? .22 : .08;
      if (current.soundEnabled && !current.paused && waiting) player.play();
    }).catch(() => { /* Audio failure must never block a duel. */ });
    return () => { cancelled = true; wind.current?.remove(); wind.current = null; duckBgm(false); };
  }, []);
  useEffect(() => {
    const waiting = phase === '준비' || phase === '집중' || phase === '페이크';
    const quiet = waiting || phase === '뱅' || phase === '결과';
    duckBgm(!inactive && quiet, null);
    const player = wind.current;
    if (!player) return;
    player.volume = phase === '준비' ? .22 : .08;
    if (soundEnabled && !inactive && waiting) player.play();
    else player.pause();
  }, [phase, inactive, soundEnabled, musicEnabled]);
}
