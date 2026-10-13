import { Redirect } from 'expo-router';

import NpcGameScreen from './npc';
import { DevNpcDuelInputContext } from '@/components/game/DevNpcDuelInput';

/** Actual production controller/engine, with automated input only in development. */
export default function NpcActualMatchQa() {
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <DevNpcDuelInputContext.Provider value={true}>
      <NpcGameScreen />
    </DevNpcDuelInputContext.Provider>
  );
}
