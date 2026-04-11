import { StyleSheet, Text, View } from 'react-native';

import { PhoneStageShell } from '@/components/layout/PhoneStageShell';
import { colors } from '@/constants/theme';
import { FONT_RYE } from '@/constants/fonts';
import { NPCS } from '@/constants/npcs';
import { useProgressStore } from '@/store/progressStore';

export default function StatsScreen() {
  const npcById = useProgressStore((s) => s.npcById);
  const aggregate = useProgressStore((s) => s.reactionAggregate);
  const clearedCount = NPCS.filter((n) => npcById[n.id]?.cleared).length;
  const avg =
    aggregate.count > 0 ? aggregate.sumMs / aggregate.count : null;

  return (
    <PhoneStageShell>
    <View style={styles.root}>
      <Text style={[styles.head, { fontFamily: FONT_RYE }]}>기록</Text>

      <View style={styles.card}>
        <Text style={styles.label}>전체 평균 반응</Text>
        <Text style={styles.value}>{avg != null ? `${avg.toFixed(1)} ms` : '—'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>NPC 클리어</Text>
        <Text style={styles.value}>
          {clearedCount} / {NPCS.length}
        </Text>
      </View>

      <Text style={styles.footnote}>
        vs NPC·2인 대결에서 반응이 기록될 때마다 평균이 갱신됩니다.
      </Text>
    </View>
    </PhoneStageShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.darkBrown,
    padding: 24,
    gap: 16,
  },
  head: {
    fontSize: 28,
    color: colors.ochre,
    marginBottom: 8,
    letterSpacing: 2,
  },
  card: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#3D2414',
    borderWidth: 1,
    borderColor: colors.sand,
  },
  label: {
    color: colors.sand,
    fontSize: 13,
    letterSpacing: 1,
  },
  value: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '800',
    color: colors.cream,
  },
  footnote: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: colors.sand,
    opacity: 0.78,
  },
});
