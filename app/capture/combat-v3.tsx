import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NpcFirstPersonDuelArena } from '@/components/game/NpcFirstPersonDuelArena';
import { npcTimeline, playerTimeline, stageAt } from '@/utils/combatReaction';

/** Offline renderer replay of already-decided results, never submits a match. */
export default function CombatV3Capture() {
  const params = useLocalSearchParams<{ scenario?: string; scale?: string; at?: string; night?: string; signal?: string }>();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [started, setStarted] = useState(false);
  useEffect(() => {
    setStarted(false);
    const timer = setTimeout(() => setStarted(true), 3500);
    return () => clearTimeout(timer);
  }, [params.scenario, params.scale, params.at, params.night, params.signal]);
  if (!__DEV__) return <Redirect href="/" />;
  const scenario = params.scenario ?? 'scale';
  const ranked = scenario.startsWith('ranked');
  const playerHit = scenario.startsWith('player');
  const final = scenario.endsWith('final') && !scenario.endsWith('nonfinal');
  const hit = scenario !== 'scale' && (params.at != null || started);
  const fixedAt = params.at != null ? Math.max(0, Number(params.at) || 0) : undefined;
  const npcStage = fixedAt != null && !playerHit && scenario !== 'scale'
    ? stageAt(npcTimeline(final ? 0 : 1), fixedAt, 'none') : undefined;
  const playerStage = fixedAt != null && playerHit
    ? stageAt(playerTimeline(final ? 0 : 1), fixedAt, 'none') : undefined;
  const scale = Number(params.scale);
  return (
    <View style={styles.root}>
      <NpcFirstPersonDuelArena
        key={`${scenario}:${params.scale}:${params.at}:${params.night}:${params.signal}`}
        width={width} height={height}
        paddingTop={insets.top + 8} paddingBottom={insets.bottom}
        paddingLeft={16} paddingRight={16}
        npcId={1} tier="bronze" bossFlag={false}
        dayNight={params.night === '1' ? 'night' : 'day'}
        npcPose={hit && !playerHit ? 'defeat' : 'idle'}
        npcVictoryActive={false} playerDefeated={hit && playerHit}
        playerShotActive={false} npcShotActive={false}
        signalPhase={scenario !== 'scale' ? '결과' : params.signal === 'bang' ? '뱅' : params.signal === 'ready' ? '준비' : '집중'}
        blindBangText={false} hideBangText={false} voidShroud={false}
        echoBangMiddleSignal={false} specialPresentation={null}
        opponentHearts={hit && !playerHit ? final ? 0 : 1 : ranked ? 2 : 3}
        playerHearts={hit && playerHit ? final ? 0 : 1 : ranked ? 2 : 3}
        opponentCharacterId={ranked ? 1 : undefined}
        opponentName={ranked ? 'RANKED PLAYER 01' : undefined}
        heartsMax={ranked ? 2 : 3} currentRound={1}
        shootCapturesEarly={false} shootActive={false} earlyWarning={false}
        onShootPress={() => {}} onPause={() => {}} pauseDisabled
        combatPreview={{ scale: [1.2, 1.25, 1.3].includes(scale) ? scale : undefined, npcStage, playerStage }}
      />
      <Text pointerEvents="none" style={[styles.label, { bottom: insets.bottom + 4 }]}>
        QA REPLAY · {scenario} · {params.scale ?? 'default'}x · {fixedAt != null ? `${fixedAt}ms` : started ? 'timeline' : 'waiting'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1A0C06' },
  label: { position: 'absolute', alignSelf: 'center', color: '#FFE6BD', fontSize: 10, backgroundColor: '#1A0C06' },
});
