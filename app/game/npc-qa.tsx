import { Redirect, useLocalSearchParams } from 'expo-router';

import NpcGameScreen from './npc';
import { DevNpcDuelInputContext } from '@/components/game/DevNpcDuelInput';

/** Actual production controller/engine, with automated input only in development. */
export default function NpcActualMatchQa() {
  const { firstShotDelay } = useLocalSearchParams<{ firstShotDelay?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <DevNpcDuelInputContext.Provider value={firstShotDelay != null ? { firstRoundDelayMs: Math.max(0, Math.min(1000, Number(firstShotDelay) || 0)), delayMs: 100 } : true}>
      <NpcGameScreen />
    </DevNpcDuelInputContext.Provider>
  );
}
