import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LocalDuelFireworks } from '@/components/game/LocalDuelFireworks';
import { SceneBackground } from '@/components/game/SceneBackground';
import { PhoneStageShell } from '@/components/layout/PhoneStageShell';
import { gameImages } from '@/constants/gameImages';
import { colors } from '@/constants/theme';
import { FONT_RYE } from '@/constants/fonts';
import { getNpcById } from '@/constants/npcs';
import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';

export default function NpcResultScreen() {
  const router = useRouter();
  const { stageWidth: winW, stageHeight: winH } = usePhoneStageMetrics();
  const halfH = winH / 2;
  const { npcId, won, playerWins, npcWins } = useLocalSearchParams<{
    npcId?: string;
    won?: string;
    playerWins?: string;
    npcWins?: string;
  }>();

  const id = Number(npcId);
  const npc = getNpcById(id);
  const victory = won === '1';
  const bg = victory ? gameImages.winScreen : gameImages.loseScreen;

  return (
    <PhoneStageShell>
    <SceneBackground
      source={bg}
      style={{ width: winW, height: winH }}
      contentWidth={winW}
      contentHeight={winH}
      dimColor="rgba(20, 12, 8, 0.5)"
    >
      {victory ? (
        <LocalDuelFireworks
          origin="bottom"
          width={winW}
          height={winH}
          halfH={halfH}
          burstId={id * 97 + 1}
        />
      ) : null}
      <View style={styles.content}>
        <Text style={[styles.title, { fontFamily: FONT_RYE }]}>
          {victory ? '사냥 성공' : '패배'}
        </Text>
        {npc ? (
          <Text style={styles.sub}>
            vs {npc.title} {npc.name}
          </Text>
        ) : null}
        <Text style={styles.score}>
          점수 {playerWins ?? '0'} — {npcWins ?? '0'}
        </Text>

        <Pressable
          onPress={() => router.dismissTo('/npc-select')}
          style={styles.btn}
        >
          <Text style={styles.btnText}>NPC 선택</Text>
        </Pressable>
      </View>
    </SceneBackground>
    </PhoneStageShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 28,
    justifyContent: 'center',
    gap: 14,
    zIndex: 4,
  },
  title: {
    fontSize: 36,
    color: colors.ochre,
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  sub: {
    fontSize: 18,
    color: colors.cream,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  score: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.sand,
    marginTop: 8,
  },
  btn: {
    marginTop: 28,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.ochre,
  },
  btnText: {
    textAlign: 'center',
    fontWeight: '800',
    color: colors.darkBrown,
    fontSize: 17,
  },
});
