import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FONT_RYE } from '@/constants/fonts';
import {
  currentSeasonKey,
  formatSeasonKey,
  parseRankTier,
} from '@/constants/pvpRanks';
import {
  META_PANEL_BG,
  META_PANEL_BORDER,
} from '@/constants/westernBackground';
import { colors } from '@/constants/theme';
import { useRankingRewardStore } from '@/store/rankingRewardStore';

export function SeasonBadgesRow() {
  const { t, i18n } = useTranslation();
  const peaks = useRankingRewardStore((s) => s.seasonPeaks);
  const now = currentSeasonKey();
  const keys = Object.keys(peaks).sort((a, b) => (a < b ? 1 : -1)).slice(0, 8);

  if (keys.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={[styles.head, { fontFamily: FONT_RYE }]}>
        {t('ranking.seasonTitle')}
      </Text>
      <Text style={styles.sub}>{t('ranking.seasonSub')}</Text>
      <View style={styles.row}>
        {keys.map((key) => {
          const tier = parseRankTier(peaks[key] ?? 'bronze');
          const current = key === now;
          return (
            <View
              key={key}
              style={[styles.badge, current && styles.badgeNow]}
            >
              <Text style={styles.month}>
                {formatSeasonKey(key, i18n.language)}
              </Text>
              <Text style={[styles.tier, { fontFamily: FONT_RYE }]}>
                {t(`npcs.tier.${tier}`)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: META_PANEL_BG,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
    gap: 8,
  },
  head: {
    color: colors.gold,
    fontSize: 16,
    letterSpacing: 1,
  },
  sub: {
    color: colors.sand,
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
    backgroundColor: 'rgba(12, 6, 4, 0.28)',
    minWidth: 88,
  },
  badgeNow: {
    borderColor: 'rgba(232, 197, 71, 0.55)',
  },
  month: {
    color: colors.sand,
    fontSize: 10,
    fontWeight: '700',
  },
  tier: {
    color: colors.cream,
    fontSize: 14,
    letterSpacing: 0.4,
    marginTop: 2,
  },
});
