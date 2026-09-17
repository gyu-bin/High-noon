import { StyleSheet, Text, View } from 'react-native';
import { WesternButton } from '@/components/ui/western/WesternPrimitives';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { FONT_RYE } from '@/constants/fonts';
import { OUTCOME_DEFEAT, OUTCOME_VICTORY, outcomeTextShadow } from '@/constants/outcomeTheme';
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
  onMenu: () => void;
  winBurstId: number;
  paddingBottom?: number;
};

function getLossReasonShortKey(reason: NpcRoundLossReason): string {
  switch (reason) {
    case 'early': return 'lossShort.early';
    case 'timeout': return 'lossShort.timeout';
    case 'slower': return 'lossShort.slower';
  }
}

export function NpcRoundModal({ visible, data, onContinue, onMenu, paddingBottom = 0 }: Props) {
  const { t } = useTranslation();
  const m = usePhoneStageMetrics();

  if (!visible || !data) return null;

  const playerWon = data.kind === 'win';
  const theme = playerWon ? OUTCOME_VICTORY : OUTCOME_DEFEAT;
  const landscape = m.windowWidth > m.windowHeight;
  // The arena is edge-to-edge in both orientations; its shade must be too.
  const frame = { left: 0, top: 0, width: m.windowWidth, height: m.windowHeight };
  const playerTime = data.playerMs == null ? '—' : `${formatReactionMs(data.playerMs)} ms`;
  const npcTime = data.npcMs == null ? '—' : `${formatReactionMs(data.npcMs)} ms`;

  return (
    <View style={styles.root}>
      <View pointerEvents="box-none" style={[styles.stageFrame, frame]}>
        <View pointerEvents="none" style={styles.sceneShade} />

        <Animated.View
          entering={FadeInDown.duration(260)}
          pointerEvents="none"
          style={[styles.outcome, landscape && styles.outcomeLandscape]}
        >
          <View style={[styles.rule, { backgroundColor: theme.accent }]} />
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            numberOfLines={1}
            style={[styles.outcomeTitle, { color: theme.title }]}
          >
            {playerWon ? t('result.victory') : t('result.defeat')}
          </Text>
          {data.kind === 'loss' ? <Text style={styles.reason}>{t(getLossReasonShortKey(data.reason))}</Text> : null}
          {data.kind === 'win' && data.headshot ? <Text style={styles.reason}>{t('result.headshot')}</Text> : null}
          {data.kind === 'win' && data.lastStand ? <Text style={styles.reason}>{t('result.lastStand')}</Text> : null}
        </Animated.View>

        <View
          style={[
            styles.bottomPanel,
            landscape && styles.bottomPanelLandscape,
            { bottom: Math.max(paddingBottom, 8) + 8 },
          ]}
        >
          <Text style={styles.timing}>
            <Text style={styles.timingLabel}>{t('result.me')} </Text>{playerTime}
            <Text style={styles.timingDivider}>  ·  </Text>
            <Text style={styles.timingLabel}>{t('result.opponent')} </Text>{npcTime}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <WesternButton title={t('common.continue')} onPress={onContinue} variant="primary" style={{ flex: 1 }} />
            <WesternButton title={t('game.mainMenu')} onPress={onMenu} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 40 },
  stageFrame: { position: 'absolute', overflow: 'hidden' },
  sceneShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8, 4, 2, 0.18)' },
  outcome: { position: 'absolute', top: '22%', left: '12%', right: '12%', alignItems: 'center' },
  outcomeLandscape: { top: '18%', left: '28%', right: '28%' },
  rule: { width: 86, height: 2, marginBottom: 10 },
  outcomeTitle: {
    color: colors.cream,
    fontFamily: FONT_RYE,
    fontSize: 36,
    letterSpacing: 3,
    textAlign: 'center',
    ...outcomeTextShadow,
  },
  reason: { marginTop: 5, color: colors.sand, fontSize: 12, fontWeight: '800', letterSpacing: 0.7, textAlign: 'center', ...outcomeTextShadow },
  bottomPanel: {
    position: 'absolute',
    left: 18,
    right: 18,
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.4)',
    backgroundColor: 'rgba(8, 5, 3, 0.82)',
  },
  bottomPanelLandscape: { left: '30%', right: '30%' },
  timing: { color: colors.cream, fontSize: 13, fontWeight: '800', textAlign: 'center', ...outcomeTextShadow },
  timingLabel: { color: colors.sand, fontSize: 10, letterSpacing: 0.7 },
  timingDivider: { color: colors.ochre },
  continueHint: { color: 'rgba(245, 230, 200, 0.56)', fontSize: 9, fontWeight: '700', letterSpacing: 1.1 },
});
