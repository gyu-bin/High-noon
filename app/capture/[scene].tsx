import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import type { SpritePose } from '@/components/game/CharacterSprites';
import { NpcFirstPersonDuelArena } from '@/components/game/NpcFirstPersonDuelArena';
import type { DuelSignalBoardPhase } from '@/components/game/DuelSignalBoard';
import { DuelFullBackground } from '@/components/game/DuelFullBackground';
import { DuelSplitBackground } from '@/components/game/DuelSplitBackground';
import { LocalDuelArenaLayout } from '@/components/game/LocalDuelArenaLayout';
import {
  NpcRoundModal,
  type NpcRoundModalData,
} from '@/components/game/NpcRoundModal';
import { PhoneStageShell } from '@/components/layout/PhoneStageShell';
import { getNpcById } from '@/constants/npcs';
import { usePhoneStageMetrics, phoneStageSafeOffsets } from '@/hooks/usePhoneStageMetrics';
import { prefetchDuelSprites } from '@/utils/preloadDuelSprites';

let ScreenOrientation: typeof import('expo-screen-orientation') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ScreenOrientation = require('expo-screen-orientation');
} catch {
  ScreenOrientation = null;
}

type CaptureSceneId =
  | 'duel-clarity'
  | 'duel-clarity-down'
  | 'duel-steady'
  | 'duel-bang'
  | 'duel-win'
  | 'duel-defeat'
  | 'duel-boss'
  | 'duel-landscape'
  | 'duel-landscape-defeat'
  | 'duel-landscape-win'
  | 'duel-landscape-down'
  | 'duel-landscape-npc-down'
  | 'local-duel';

type DuelFrame = {
  npcId: number;
  signalPhase: DuelSignalBoardPhase;
  npcPose: SpritePose;
  playerPose: SpritePose;
  playerCharacterId: number;
  defeatedSide?: 'player' | 'npc' | null;
  modal?: NpcRoundModalData | null;
  orientation?: 'portrait' | 'landscape';
};

const SCENES: Record<CaptureSceneId, DuelFrame | 'local'> = {
  'duel-clarity': {
    npcId: 1, signalPhase: '집중', npcPose: 'aim', playerPose: 'aim',
    playerCharacterId: 1, orientation: 'landscape',
  },
  'duel-clarity-down': {
    npcId: 1, signalPhase: '결과', npcPose: 'defeat', playerPose: 'idle',
    playerCharacterId: 1, orientation: 'landscape', defeatedSide: 'npc',
  },
  'duel-steady': {
    npcId: 1,
    signalPhase: '집중',
    npcPose: 'aim',
    playerPose: 'aim',
    playerCharacterId: 1,
  },
  'duel-bang': {
    npcId: 1,
    signalPhase: '뱅',
    npcPose: 'shoot',
    playerPose: 'shoot',
    playerCharacterId: 1,
  },
  'duel-win': {
    npcId: 1,
    signalPhase: '결과',
    npcPose: 'defeat',
    playerPose: 'idle',
    playerCharacterId: 1,
    defeatedSide: 'npc',
    modal: {
      kind: 'win',
      playerMs: 218,
      npcMs: 412,
    },
  },
  'duel-defeat': {
    npcId: 1,
    signalPhase: '결과',
    npcPose: 'idle',
    playerPose: 'defeat',
    playerCharacterId: 1,
    defeatedSide: 'player',
    modal: {
      kind: 'loss',
      reason: 'slower',
      playerMs: 486,
      npcMs: 241,
    },
  },
  'duel-boss': {
    npcId: 9,
    signalPhase: '집중',
    npcPose: 'aim',
    playerPose: 'aim',
    playerCharacterId: 2,
  },
  'duel-landscape': {
    npcId: 6,
    signalPhase: '뱅',
    npcPose: 'shoot',
    playerPose: 'shoot',
    playerCharacterId: 3,
    orientation: 'landscape',
  },
  /* 가로 패배 연출 검증 — 모달 포함/제외 */
  'duel-landscape-defeat': {
    npcId: 6,
    signalPhase: '결과',
    npcPose: 'idle',
    playerPose: 'defeat',
    playerCharacterId: 3,
    defeatedSide: 'player',
    orientation: 'landscape',
    modal: { kind: 'loss', reason: 'slower', playerMs: 486, npcMs: 241 },
  },
  'duel-landscape-win': {
    npcId: 6,
    signalPhase: '결과',
    npcPose: 'defeat',
    playerPose: 'idle',
    playerCharacterId: 3,
    defeatedSide: 'npc',
    orientation: 'landscape',
    modal: { kind: 'win', playerMs: 218, npcMs: 412 },
  },
  'duel-landscape-down': {
    npcId: 6,
    signalPhase: '결과',
    npcPose: 'defeat',
    playerPose: 'defeat',
    playerCharacterId: 3,
    defeatedSide: 'player',
    orientation: 'landscape',
  },
  'duel-landscape-npc-down': {
    npcId: 6,
    signalPhase: '결과',
    npcPose: 'defeat',
    playerPose: 'idle',
    playerCharacterId: 3,
    defeatedSide: 'npc',
    orientation: 'landscape',
  },
  'local-duel': 'local',
};

