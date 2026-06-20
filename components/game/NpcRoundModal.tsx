import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { LocalDuelFireworks } from '@/components/game/LocalDuelFireworks';
import {
  OUTCOME_DEFEAT,
  OUTCOME_VICTORY,
  outcomeTextShadow,
} from '@/constants/outcomeTheme';
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
    data.npcMs != null ? `상대 ${formatReactionMs(data.npcMs)} ms` : '상대 —';
  return `${playerPart}  ·  ${npcPart}`;
}

function lossReasonShort(reason: NpcRoundLossReason): string {
  switch (reason) {
    case 'early':
      return '얼리 탭';
    case 'timeout':
      return '시간 초과';
    case 'slower':
      return '더 느림';
  }
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

  if (!visible || !data) return null;

  const showWinFx = data.kind === 'win' && winBurstId > 0;
  const playerWon = data.kind === 'win';
  const theme = playerWon ? OUTCOME_VICTORY : OUTCOME_DEFEAT;

  return (
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

          <View pointerEvents="none" style={styles.badgesLayer}>
            {playerWon ? (
              <Animated.View
                entering={FadeIn.duration(220)}
                style={[styles.badge, styles.playerBadge, { borderColor: theme.badgeBorder, backgroundColor: theme.badgeBg }]}
              >
                <Text style={[styles.badgeTitle, { fontFamily: FONT_RYE, color: theme.title }]}>승리</Text>
                {data.kind === 'win' && data.lastStand ? (
                  <Text style={styles.badgeHint}>라스트 스탠드</Text>
                ) : null}
              </Animated.View>
            ) : (
              <Animated.View
                entering={FadeInDown.duration(220)}
                style={[styles.badge, styles.npcBadge, { borderColor: theme.badgeBorder, backgroundColor: theme.badgeBg }]}
              >
                <Text style={[styles.badgeTitle, { fontFamily: FONT_RYE, color: theme.title }]}>패배</Text>
                {data.kind === 'loss' ? (
                  <Text style={styles.badgeHint}>{lossReasonShort(data.reason)}</Text>
                ) : null}
              </Animated.View>
            )}

            {!playerWon ? (
              <Animated.View
                entering={FadeInDown.delay(80).duration(220)}
                style={[styles.badge, styles.npcWinBadge, { borderColor: OUTCOME_VICTORY.badgeBorder, backgroundColor: OUTCOME_VICTORY.badgeBg }]}
              >
                <Text style={[styles.badgeTitle, { fontFamily: FONT_RYE, color: OUTCOME_VICTORY.title }]}>
                  승리
                </Text>
              </Animated.View>
            ) : (
              <Animated.View
                entering={FadeInDown.delay(80).duration(220)}
                style={[styles.badge, styles.npcDefeatBadge, { borderColor: OUTCOME_DEFEAT.badgeBorder, backgroundColor: OUTCOME_DEFEAT.badgeBg }]}
              >
                <Text style={[styles.badgeTitle, { fontFamily: FONT_RYE, color: OUTCOME_DEFEAT.title }]}>
                  패배
                </Text>
              </Animated.View>
            )}
          </View>

          {headshotOffered && onHeadshotPress ? (
            <View pointerEvents="box-none" style={styles.headshotWrap}>
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
            </View>
          ) : null}

          <View
            pointerEvents="none"
            style={[styles.bottomPanel, { paddingBottom: Math.max(paddingBottom, 4) + 2 }]}
          >
            <View style={styles.statsCard}>
              <Text style={styles.statsLine}>
                <Text style={styles.statsHeading}>이번 라운드  </Text>
                {bottomStatsLine(data)}
              </Text>
            </View>
            <Text style={styles.continueHint}>탭하여 계속</Text>
          </View>
        </View>
      </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  stageFrame: {
    position: 'absolute',
    overflow: 'hidden',
  },
  fxLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  badgesLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  badge: {
    position: 'absolute',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 120,
    gap: 4,
  },
  playerBadge: {
    left: '7%',
    bottom: '42%',
  },
  npcBadge: {
    left: '7%',
    bottom: '30%',
  },
  npcWinBadge: {
    right: '6%',
    top: '36%',
    minWidth: 108,
    paddingVertical: 10,
  },
  npcDefeatBadge: {
    right: '8%',
    top: '47%',
    minWidth: 108,
    paddingVertical: 10,
  },
  badgeTitle: {
    fontSize: 32,
    letterSpacing: 2,
    ...outcomeTextShadow,
  },
  badgeTitleSmall: {
    fontSize: 22,
    letterSpacing: 1.5,
    ...outcomeTextShadow,
  },
  badgeHint: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.sand,
    letterSpacing: 0.5,
    ...outcomeTextShadow,
  },
  headshotWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 72,
    zIndex: 3,
    alignItems: 'center',
  },
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingTop: 6,
    backgroundColor: 'rgba(8, 5, 3, 0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 165, 116, 0.28)',
  },
  statsCard: {
    width: '100%',
    paddingVertical: 2,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  statsHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.sand,
    letterSpacing: 0.8,
    ...outcomeTextShadow,
  },
  statsLine: {
    color: colors.cream,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
    ...outcomeTextShadow,
  },
  continueHint: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(245, 230, 200, 0.5)',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  headshotBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
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
