import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { LocalDuelFireworks } from '@/components/game/LocalDuelFireworks';
import { FONT_RYE } from '@/constants/fonts';
import { colors } from '@/constants/theme';
import type { LocalRoundOutcome } from '@/hooks/useLocalDuelEngine';
import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';

type Props = {
  visible: boolean;
  matchWinner: 'p1' | 'p2';
  p1Wins: number;
  p2Wins: number;
  lastOutcome: LocalRoundOutcome | null;
  onExit: () => void;
  fxBurstId: number;
  paddingBottom?: number;
};

export function LocalMatchModal({
  visible,
  matchWinner,
  p1Wins,
  p2Wins,
  lastOutcome,
  onExit,
  fxBurstId,
  paddingBottom = 0,
}: Props) {
  const m = usePhoneStageMetrics();
  const halfH = m.stageHeight / 2;
  const p1Won = matchWinner === 'p1';

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onExit}>
      <Pressable
        accessibilityLabel="탭하여 나가기"
        accessibilityRole="button"
        onPress={onExit}
        style={styles.root}
      >
        <View
          pointerEvents="box-none"
          style={[
            styles.stageFrame,
            {
              left: m.offsetX,
              top: m.offsetY,
              width: m.stageWidth,
              height: m.stageHeight,
            },
          ]}
        >
          {fxBurstId > 0 ? (
            <View style={styles.fxLayer} pointerEvents="none">
              <LocalDuelFireworks
                origin={p1Won ? 'bottom' : 'top'}
                width={m.stageWidth}
                height={m.stageHeight}
                halfH={halfH}
                burstId={fxBurstId}
              />
            </View>
          ) : null}

          <View pointerEvents="none" style={styles.labelsLayer}>
            <View style={styles.p2Block}>
              <Text style={[styles.outcomeLabel, !p1Won ? styles.winText : styles.loseText]}>
                {!p1Won ? '최종 승리!' : '패배'}
              </Text>
              <Text style={styles.statsText}>P2 · {p2Wins}승</Text>
            </View>
            <View style={styles.p1Block}>
              <Text style={[styles.outcomeLabel, p1Won ? styles.winText : styles.loseText]}>
                {p1Won ? '최종 승리!' : '패배'}
              </Text>
              <Text style={styles.statsText}>P1 · {p1Wins}승</Text>
            </View>
          </View>

          <View
            pointerEvents="none"
            style={[styles.bottomBar, { paddingBottom: Math.max(paddingBottom, 8) + 10 }]}
          >
            {lastOutcome ? (
              <Text style={styles.lastRound}>
                마지막 라운드 · P1 {p1Wins} — {p2Wins} P2
              </Text>
            ) : null}
            <Text style={styles.continueHint}>탭하여 나가기</Text>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stageFrame: { position: 'absolute', overflow: 'hidden' },
  fxLayer: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  labelsLayer: { ...StyleSheet.absoluteFillObject, zIndex: 2 },
  p2Block: {
    position: 'absolute',
    top: '20%',
    right: '8%',
    alignItems: 'flex-end',
    gap: 4,
    transform: [{ rotate: '180deg' }],
  },
  p1Block: {
    position: 'absolute',
    left: '8%',
    bottom: '36%',
    alignItems: 'flex-start',
    gap: 4,
  },
  outcomeLabel: {
    fontFamily: FONT_RYE,
    fontSize: 30,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  winText: { color: colors.ochre },
  loseText: { color: colors.sand, opacity: 0.92 },
  statsText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.cream,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: 'rgba(12, 8, 5, 0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 165, 116, 0.35)',
  },
  lastRound: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.sand,
    marginBottom: 4,
  },
  continueHint: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(245, 230, 200, 0.55)',
    letterSpacing: 0.8,
  },
});
