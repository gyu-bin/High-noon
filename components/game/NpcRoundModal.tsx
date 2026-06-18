import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { LocalDuelFireworks } from '@/components/game/LocalDuelFireworks';
import { FONT_RYE } from '@/constants/fonts';
import { colors } from '@/constants/theme';
import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';
import { formatReactionMs } from '@/utils/formatReactionMs';

export type NpcRoundLossReason = 'early' | 'timeout' | 'slower';

export type NpcRoundModalData =
  | {
      kind: 'win';
      playerMs: number;
      npcMs: number | null;
      npcMisfire?: boolean;
      lastStand?: boolean;
    }
  | {
      kind: 'loss';
      reason: NpcRoundLossReason;
      playerMs: number | null;
      npcMs: number | null;
      revive?: boolean;
    };

type Props = {
  visible: boolean;
  data: NpcRoundModalData | null;
  onContinue: () => void;
  winBurstId: number;
  headshotOffered?: boolean;
  onHeadshotPress?: () => void;
  paddingBottom?: number;
};

function bottomStatsLine(data: NpcRoundModalData): string {
  if (data.kind === 'win') {
    const npcPart = data.npcMisfire
      ? '상대 오발'
      : data.npcMs != null
        ? `상대 ${formatReactionMs(data.npcMs)} ms`
        : '상대 —';
    return `나 ${formatReactionMs(data.playerMs)} ms  ·  ${npcPart}`;
  }

  const playerPart =
    data.playerMs != null ? `나 ${formatReactionMs(data.playerMs)} ms` : '나 —';
  const npcPart =
    data.npcMs != null && data.reason === 'slower'
      ? `상대 ${formatReactionMs(data.npcMs)} ms`
      : data.npcMs != null
        ? `상대 ${formatReactionMs(data.npcMs)} ms`
        : '상대 —';
  return `${playerPart}  ·  ${npcPart}`;
}

export function NpcRoundModal({
  visible,
  data,
  onContinue,
  winBurstId,
  headshotOffered = false,
  onHeadshotPress,
  paddingBottom = 0,
}: Props) {
  const m = usePhoneStageMetrics();
  const halfH = m.stageHeight / 2;

  if (!data) return null;

  const showWinFx = data.kind === 'win' && winBurstId > 0;
  const playerWon = data.kind === 'win';

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onContinue}>
      <Pressable
        accessibilityLabel="탭하여 계속"
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
          {showWinFx ? (
            <View style={styles.fxLayer} pointerEvents="none">
              <LocalDuelFireworks
                origin="bottom"
                width={m.stageWidth}
                height={m.stageHeight}
                halfH={halfH}
                burstId={winBurstId}
              />
            </View>
          ) : null}

          {/* 이긴 쪽 / 패배 쪽 짧은 라벨 */}
          <View pointerEvents="none" style={styles.labelsLayer}>
            {playerWon ? (
              <Text style={[styles.outcomeLabel, styles.playerLabel]}>승리!</Text>
            ) : (
              <Text style={[styles.outcomeLabel, styles.npcLabel]}>승리!</Text>
            )}
            {data.kind === 'win' && data.lastStand ? (
              <Text style={[styles.abilityHint, styles.playerLabel]}>라스트 스탠드!</Text>
            ) : null}
            {data.kind === 'loss' && data.revive ? (
              <Text style={[styles.abilityHint, styles.playerLabel]}>한 번 더!</Text>
            ) : null}
            {data.kind === 'loss' ? (
              <Text style={[styles.lossReason, styles.lossReasonPos]}>
                {data.reason === 'early' && '얼리 탭'}
                {data.reason === 'timeout' && '시간 초과'}
                {data.reason === 'slower' && '더 느림'}
              </Text>
            ) : null}
          </View>

          {/* 하단 반응속도 — 결투 HUD와 분리 */}
          <View
            pointerEvents="box-none"
            style={[styles.bottomBar, { paddingBottom: Math.max(paddingBottom, 8) + 12 }]}
          >
            {headshotOffered && onHeadshotPress ? (
              <Pressable
                accessibilityLabel="헤드샷 사용"
                accessibilityRole="button"
                onPress={(e) => {
                  e.stopPropagation?.();
                  onHeadshotPress();
                }}
                style={styles.headshotBtn}
              >
                <Text style={styles.headshotText}>헤드샷</Text>
              </Pressable>
            ) : null}
            <Text style={styles.statsLine}>{bottomStatsLine(data)}</Text>
            <Text style={styles.continueHint}>탭하여 계속</Text>
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
  outcomeLabel: {
    position: 'absolute',
    fontFamily: FONT_RYE,
    fontSize: 34,
    letterSpacing: 1,
    color: colors.ochre,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  playerLabel: {
    left: '8%',
    bottom: '38%',
  },
  npcLabel: {
    right: '8%',
    top: '30%',
    textAlign: 'right',
  },
  abilityHint: {
    position: 'absolute',
    left: '8%',
    bottom: '33%',
    fontSize: 13,
    fontWeight: '800',
    color: colors.ochre,
    letterSpacing: 0.6,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  lossReason: {
    position: 'absolute',
    left: '8%',
    bottom: '33%',
    fontSize: 12,
    fontWeight: '700',
    color: colors.sand,
    opacity: 0.9,
    letterSpacing: 0.4,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  lossReasonPos: {
    bottom: '33%',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'rgba(12, 8, 5, 0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 165, 116, 0.35)',
  },
  statsLine: {
    color: colors.cream,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  continueHint: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(245, 230, 200, 0.55)',
    letterSpacing: 0.8,
  },
  headshotBtn: {
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.rustRed,
    borderWidth: 1,
    borderColor: 'rgba(245, 230, 200, 0.45)',
  },
  headshotText: {
    color: colors.cream,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1.2,
  },
});
