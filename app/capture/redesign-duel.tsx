import { Redirect, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NpcFirstPersonDuelArena } from '@/components/game/NpcFirstPersonDuelArena';
import type { DuelSignalBoardPhase } from '@/components/game/DuelSignalBoard';
import { getNpcById } from '@/constants/npcs';
import type { SpritePose } from '@/constants/sprites';
import { uiV3Colors } from '@/constants/theme';
import { npcTimeline, stageAt } from '@/utils/combatReaction';

const POSES: Record<string, SpritePose> = { idle: 'idle', draw: 'aim', fire: 'shoot', hit: 'defeat' };
const SIGNALS: Record<string, DuelSignalBoardPhase> = { ready: '준비', steady: '집중', fake: '페이크', bang: '뱅', result: '결과' };

/**
 * DEV-only fixed-frame duel QA for the redesigned characters. Never submits a match.
 * ?npc=20&pose=idle|draw|fire|hit&at=<ms of the hit timeline>&final=1&opp=4&signal=bang&echo=1
 */
export default function RedesignDuelCapture() {
  const params = useLocalSearchParams<{ npc?: string; pose?: string; at?: string; final?: string; opp?: string; signal?: string; echo?: string }>();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (!__DEV__) return <Redirect href="/" />;
  const npc = getNpcById(Number(params.npc) || 9) ?? getNpcById(9);
  if (!npc) return <Redirect href="/" />;
  const opponentCharacterId = params.opp != null ? Number(params.opp) : undefined;
  const pose = POSES[params.pose ?? 'idle'] ?? 'idle';
  const final = params.final === '1';
  const hit = pose === 'defeat';
  const npcStage = hit ? stageAt(npcTimeline(final ? 0 : 1), Math.max(0, Number(params.at) || 0), 'none') : undefined;
  return (
    <View style={styles.root}>
      <NpcFirstPersonDuelArena
        key={JSON.stringify(params)}
        width={width} height={height}
        paddingTop={insets.top + 8} paddingBottom={insets.bottom}
        paddingLeft={16} paddingRight={16}
        npcId={npc.id} tier={npc.tier} bossFlag={npc.bossFlag}
        dayNight={npc.id === 22 ? 'night' : 'day'}
        npcPose={pose}
        npcVictoryActive={false} playerDefeated={false}
        playerShotActive={false} npcShotActive={pose === 'shoot'}
        signalPhase={SIGNALS[params.signal ?? (hit ? 'result' : 'steady')] ?? '집중'}
        blindBangText={false} hideBangText={false} voidShroud={false}
        echoBangMiddleSignal={false} specialPresentation={params.echo === '1' ? 'echo' : null}
        opponentHearts={hit ? (final ? 0 : 1) : 3} playerHearts={3}
        opponentCharacterId={opponentCharacterId}
        opponentName={opponentCharacterId != null ? `RANKED P0${opponentCharacterId}` : undefined}
        heartsMax={3} currentRound={1}
        shootCapturesEarly={false} shootActive={false} earlyWarning={false}
        onShootPress={() => {}} onPause={() => {}} pauseDisabled
        combatPreview={{ npcStage }}
      />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: uiV3Colors.background } });
