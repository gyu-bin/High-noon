import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FONT_RYE, FONT_WESTERN_SERIF } from '@/constants/fonts';
import { colors, uiV3Colors } from '@/constants/theme';
import type { PvpLeaderboardEntry } from '@/types/pvp';

const podiumColors = ['#E8C547', '#C8CED6', '#B66A34'] as const;

export function LeaderboardRow({
  row,
  tierLabel,
  isMe = false,
}: {
  row: PvpLeaderboardEntry;
  tierLabel: string;
  isMe?: boolean;
}) {
  const podium = row.rank >= 1 && row.rank <= 3;
  const accent = podium ? podiumColors[row.rank - 1] : colors.sand;
  return (
    <View style={[styles.row, isMe && styles.meRow]}>
      <View style={styles.rankBox}>
        {podium ? <Ionicons name="star" size={18} color={accent} /> : null}
        <Text style={[styles.rank, { color: accent }]}>#{row.rank}</Text>
      </View>
      <View style={styles.identity}>
        <Text style={styles.name} numberOfLines={1}>{row.display_name}</Text>
        <Text style={styles.tier}>{tierLabel.toUpperCase()}</Text>
      </View>
      <Text style={[styles.rating, podium && { color: accent }]}>{row.rating}</Text>
      {isMe ? <Text style={styles.you}>YOU</Text> : null}
    </View>
  );
}

export function LeaderboardPreview({
  title,
  viewAllLabel,
  emptyLabel,
  rows,
  current,
  tierLabel,
  onViewAll,
}: {
  title: string;
  viewAllLabel: string;
  emptyLabel: string;
  rows: PvpLeaderboardEntry[];
  current: PvpLeaderboardEntry | null;
  tierLabel: (tier: string) => string;
  onViewAll: () => void;
}) {
  const top = rows.slice(0, 3);
  const currentInTop = current ? top.some((row) => row.id === current.id) : false;
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.heading}>{title}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={viewAllLabel}
          onPress={onViewAll}
          hitSlop={8}
          style={({ pressed }) => [styles.viewAll, pressed && styles.pressed]}
        >
          <Text style={styles.viewAllText}>{viewAllLabel}</Text>
          <Ionicons name="chevron-forward" size={15} color={colors.gold} />
        </Pressable>
      </View>
      {top.length === 0 ? <Text style={styles.empty}>{emptyLabel}</Text> : null}
      {top.map((row) => (
        <LeaderboardRow
          key={row.id}
          row={row}
          tierLabel={tierLabel(row.rank_tier)}
          isMe={current?.id === row.id}
        />
      ))}
      {current && !currentInTop ? (
        <View style={styles.currentWrap}>
          <LeaderboardRow row={current} tierLabel={tierLabel(current.rank_tier)} isMe />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#6E4A29',
    borderRadius: 5,
    backgroundColor: 'rgba(18,10,7,0.91)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(174,128,80,0.44)',
  },
  heading: {
    color: uiV3Colors.gold,
    fontFamily: FONT_RYE,
    fontSize: 17,
    letterSpacing: 1,
  },
  viewAll: { flexDirection: 'row', alignItems: 'center' },
  viewAllText: {
    color: colors.gold,
    fontFamily: FONT_WESTERN_SERIF,
    fontSize: 10,
    fontWeight: '700',
  },
  row: {
    minHeight: 51,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(140,123,107,0.28)',
  },
  meRow: { backgroundColor: 'rgba(139,82,24,0.2)' },
  rankBox: {
    width: 55,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rank: { fontFamily: FONT_RYE, fontSize: 12 },
  identity: { flex: 1, gap: 1 },
  name: {
    color: uiV3Colors.cream,
    fontFamily: FONT_WESTERN_SERIF,
    fontSize: 13,
    fontWeight: '700',
  },
  tier: {
    color: colors.sand,
    fontFamily: FONT_RYE,
    fontSize: 8,
    letterSpacing: 0.8,
  },
  rating: {
    color: uiV3Colors.cream,
    fontFamily: FONT_RYE,
    fontSize: 14,
  },
  you: {
    color: '#2B160E',
    backgroundColor: colors.gold,
    fontFamily: FONT_RYE,
    fontSize: 7,
    paddingHorizontal: 5,
    paddingVertical: 3,
    marginLeft: 8,
  },
  currentWrap: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.ochre,
  },
  empty: {
    color: colors.sand,
    fontFamily: FONT_WESTERN_SERIF,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 18,
  },
  pressed: { opacity: 0.7 },
});

