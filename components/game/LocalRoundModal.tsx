import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { FONT_RYE, FONT_WESTERN_SERIF, usesCjkFont } from '@/constants/fonts';
import { OUTCOME_DEFEAT, OUTCOME_VICTORY } from '@/constants/outcomeTheme';
import { colors } from '@/constants/theme';
import type { LocalPlayerRoundState, LocalRoundOutcome } from '@/hooks/useLocalDuelEngine';
import { formatReactionMs } from '@/utils/formatReactionMs';
import { localResultLayout } from '@/utils/localResultLayout';

type Props = {
  visible: boolean;
  outcome: LocalRoundOutcome | null;
  onContinue: () => void;
  p1Wins: number;
  p2Wins: number;
  width: number;
  height: number;
  paddingTop?: number;
  paddingBottom?: number;
};

function resultLine(state: LocalPlayerRoundState, t: (key: string) => string) {
  if (state.earlyTap) return t('lossShort.early');
  if (state.timeout) return t('lossShort.timeout');
  return state.reactionMs == null ? '—' : `${formatReactionMs(state.reactionMs)} ms`;
}

function RoundPanel({ player, outcome, p1Wins, p2Wins, cardHeight, textMultiplier, onContinue }: {
  player: 'p1' | 'p2'; outcome: LocalRoundOutcome; p1Wins: number; p2Wins: number; cardHeight: number; textMultiplier: number; onContinue: () => void;
}) {
  const { t } = useTranslation();
  const won = outcome.winner === player;
  const draw = outcome.winner === 'draw';
  const theme = won ? OUTCOME_VICTORY : OUTCOME_DEFEAT;
  const outcomeLabel = draw ? t('result.draw') : won ? t('result.roundVictory') : t('result.defeat');
  const first = player === 'p1';
  const ownScore = first ? p1Wins : p2Wins;
  const otherScore = first ? p2Wins : p1Wins;
  const accessibleResult = `${player.toUpperCase()}: ${outcomeLabel}. ${t('result.thisRound').trim()}: ${resultLine(outcome[player], t)}. P1 ${p1Wins}, P2 ${p2Wins}. ${t('game.tapToNextRound')}`;
  return <View accessible accessibilityRole="button" accessibilityLabel={accessibleResult} onAccessibilityTap={onContinue} accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'activate') onContinue(); }} style={[styles.card, { height: cardHeight, borderColor: draw ? '#7B6A53' : theme.badgeBorder }]}>
    <View style={styles.topRow}>
      <Text maxFontSizeMultiplier={textMultiplier} style={styles.playerTag}>{player.toUpperCase()}</Text>
      <Text maxFontSizeMultiplier={textMultiplier} numberOfLines={1} adjustsFontSizeToFit style={[styles.outcome, { color: draw ? colors.sand : theme.title, fontFamily: usesCjkFont(outcomeLabel) ? FONT_WESTERN_SERIF : FONT_RYE }]}>
        {outcomeLabel}
      </Text>
    </View>
    <View style={styles.detailRow}>
      <Text maxFontSizeMultiplier={textMultiplier} numberOfLines={1} adjustsFontSizeToFit style={styles.score}>{ownScore} — {otherScore}<Text maxFontSizeMultiplier={textMultiplier} style={styles.opponent}>  {first ? 'P2' : 'P1'}</Text></Text>
      <Text maxFontSizeMultiplier={textMultiplier} numberOfLines={1} adjustsFontSizeToFit style={styles.reaction}>{resultLine(outcome[player], t)}</Text>
    </View>
    <Text maxFontSizeMultiplier={textMultiplier} numberOfLines={1} adjustsFontSizeToFit style={styles.continueHint}>{t('game.tapToNextRound')}</Text>
  </View>;
}

/** Two opaque cards occupy the central safe zone reserved by the local arena.
 * P2 keeps the same 180-degree orientation as their character and touch area. */
export function LocalRoundModal({ visible, outcome, onContinue, p1Wins, p2Wins, width, height, paddingTop = 0, paddingBottom = 0 }: Props) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const { fontScale } = useWindowDimensions();
  if (!visible || !outcome) return null;
  const { cardWidth, cardHeight, textMultiplier } = localResultLayout({ width, height, fontScale, paddingTop, paddingBottom });
  return <Pressable accessible={false} accessibilityLabel={t('game.tapToNextRound')} accessibilityRole="button" onPress={onContinue} style={styles.root}>
    <View pointerEvents="none" style={styles.sceneShade} />
    <Animated.View pointerEvents="none" entering={reducedMotion ? undefined : FadeIn.duration(180)} style={[styles.cardSlot, { left: (width - cardWidth) / 2, top: height / 2 - cardHeight - 8, width: cardWidth, height: cardHeight, transform: [{ rotate: '180deg' }] }]}>
      <RoundPanel player="p2" outcome={outcome} p1Wins={p1Wins} p2Wins={p2Wins} cardHeight={cardHeight} textMultiplier={textMultiplier} onContinue={onContinue} />
    </Animated.View>
    <View pointerEvents="none" style={[styles.seam, { top: height / 2 - .5 }]} />
    <Animated.View pointerEvents="none" entering={reducedMotion ? undefined : FadeIn.duration(180)} style={[styles.cardSlot, { left: (width - cardWidth) / 2, top: height / 2 + 8, width: cardWidth, height: cardHeight }]}>
      <RoundPanel player="p1" outcome={outcome} p1Wins={p1Wins} p2Wins={p2Wins} cardHeight={cardHeight} textMultiplier={textMultiplier} onContinue={onContinue} />
    </Animated.View>
  </Pressable>;
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 40 },
  sceneShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,5,3,0.22)' },
  cardSlot: { position: 'absolute' },
  card: { borderWidth: 1, borderRadius: 5, backgroundColor: '#1B120D', paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playerTag: { color: colors.sand, fontFamily: FONT_RYE, fontSize: 14, letterSpacing: 1 },
  outcome: { flex: 1, fontFamily: FONT_RYE, fontSize: 21 },
  score: { maxWidth: '42%', flexShrink: 1, color: colors.cream, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  opponent: { color: colors.sand, fontSize: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  reaction: { color: colors.cream, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'], flexShrink: 1 },
  continueHint: { color: '#BBA181', fontSize: 10, textAlign: 'center', paddingTop: 3 },
  seam: { position: 'absolute', height: 1, left: 32, right: 32, backgroundColor: '#8B6539' },
});