function noop() {}

function FrozenNpcDuel({ frame }: { frame: DuelFrame }) {
  const insets = useSafeAreaInsets();
  const m = usePhoneStageMetrics();
  const overlayPad = phoneStageSafeOffsets(m, insets);
  const npc = getNpcById(frame.npcId);
  const winW = m.windowWidth;
  const winH = m.windowHeight;

  if (!npc) return null;

  const modalVisible = frame.modal != null;

  return (
    <PhoneStageShell edgeToEdge>
      <DuelFullBackground
        style={{ width: winW, height: winH }}
        contentWidth={winW}
        contentHeight={winH}
        variant="day"
      >
        <NpcFirstPersonDuelArena
          width={winW}
          height={winH}
          paddingTop={overlayPad.top}
          paddingBottom={insets.bottom}
          paddingRight={overlayPad.right}
          paddingLeft={overlayPad.left}
          dayNight="day"
          npcId={npc.id}
          tier={npc.tier}
          bossFlag={npc.bossFlag}
          npcPose={frame.npcPose}
          npcVictoryActive={frame.defeatedSide === 'player'}
          playerDefeated={frame.defeatedSide === 'player'}
          playerShotActive={frame.playerPose === 'shoot'}
          signalPhase={frame.signalPhase}
          blindBangText={false}
          hideBangText={false}
          voidShroud={false}
          echoBangMiddleSignal={false}
          specialPresentation={null}
          earlyWarning={false}
          opponentHearts={2}
          playerHearts={3}
          currentRound={1}
          shootCapturesEarly={false}
          shootActive={frame.signalPhase === '뱅'}
          onShootPress={noop}
          onPause={noop}
          pauseDisabled={false}
        />

        <NpcRoundModal
          visible={modalVisible}
          data={frame.modal ?? null}
          onContinue={noop}
          onMenu={noop}
          winBurstId={modalVisible && frame.modal?.kind === 'win' ? 1 : 0}
          paddingBottom={insets.bottom}
        />
      </DuelFullBackground>
    </PhoneStageShell>
  );
}

function FrozenLocalDuel() {
  const insets = useSafeAreaInsets();
  const m = usePhoneStageMetrics();
  const overlayPad = phoneStageSafeOffsets(m, insets);
  const p1TapAck = useSharedValue(0);
  const p2TapAck = useSharedValue(0);
  const p1TapAckStyle = useAnimatedStyle(() => ({ opacity: p1TapAck.value }));
  const p2TapAckStyle = useAnimatedStyle(() => ({ opacity: p2TapAck.value }));

  return (
    <PhoneStageShell edgeToEdge>
      <DuelSplitBackground
        style={{ width: m.windowWidth, height: m.windowHeight }}
        contentWidth={m.windowWidth}
        contentHeight={m.windowHeight}
        variant="day"
      >
        <LocalDuelArenaLayout
          width={m.windowWidth}
          height={m.windowHeight}
          paddingTop={overlayPad.top}
          paddingBottom={insets.bottom}
          paddingLeft={overlayPad.left}
          paddingRight={overlayPad.right}
          phase="집중"
          signalPhase="집중"
          p1Skin={{ kind: 'player', id: 1 }}
          p2Skin={{ kind: 'player', id: 4 }}
          p1Pose="aim"
          p2Pose="aim"
          p1Hearts={2}
          p2Hearts={3}
          p1Wins={1}
          p2Wins={0}
          winsNeeded={3}
          p1TapAckStyle={p1TapAckStyle}
          p2TapAckStyle={p2TapAckStyle}
          p1LiveMs={null}
          p2LiveMs={null}
          onHalfPressIn={noop}
          onBack={noop}
          onPause={noop}
        />
      </DuelSplitBackground>
    </PhoneStageShell>
  );
}

export default function CaptureSceneScreen() {
  const { scene } = useLocalSearchParams<{ scene: string }>();
  const sceneId = scene as CaptureSceneId;
  const config = SCENES[sceneId];

  useEffect(() => {
    void prefetchDuelSprites(1, 1);
    void prefetchDuelSprites(9, 2);
    void prefetchDuelSprites(6, 3);
    void prefetchDuelSprites(1, 4);
  }, []);

  useEffect(() => {
    if (!ScreenOrientation) return;
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    return () => {
      void ScreenOrientation?.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, [sceneId]);

  const body = useMemo(() => {
    if (!config) return null;
    if (config === 'local') return <FrozenLocalDuel />;
    return <FrozenNpcDuel frame={config} />;
  }, [config]);

  if (!config) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, animation: 'none' }} />
      <View style={styles.root} accessibilityLabel="capture-ready">
        {body}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1A0C06',
  },
});
