import { StyleSheet, Text, View } from 'react-native';

import { OUTCOME_PANEL, OUTCOME_VICTORY, outcomeTextShadow } from '@/constants/outcomeTheme';
import { colors } from '@/constants/theme';
import { formatReactionMs } from '@/utils/formatReactionMs';

type Props = {
  playerMs: number | null;
  npcMs: number | null;
  faster: 'player' | 'npc' | 'tie' | 'unknown';
};

export function ReactionStatsCard({ playerMs, npcMs, faster }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>반응 속도</Text>
      <View style={styles.row}>
        <View style={[styles.col, faster === 'player' && styles.colWin]}>
          <Text style={styles.label}>나</Text>
          <Text style={[styles.value, faster === 'player' && styles.valueWin]}>
            {playerMs != null ? formatReactionMs(playerMs) : '—'}
          </Text>
          <Text style={styles.unit}>ms</Text>
        </View>

        <View style={styles.divider} />

        <View style={[styles.col, faster === 'npc' && styles.colLose]}>
          <Text style={styles.label}>NPC</Text>
          <Text style={[styles.value, faster === 'npc' && styles.valueNpc]}>
            {npcMs != null ? formatReactionMs(npcMs) : '—'}
          </Text>
          <Text style={styles.unit}>ms</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: OUTCOME_PANEL.borderRadius,
    backgroundColor: OUTCOME_PANEL.background,
    borderWidth: 1,
    borderColor: OUTCOME_PANEL.border,
    gap: 12,
  },
  heading: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    color: colors.sand,
    letterSpacing: 1.6,
    ...outcomeTextShadow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    borderRadius: 10,
  },
  colWin: {
    backgroundColor: 'rgba(232, 168, 42, 0.12)',
  },
  colLose: {
    backgroundColor: 'rgba(140, 48, 48, 0.14)',
  },
  divider: {
    width: 1,
    marginVertical: 4,
    backgroundColor: 'rgba(212, 165, 116, 0.28)',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.sand,
    letterSpacing: 0.6,
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.cream,
    ...outcomeTextShadow,
  },
  valueWin: {
    color: OUTCOME_VICTORY.title,
  },
  valueNpc: {
    color: '#E8B4B4',
  },
  unit: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(212, 170, 116, 0.75)',
    letterSpacing: 0.5,
  },
});
