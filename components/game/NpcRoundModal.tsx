import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

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
      headshot?: boolean;
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
  paddingBottom?: number;
};

function getLossReasonShortKey(reason: NpcRoundLossReason): string {
  switch (reason) {
    case 'early':
      return 'lossShort.early';
    case 'timeout':
      return 'lossShort.timeout';
    case 'slower':
      return 'lossShort.slower';
  }
}

export function NpcRoundModal({
  visible,
  data,
  onContinue,
  winBurstId,
  paddingBottom = 0,
}: Props) {
  const { t } = useTranslation();
  const m = usePhoneStageMetrics();

  const getBottomStatsLine = (d: NpcRoundModalData): string => {
    const me = t('result.me');
    const opp = t('result.opponent');
    if (d.kind === 'win') {
      const npcPart = d.npcMisfire
        ? t('loss.opponentEarly')
        : d.npcMs != null
          ? `${opp} ${formatReactionMs(d.npcMs)} ms`
          : `${opp} —`;
      return `${me} ${formatReactionMs(d.playerMs)} ms  ·  ${npcPart}`;
    }
    const playerPart = d.playerMs != null ? `${me} ${formatReactionMs(d.playerMs)} ms` : `${me} —`;
    const npcPart = d.npcMs != null ? `${opp} ${formatReactionMs(d.npcMs)} ms` : `${opp} —`;
    return `${playerPart}  ·  ${npcPart}`;
  };

  if (!visible || !data) return null;

  const showWinFx = data.kind === 'win' && winBurstId > 0;
  const playerWon = data.kind === 'win';
  const theme = playerWon ? OUTCOME_VICTORY : OUTCOME_DEFEAT;

  // 가로모드 — 스테이지 프레임 대신 전체 화면 기준, 배지를 좌/우 캐릭터 위로
  const landscape = m.windowWidth > m.windowHeight;
  const frame = landscape
    ? { left: 0, top: 0, width: m.windowWidth, height: m.windowHeight }
    : {
        left: m.offsetX,
        top: m.offsetY,
        width: m.stageWidth,
        height: m.stageHeight,
      };

  return (
    <Pressable
      accessibilityLabel={t('game.tapToContinue')}
      accessibilityRole="button"
      onPress={onContinue}
      style={styles.root}
    >
        <View
          pointerEvents="box-none"
          style={[styles.stageFrame, frame]}
        >
          {showWinFx ? (
            <View style={styles.fxLayer} pointerEvents="none">
              <LocalDuelFireworks
                origin="bottom"
                width={frame.width}
                height={frame.height}
                halfH={frame.height / 2}
                burstId={winBurstId}
              />
            </View>
          ) : null}

          <View pointerEvents="none" style={styles.badgesLayer}>
            {playerWon ? (
              <Animated.View
                entering={FadeIn.duration(220)}
                style={[styles.badge, styles.playerBadge, landscape && styles.playerBadgeLandscape, { borderColor: theme.badgeBorder, backgroundColor: theme.badgeBg }]}
              >
                <Text style={[styles.badgeTitle, { fontFamily: FONT_RYE, color: theme.title }]}>{t('result.victory')}</Text>
                {data.kind === 'win' && data.lastStand ? (
                  <Text style={styles.badgeHint}>{t('result.lastStand')}</Text>
                ) : null}
                {data.kind === 'win' && data.headshot ? (
                  <Text style={styles.badgeHint}>{t('result.headshot')}</Text>
                ) : null}
              </Animated.View>
            ) : (
              <Animated.View
                entering={FadeInDown.duration(220)}
                style={[styles.badge, styles.npcBadge, landscape && styles.playerBadgeLandscape, { borderColor: theme.badgeBorder, backgroundColor: theme.badgeBg }]}
              >
                <Text style={[styles.badgeTitle, { fontFamily: FONT_RYE, color: theme.title }]}>{t('result.defeat')}</Text>
                {data.kind === 'loss' ? (
                  <Text style={styles.badgeHint}>{t(getLossReasonShortKey(data.reason))}</Text>
                ) : null}
              </Animated.View>
            )}

            {!playerWon ? (
              <Animated.View
                entering={FadeInDown.delay(80).duration(220)}
                style={[styles.badge, styles.npcWinBadge, landscape && styles.npcBadgeLandscape, { borderColor: OUTCOME_VICTORY.badgeBorder, backgroundColor: OUTCOME_VICTORY.badgeBg }]}
              >
                <Text style={[styles.badgeTitle, { fontFamily: FONT_RYE, color: OUTCOME_VICTORY.title }]}>
                  {t('result.victory')}
                </Text>
              </Animated.View>
            ) : (
              <Animated.View
                entering={FadeInDown.delay(80).duration(220)}
                style={[styles.badge, styles.npcDefeatBadge, landscape && styles.npcBadgeLandscape, { borderColor: OUTCOME_DEFEAT.badgeBorder, backgroundColor: OUTCOME_DEFEAT.badgeBg }]}
              >
                <Text style={[styles.badgeTitle, { fontFamily: FONT_RYE, color: OUTCOME_DEFEAT.title }]}>
                  {t('result.defeat')}
                </Text>
              </Animated.View>
            )}
          </View>

          <View
            pointerEvents="none"
            style={
              landscape
                ? [styles.bottomPanelLandscape, { bottom: Math.max(paddingBottom, 8) + 6 }]
                : [styles.bottomPanel, { paddingBottom: Math.max(paddingBottom, 4) + 2 }]
            }
          >
            <View style={styles.statsCard}>
              <Text style={styles.statsLine}>
                <Text style={styles.statsHeading}>{t('result.thisRound')}</Text>
                {getBottomStatsLine(data)}
              </Text>
            </View>
            <Text style={styles.continueHint}>{t('game.tapToContinue')}</Text>
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
  /* 승리 시 — 쓰러진 NPC(화면 38~57% 부근)를 가리지 않게 시체 위 하늘에 표시 */
  npcDefeatBadge: {
    right: '8%',
    top: '26%',
    minWidth: 108,
    paddingVertical: 10,
  },
  /* 가로모드 — 배지를 좌(플레이어)·우(NPC) 캐릭터 머리 위로 */
  playerBadgeLandscape: {
    left: '8%',
    right: undefined,
    top: undefined,
    bottom: '60%',
  },
  npcBadgeLandscape: {
    right: '8%',
    left: undefined,
    top: '14%',
    bottom: undefined,
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
  /* 가로모드 — 좌우 쓰러진 캐릭터를 가리지 않는 중앙 콤팩트 카드 */
  bottomPanelLandscape: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 3,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 6,
    backgroundColor: 'rgba(8, 5, 3, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.28)',
    borderRadius: 14,
    maxWidth: '46%',
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
});
