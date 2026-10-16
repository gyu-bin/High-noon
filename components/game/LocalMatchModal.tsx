import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { DuelVictoryPortrait } from '@/components/game/DuelVictoryPortrait';
import { OutcomeBackdrop } from '@/components/result/OutcomeBackdrop';
import { WesternButton } from '@/components/ui/western/WesternPrimitives';
import type { DuelBackgroundVariant } from '@/constants/duelBackgroundVariants';
import { FONT_RYE, FONT_WESTERN_SERIF, usesCjkFont } from '@/constants/fonts';
import { OUTCOME_PANEL, OUTCOME_VICTORY } from '@/constants/outcomeTheme';
import { colors } from '@/constants/theme';
import type { DuelBackgroundId } from '@/utils/duelBackgroundSelection';

type Props = {
  visible: boolean;
  matchWinner: 'p1' | 'p2';
  winnerSkinId: string;
  p1Wins: number;
  p2Wins: number;
  winsNeeded: number;
  onExit: () => void;
  onRematch: () => void;
  backgroundVariant: DuelBackgroundVariant;
  backgroundId?: DuelBackgroundId;
  width: number;
  height: number;
  paddingBottom?: number;
  paddingTop?: number;
};

export function LocalMatchModal({ visible, matchWinner, winnerSkinId, p1Wins, p2Wins, winsNeeded, onExit, onRematch, backgroundVariant, backgroundId, width, height, paddingBottom = 0, paddingTop = 0 }: Props) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const winnerTitle = t('localDuel.matchWinPlayer', { player: matchWinner.toUpperCase() });
  const portraitHeight = Math.max(140, Math.min(220, height * .23));
  return <Modal transparent={false} animationType={reducedMotion ? 'none' : 'fade'} visible={visible} onRequestClose={onExit} supportedOrientations={['portrait']}>
    <OutcomeBackdrop variant={backgroundVariant} backgroundId={backgroundId} width={width} height={height}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(paddingTop, 16) + 10, paddingBottom: Math.max(paddingBottom, 12) + 12 }]}>
        <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(220)} style={styles.panel}>
          <Text style={styles.eyebrow}>{t('localDuel.matchWinTitle')}</Text>
          <Text numberOfLines={2} adjustsFontSizeToFit style={[styles.title, usesCjkFont(winnerTitle) && { fontFamily: FONT_WESTERN_SERIF }]}>{winnerTitle}</Text>
          <View pointerEvents="none" style={styles.portrait}>
            <DuelVictoryPortrait skinId={winnerSkinId} width={Math.min(280, width - 100)} height={portraitHeight} />
          </View>
          <View style={styles.scoreboard}>
            <Text style={styles.scoreLabel}>{t('result.finalScore')}</Text>
            <View style={styles.scoreRow}>
              {(['p1', 'p2'] as const).map(player => <View key={player} style={styles.scoreColumn}>
                <Text style={[styles.playerLabel, matchWinner === player && styles.winnerColor]}>{player.toUpperCase()}</Text>
                <Text style={[styles.score, matchWinner === player && styles.winnerColor]}>{player === 'p1' ? p1Wins : p2Wins}</Text>
              </View>)}
            </View>
          </View>
          <Text style={styles.format}>{t('localDuel.roundFormat', { rounds: winsNeeded * 2 - 1, wins: winsNeeded })}</Text>
          <View style={styles.actions}>
            <WesternButton title={t('result.retry')} onPress={onRematch} variant="primary" />
            <WesternButton title={t('localDuel.selectCharacters')} onPress={onExit} variant="secondary" />
          </View>
        </Animated.View>
      </ScrollView>
    </OutcomeBackdrop>
  </Modal>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22 },
  panel: { width: '100%', maxWidth: 460, alignSelf: 'center', borderRadius: OUTCOME_PANEL.borderRadius, backgroundColor: OUTCOME_PANEL.background, borderWidth: 1, borderColor: OUTCOME_VICTORY.badgeBorder, padding: 18, gap: 9, overflow: 'hidden' },
  eyebrow: { textAlign: 'center', fontSize: 11, fontWeight: '800', color: colors.sand, letterSpacing: 1.6 },
  title: { fontFamily: FONT_RYE, fontSize: 30, lineHeight: 38, color: OUTCOME_VICTORY.title, textAlign: 'center' },
  portrait: { alignItems: 'center', justifyContent: 'center' },
  scoreboard: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(212,165,116,.3)', paddingVertical: 10, gap: 7 },
  scoreLabel: { textAlign: 'center', color: colors.sand, fontSize: 10, letterSpacing: 1.2, fontWeight: '800' },
  scoreRow: { flexDirection: 'row', justifyContent: 'center', gap: 42 },
  scoreColumn: { minWidth: 62, alignItems: 'center', gap: 2 },
  playerLabel: { fontFamily: FONT_RYE, fontSize: 12, color: colors.sand, letterSpacing: 1 },
  score: { fontFamily: FONT_RYE, fontSize: 34, color: colors.sand },
  winnerColor: { color: OUTCOME_VICTORY.title },
  format: { textAlign: 'center', color: '#BBA181', fontSize: 11 },
  actions: { gap: 9, marginTop: 3 },
});
