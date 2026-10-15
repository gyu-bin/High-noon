import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { LocalDuelFireworks } from '@/components/game/LocalDuelFireworks';
import { FONT_RYE } from '@/constants/fonts';
import {
  OUTCOME_DEFEAT,
  OUTCOME_VICTORY,
  outcomeTextShadow,
} from '@/constants/outcomeTheme';
import { colors } from '@/constants/theme';
import type {
  LocalPlayerRoundState,
  LocalRoundOutcome,
} from '@/hooks/useLocalDuelEngine';
import { formatReactionMs } from '@/utils/formatReactionMs';

type Props = {
  visible: boolean;
  outcome: LocalRoundOutcome | null;
  onContinue: () => void;
  fxBurstId: number;
  width: number;
  height: number;
  paddingBottom?: number;
  paddingTop?: number;
};

function resultLine(
  s: LocalPlayerRoundState,
  t: (key: string) => string,
): string {
  if (s.earlyTap) return t('lossShort.early');
  if (s.timeout) return t('lossShort.timeout');
  if (s.reactionMs != null) return `${formatReactionMs(s.reactionMs)} ms`;
  return '—';
}

function lossReason(s: LocalPlayerRoundState, t: (key: string) => string): string | null {
  if (s.earlyTap) return t('lossShort.early');
  if (s.timeout) return t('lossShort.timeout');
  return null;
}

function RoundPanel({
  player,
  won,
  draw,
  line,
  reason,
  rotate,
}: {
  player: 'P1' | 'P2';
  won: boolean;
  draw: boolean;
  line: string;
  reason: string | null;
  rotate?: boolean;
}) {
  const { t } = useTranslation();
  const theme = won && !draw ? OUTCOME_VICTORY : OUTCOME_DEFEAT;

  return (
    <Animated.View
      entering={FadeInDown.duration(380).springify().damping(18)}
      style={[styles.panel, rotate ? styles.panelRotated : null]}
    >
      <Text style={styles.playerTag}>{player}</Text>
      <Text style={[styles.outcomeLabel, { fontFamily: FONT_RYE, color: theme.title }]}>
        {draw ? t('result.draw') : won ? t('result.roundVictory') : t('result.defeat')}
      </Text>
      <Text style={styles.statsText}>
        {player} · {line}
      </Text>
      {!won && reason ? <Text style={styles.reasonText}>{reason}</Text> : null}
    </Animated.View>
  );
}

export function LocalRoundModal({
  visible,
  outcome,
  onContinue,
  fxBurstId,
  width,
  height,
  paddingBottom = 0,
  paddingTop = 0,
}: Props) {
  const { t } = useTranslation();
  const landscape = width > height;
  const halfH = height / 2;

  if (!visible || !outcome) return null;

  const p1Won = outcome.winner === 'p1';
  const p2Won = outcome.winner === 'p2';
  const draw = outcome.winner === 'draw';
  const p1Loss = lossReason(outcome.p1, t);
  const p2Loss = lossReason(outcome.p2, t);

  return (
    <Pressable
      accessibilityLabel={t('game.tapToNextRound')}
      accessibilityRole="button"
      onPress={onContinue}
      style={styles.root}
    >
      {p1Won && fxBurstId > 0 ? (
        <View style={styles.fxLayer} pointerEvents="none">
          <LocalDuelFireworks
            origin={landscape ? 'left' : 'bottom'}
            width={width}
            height={height}
            halfH={halfH}
            burstId={fxBurstId}
          />
        </View>
      ) : null}
      {p2Won && fxBurstId > 0 ? (
        <View style={styles.fxLayer} pointerEvents="none">
          <LocalDuelFireworks
            origin={landscape ? 'right' : 'top'}
            width={width}
            height={height}
            halfH={halfH}
            burstId={fxBurstId}
          />
        </View>
      ) : null}

      {landscape ? (
        <View style={[styles.landscapeRow, { paddingTop: paddingTop + 16, paddingBottom: paddingBottom + 16 }]}>
          <RoundPanel
            player="P1"
            won={p1Won}
            draw={draw}
            line={resultLine(outcome.p1, t)}
            reason={p1Loss}
          />
          <RoundPanel
            player="P2"
            won={p2Won}
            draw={draw}
            line={resultLine(outcome.p2, t)}
            reason={p2Loss}
          />
        </View>
      ) : (
        <View style={styles.portraitStack}>
          <View style={[styles.halfTop, { paddingTop: paddingTop + 12 }]}>
            <RoundPanel
              player="P2"
              won={p2Won}
              draw={draw}
              line={resultLine(outcome.p2, t)}
              reason={p2Loss}
              rotate
            />
          </View>
          <View style={[styles.halfBottom, { paddingBottom: paddingBottom + 12 }]}>
            <RoundPanel
              player="P1"
              won={p1Won}
              draw={draw}
              line={resultLine(outcome.p1, t)}
              reason={p1Loss}
            />
          </View>
        </View>
      )}

      {landscape ? (
        <View
          pointerEvents="none"
          style={[styles.hintCenter, { bottom: Math.max(paddingBottom, 8) + 10 }]}
        >
          <Text style={styles.continueHint}>{t('game.tapToNextRound')}</Text>
        </View>
      ) : (
        <>
          <View
            pointerEvents="none"
            style={[styles.hintP1, { bottom: Math.max(paddingBottom, 8) + 10 }]}
          >
            <Text style={styles.continueHint}>{t('game.tapToNextRound')}</Text>
          </View>
          <View
            pointerEvents="none"
            style={[
              styles.hintP2,
              { top: Math.max(paddingTop, 8) + 10, transform: [{ rotate: '180deg' }] },
            ]}
          >
            <Text style={styles.continueHint}>{t('game.tapToNextRound')}</Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  fxLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  portraitStack: {
    flex: 1,
    zIndex: 2,
  },
  halfTop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    transform: [{ rotate: '180deg' }],
  },
  halfBottom: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  landscapeRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    zIndex: 2,
  },
  panel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  panelRotated: {},
  playerTag: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.sand,
    letterSpacing: 2,
    textAlign: 'center',
    ...outcomeTextShadow,
  },
  outcomeLabel: {
    fontSize: 38,
    textAlign: 'center',
    letterSpacing: 1,
    ...outcomeTextShadow,
  },
  statsText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.cream,
    textAlign: 'center',
    ...outcomeTextShadow,
  },
  reasonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.sand,
    textAlign: 'center',
    ...outcomeTextShadow,
  },
  hintCenter: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 6,
  },
  hintP1: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 6,
    alignItems: 'center',
  },
  hintP2: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 6,
    alignItems: 'center',
  },
  continueHint: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(245, 230, 200, 0.6)',
    letterSpacing: 0.8,
    ...outcomeTextShadow,
  },
});
