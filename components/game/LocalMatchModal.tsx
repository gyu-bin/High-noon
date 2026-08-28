import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { LocalDuelFireworks } from '@/components/game/LocalDuelFireworks';
import { OutcomeBackdrop } from '@/components/result/OutcomeBackdrop';
import { FONT_RYE } from '@/constants/fonts';
import type { DuelBackgroundVariant } from '@/constants/duelBackgroundVariants';
import {
  OUTCOME_PANEL,
  OUTCOME_VICTORY,
  outcomeTextShadow,
} from '@/constants/outcomeTheme';
import { colors } from '@/constants/theme';

type Props = {
  visible: boolean;
  matchWinner: 'p1' | 'p2';
  p1Wins: number;
  p2Wins: number;
  winsNeeded: number;
  onExit: () => void;
  fxBurstId: number;
  backgroundVariant: DuelBackgroundVariant;
  width: number;
  height: number;
  paddingBottom?: number;
  paddingTop?: number;
};

export function LocalMatchModal({
  visible,
  matchWinner,
  p1Wins,
  p2Wins,
  winsNeeded,
  onExit,
  fxBurstId,
  backgroundVariant,
  width,
  height,
  paddingBottom = 0,
  paddingTop = 0,
}: Props) {
  const { t } = useTranslation();
  const p1Won = matchWinner === 'p1';
  const winnerLabel = matchWinner === 'p1' ? 'P1' : 'P2';
  const landscape = width > height;

  const winOrigin: 'top' | 'bottom' | 'left' | 'right' = landscape
    ? p1Won
      ? 'left'
      : 'right'
    : p1Won
      ? 'bottom'
      : 'top';

  return (
    <Modal
      transparent={false}
      animationType="fade"
      visible={visible}
      onRequestClose={onExit}
      supportedOrientations={['portrait', 'landscape']}
    >
      <OutcomeBackdrop variant={backgroundVariant} width={width} height={height}>
        <Pressable
          accessibilityLabel={t('game.tapToExit')}
          accessibilityRole="button"
          onPress={onExit}
          style={styles.root}
        >
          {fxBurstId > 0 ? (
            <View style={styles.fxLayer} pointerEvents="none">
              <LocalDuelFireworks
                origin={winOrigin}
                width={width}
                height={height}
                halfH={height / 2}
                burstId={fxBurstId}
              />
            </View>
          ) : null}

          <View
            style={[
              styles.content,
              {
                paddingTop: Math.max(paddingTop, 16) + 12,
                paddingBottom: Math.max(paddingBottom, 12) + 16,
              },
            ]}
          >
            <Animated.View
              entering={FadeInDown.duration(420).springify().damping(18)}
              style={[styles.panel, { borderColor: OUTCOME_VICTORY.badgeBorder }]}
            >
              <View style={[styles.accentBar, { backgroundColor: OUTCOME_VICTORY.accent }]} />

              <Text style={[styles.eyebrow, { fontFamily: FONT_RYE }]}>
                {t('localDuel.matchWinTitle')}
              </Text>
              <Text style={[styles.title, { fontFamily: FONT_RYE, color: OUTCOME_VICTORY.title }]}>
                {t('localDuel.matchWinPlayer', { player: winnerLabel })}
              </Text>
              <Text style={styles.subtitle}>{t('result.wonDuel')}</Text>

              <View style={styles.scorePill}>
                <Text style={styles.scoreLabel}>{t('result.finalScore')}</Text>
                <Text style={[styles.scoreValue, { fontFamily: FONT_RYE }]}>
                  {p1Wins} — {p2Wins}
                </Text>
              </View>

              <Text style={styles.metaLine}>
                {t('localDuel.matchScoreLine', { p1: p1Wins, p2: p2Wins, wins: winsNeeded })}
              </Text>

              <View style={styles.playerRows}>
                <View style={[styles.playerRow, p1Won && styles.playerRowWin]}>
                  <Text style={[styles.playerTag, p1Won && styles.playerTagWin]}>P1</Text>
                  <Text style={[styles.playerOutcome, p1Won ? styles.winText : styles.loseText]}>
                    {p1Won ? t('result.finalVictory') : t('result.defeat')}
                  </Text>
                  <Text style={styles.playerWins}>{t('localDuel.p1Wins', { wins: p1Wins })}</Text>
                </View>
                <View style={[styles.playerRow, !p1Won && styles.playerRowWin]}>
                  <Text style={[styles.playerTag, !p1Won && styles.playerTagWin]}>P2</Text>
                  <Text style={[styles.playerOutcome, !p1Won ? styles.winText : styles.loseText]}>
                    {!p1Won ? t('result.finalVictory') : t('result.defeat')}
                  </Text>
                  <Text style={styles.playerWins}>{t('localDuel.p2Wins', { wins: p2Wins })}</Text>
                </View>
              </View>

              <Text style={styles.continueHint}>{t('game.tapToExit')}</Text>
            </Animated.View>
          </View>
        </Pressable>
      </OutcomeBackdrop>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  fxLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    zIndex: 4,
  },
  panel: {
    borderRadius: OUTCOME_PANEL.borderRadius,
    backgroundColor: OUTCOME_PANEL.background,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 20,
    gap: 12,
    overflow: 'hidden',
  },
  accentBar: {
    height: 3,
    marginHorizontal: -20,
    marginBottom: 4,
  },
  eyebrow: {
    textAlign: 'center',
    fontSize: 20,
    color: colors.sand,
    letterSpacing: 1,
    marginTop: 6,
    ...outcomeTextShadow,
  },
  title: {
    fontSize: 40,
    textAlign: 'center',
    letterSpacing: 2,
    ...outcomeTextShadow,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: colors.sand,
    ...outcomeTextShadow,
  },
  scorePill: {
    alignSelf: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.3)',
    gap: 2,
    marginTop: 4,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.sand,
    letterSpacing: 1.2,
  },
  scoreValue: {
    fontSize: 28,
    color: colors.gold,
    letterSpacing: 2,
    ...outcomeTextShadow,
  },
  metaLine: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: colors.sand,
    opacity: 0.9,
    ...outcomeTextShadow,
  },
  playerRows: {
    gap: 10,
    marginTop: 4,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.18)',
  },
  playerRowWin: {
    borderColor: 'rgba(232, 168, 42, 0.45)',
    backgroundColor: 'rgba(48, 28, 8, 0.35)',
  },
  playerTag: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.sand,
    letterSpacing: 1,
    minWidth: 28,
  },
  playerTagWin: {
    color: colors.ochre,
  },
  playerOutcome: {
    flex: 1,
    fontFamily: FONT_RYE,
    fontSize: 20,
    letterSpacing: 0.5,
    ...outcomeTextShadow,
  },
  winText: {
    color: colors.ochre,
  },
  loseText: {
    color: colors.sand,
    opacity: 0.88,
  },
  playerWins: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.cream,
    ...outcomeTextShadow,
  },
  continueHint: {
    textAlign: 'center',
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(245, 230, 200, 0.55)',
    letterSpacing: 0.8,
  },
});
