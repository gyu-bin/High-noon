import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { TIER_BADGE } from '@/constants/npcVisual';
import { colors } from '@/constants/theme';

/** §2-2 레전드 마스크 카드 (#19~21, #18 클리어 전) */
export function MaskedLegendCard() {
  const badge = TIER_BADGE.legend;
  return (
    <View style={styles.outer}>
      <View style={styles.card}>
        <View style={styles.silhouette}>
          <Text style={styles.q}>?</Text>
        </View>
        <Text style={styles.line}>LEGEND</Text>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.text }]}>???</Text>
        </View>
        <Text style={styles.sub}>??????????</Text>
        <Ionicons name="lock-closed" size={18} color={colors.sand} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 10,
    minWidth: 0,
  },
  card: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: '#1A1008',
    borderWidth: 2,
    borderColor: '#4A3A32',
    opacity: 0.45,
    minHeight: 148,
  },
  silhouette: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  q: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.sand,
  },
  line: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.sand,
    letterSpacing: 1,
  },
  badge: {
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  sub: {
    marginTop: 4,
    fontSize: 9,
    color: colors.sand,
    letterSpacing: 1,
  },
});
