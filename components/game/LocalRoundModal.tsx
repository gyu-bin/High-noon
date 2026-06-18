import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { LocalDuelFireworks } from '@/components/game/LocalDuelFireworks';
import { FONT_RYE } from '@/constants/fonts';
import { colors } from '@/constants/theme';
import type {
  LocalPlayerRoundState,
  LocalRoundOutcome,
} from '@/hooks/useLocalDuelEngine';
import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';
import { formatReactionMs } from '@/utils/formatReactionMs';

type Props = {
  visible: boolean;
  outcome: LocalRoundOutcome | null;
  onContinue: () => void;
  fxBurstId: number;
  paddingBottom?: number;
};

function resultLine(s: LocalPlayerRoundState): string {
  if (s.earlyTap) return '얼리 탭';
  if (s.timeout) return '타임아웃';
  if (s.reactionMs != null) return `${formatReactionMs(s.reactionMs)} ms`;
  return '—';
}

function lossReason(s: LocalPlayerRoundState): string | null {
  if (s.earlyTap) return '얼리 탭';
  if (s.timeout) return '시간 초과';
  return null;
}

export function LocalRoundModal({
  visible,
  outcome,
  onContinue,
  fxBurstId,
  paddingBottom = 0,
}: Props) {
  const m = usePhoneStageMetrics();
  const halfH = m.stageHeight / 2;

  if (!outcome) return null;

  const p1Won = outcome.winner === 'p1';
  const p2Won = outcome.winner === 'p2';
  const draw = outcome.winner === 'draw';
  const p1Loss = lossReason(outcome.p1);
  const p2Loss = lossReason(outcome.p2);

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onContinue}>
      <Pressable
        accessibilityLabel="탭하여 다음 라운드"
        accessibilityRole="button"
        onPress={onContinue}
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
          {p1Won && fxBurstId > 0 ? (
            <View style={styles.fxLayer} pointerEvents="none">
              <LocalDuelFireworks
                origin="bottom"
                width={m.stageWidth}
                height={m.stageHeight}
                halfH={halfH}
                burstId={fxBurstId}
              />
            </View>
          ) : null}
          {p2Won && fxBurstId > 0 ? (
            <View style={styles.fxLayer} pointerEvents="none">
              <LocalDuelFireworks
                origin="top"
                width={m.stageWidth}
                height={m.stageHeight}
                halfH={halfH}
                burstId={fxBurstId}
              />
            </View>
          ) : null}

          <View pointerEvents="none" style={styles.labelsLayer}>
            {/* P2 — 상단 플레이어용 (180°) */}
            <View style={styles.p2Block}>
              <Text style={[styles.outcomeLabel, p2Won ? styles.winText : styles.loseText]}>
                {draw ? '무승부' : p2Won ? '승리!' : '패배'}
              </Text>
              <Text style={styles.statsText}>P2 · {resultLine(outcome.p2)}</Text>
              {!p2Won && p2Loss ? (
                <Text style={styles.reasonText}>{p2Loss}</Text>
              ) : null}
            </View>

            {/* P1 — 하단 플레이어용 */}
            <View style={styles.p1Block}>
              <Text style={[styles.outcomeLabel, p1Won ? styles.winText : styles.loseText]}>
                {draw ? '무승부' : p1Won ? '승리!' : '패배'}
              </Text>
              <Text style={styles.statsText}>P1 · {resultLine(outcome.p1)}</Text>
              {!p1Won && p1Loss ? (
                <Text style={styles.reasonText}>{p1Loss}</Text>
              ) : null}
            </View>
          </View>

          <View
            pointerEvents="none"
            style={[styles.bottomBar, { paddingBottom: Math.max(paddingBottom, 8) + 10 }]}
          >
            <Text style={styles.continueHint}>탭하여 다음 라운드</Text>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  stageFrame: {
    position: 'absolute',
    overflow: 'hidden',
  },
  fxLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  labelsLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
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
    fontSize: 32,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  winText: {
    color: colors.ochre,
  },
  loseText: {
    color: colors.sand,
    opacity: 0.92,
  },
  statsText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.cream,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  reasonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.sand,
    opacity: 0.88,
    letterSpacing: 0.4,
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
  continueHint: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(245, 230, 200, 0.55)',
    letterSpacing: 0.8,
  },
});
