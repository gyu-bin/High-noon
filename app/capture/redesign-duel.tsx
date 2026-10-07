import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NpcFirstPersonDuelArena } from '@/components/game/NpcFirstPersonDuelArena';
import { NpcPreDuelScreen } from '@/components/game/NpcPreDuelScreen';
import type { DuelSignalBoardPhase } from '@/components/game/DuelSignalBoard';
import { getNpcById } from '@/constants/npcs';
import type { DuelBackgroundId } from '@/constants/v3DuelAssets';
import type { SpritePose } from '@/constants/sprites';
import { uiV3Colors } from '@/constants/theme';
import { npcTimeline, stageAt } from '@/utils/combatReaction';
import { CAPTURE_ROUTES_ENABLED } from '@/constants/captureRoutes';
import { getNpcDisplayName } from '@/utils/npcLabels';

const POSES: Record<string, SpritePose> = { idle: 'idle', draw: 'aim', fire: 'shoot', hit: 'defeat' };
const SIGNALS: Record<string, DuelSignalBoardPhase> = { ready: '준비', steady: '집중', fake: '페이크', bang: '뱅', result: '결과' };

/**
 * DEV-only fixed-frame duel QA for the redesigned characters. Never submits a match.
 * ?npc=20&player=2&pose=idle|draw|fire|hit&at=<ms of the hit timeline>&final=1&opp=4&signal=bang&echo=1
 * ?npc=1&player=2&mode=preduel
 */
export default function RedesignDuelCapture() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ npc?: string; player?: string; mode?: string; pose?: string; at?: string; final?: string; opp?: string; signal?: string; echo?: string; background?: string; play?: string; playerDefeated?: string; pshot?: string }>();
  // play=survive|final: idle 1.2s -> draw 0.7s -> fire 0.5s -> idle 0.8s -> hit (arena runs its own timeline)
  const [step, setStep] = useState(0);
  const playing = params.play === 'survive' || params.play === 'final';
  useEffect(() => {
    if (!playing) return;
    setStep(0);
    const timers = [1200, 1900, 2400, 3200].map((ms, i) => setTimeout(() => setStep(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, [playing, params.npc, params.opp, params.play]);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (!CAPTURE_ROUTES_ENABLED) return <Redirect href="/" />;
  const npc = getNpcById(Number(params.npc) || 9) ?? getNpcById(9);
  if (!npc) return <Redirect href="/" />;
  const opponentCharacterId = params.opp != null ? Number(params.opp) : undefined;
  const backgroundId = ['twilight', 'canyon', 'moonlit'].includes(params.background ?? '')
    ? params.background as DuelBackgroundId : undefined;
  const pose = playing ? ((params.pshot === '1' ? ['idle', 'idle', 'idle', 'idle', 'defeat'] : ['idle', 'aim', 'shoot', 'idle', 'defeat']) as SpritePose[])[step]! : POSES[params.pose ?? 'idle'] ?? 'idle';
  const final = playing ? params.play === 'final' : params.final === '1';
  const hit = pose === 'defeat';
  // pshot=1 (with play=): READY -> STEADY -> BANG + player shot -> hit, to QA the player's own stage art.
  const playerShotPlay = playing && params.pshot === '1';
  const playerShot = playerShotPlay && step === 2;
  const npcStage = playing ? undefined : hit ? stageAt(npcTimeline(final ? 0 : 1), Math.max(0, Number(params.at) || 0), 'none') : undefined;
  const playerId = Math.min(4, Math.max(1, Number(params.player) || 1));
  if (params.mode === 'preduel') {
    return (
      <NpcPreDuelScreen
        width={width}
        height={height}
        paddingTop={insets.top + 8}
        paddingBottom={insets.bottom}
        paddingLeft={16}
        playerId={playerId}
        npcId={npc.id}
        opponentName={getNpcDisplayName(t, npc.id)}
        backgroundId={backgroundId ?? 'twilight'}
        onBack={() => router.replace('/npc-select')}
        onStart={() => router.replace({ pathname: '/game/npc', params: { npcId: String(npc.id) } })}
      />
    );
  }
  return (
    <View style={styles.root}>
      <NpcFirstPersonDuelArena
        key={JSON.stringify({ ...params, play: undefined })}
        width={width} height={height}
        paddingTop={insets.top + 8} paddingBottom={insets.bottom}
        paddingLeft={16} paddingRight={16}
        npcId={npc.id} tier={npc.tier} bossFlag={npc.bossFlag}
        dayNight={npc.id === 22 ? 'night' : 'day'}
        backgroundId={backgroundId}
        npcPose={pose}
        npcVictoryActive={false} playerDefeated={params.playerDefeated === '1'}
        playerShotActive={playerShot} npcShotActive={pose === 'shoot'}
        playerCharacterId={playerId}
        signalPhase={playerShotPlay ? (['준비', '집중', '뱅', '뱅', '결과'] as const)[step]! : playing ? (pose === 'shoot' ? '뱅' : hit ? '결과' : '집중') : SIGNALS[params.signal ?? (hit ? 'result' : 'steady')] ?? '집중'}
        blindBangText={false} hideBangText={false} voidShroud={false}
        echoBangMiddleSignal={false} specialPresentation={params.echo === '1' ? 'echo' : null}
        opponentHearts={hit ? (final ? 0 : 1) : 3} playerHearts={params.playerDefeated === '1' ? 0 : 3}
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
