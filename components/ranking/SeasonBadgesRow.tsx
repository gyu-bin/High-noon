import { LinearGradient } from 'expo-linear-gradient';
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

type Props = {
  compact?: boolean;
};

const TIER_ACCENT: Record<string, [string, string]> = {
  bronze: ['#8B5A2B', '#D4A017'],
  silver: ['#6B7280', '#E5E7EB'],
  gold: ['#B45309', '#FBBF24'],
  platinum: ['#334155', '#94A3B8'],
  diamond: ['#1D4ED8', '#93C5FD'],
  master: ['#7C2D12', '#F59E0B'],
  legend: ['#4C1D95', '#E8C547'],
};

export function SeasonBadgesRow({ compact = false }: Props) {
  const { t, i18n } = useTranslation();
  const peaks = useRankingRewardStore((s) => s.seasonPeaks);
  const now = currentSeasonKey();
  const keys = Object.keys(peaks).sort((a, b) => (a < b ? 1 : -1)).slice(0, 8);

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      {!compact ? (
        <Text style={[styles.head, { fontFamily: FONT_RYE }]}>
          {t('ranking.seasonTitle')}
        </Text>
      ) : null}
      <Text style={styles.sub}>{t('ranking.seasonSub')}</Text>

      {keys.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={[styles.emptyStamp, { fontFamily: FONT_RYE }]}>
            {t('ranking.seasonEmptyStamp')}
          </Text>
          <Text style={styles.emptyHint}>{t('ranking.seasonEmpty')}</Text>
        </View>
      ) : (
        <View style={styles.row}>
          {keys.map((key) => {
            const tier = parseRankTier(peaks[key] ?? 'bronze');
            const current = key === now;
            const accent = TIER_ACCENT[tier] ?? TIER_ACCENT.bronze!;
            return (
              <LinearGradient
                key={key}
                colors={['rgba(20,12,6,0.92)', 'rgba(40,24,12,0.88)']}
                style={[styles.badge, current && styles.badgeNow]}
              >
                <View style={[styles.medal, { borderColor: accent[1] }]}>
                  <LinearGradient
                    colors={accent}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.medalFill}
                  >
                    <Text style={[styles.medalMark, { fontFamily: FONT_RYE }]}>
                      ★
                    </Text>
                  </LinearGradient>
                </View>
                <Text style={styles.month}>
                  {formatSeasonKey(key, i18n.language)}
                </Text>
                <Text style={[styles.tier, { fontFamily: FONT_RYE }]}>
                  {t(`npcs.tier.${tier}`)}
                </Text>
                {current ? (
                  <Text style={styles.nowTag}>{t('ranking.seasonNow')}</Text>
                ) : null}
              </LinearGradient>
            );
          })}
        </View>
      )}
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
    gap: 10,
  },
  cardCompact: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  head: {
    color: colors.gold,
    fontSize: 16,
    letterSpacing: 1,
  },
  sub: {
    color: colors.sand,
    fontSize: 12,
    lineHeight: 17,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badge: {
    width: '47%',
    minWidth: 140,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
    alignItems: 'center',
    gap: 4,
  },
  badgeNow: {
    borderColor: colors.gold,
  },
  medal: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    padding: 2,
    marginBottom: 4,
  },
  medalFill: {
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalMark: {
    color: '#1A0C06',
    fontSize: 18,
  },
  month: {
    color: colors.sand,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  tier: {
    color: colors.cream,
    fontSize: 16,
    letterSpacing: 0.6,
  },
  nowTag: {
    marginTop: 2,
    color: colors.gold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  emptyBox: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(12, 6, 4, 0.28)',
  },
  emptyStamp: {
    color: colors.gold,
    fontSize: 18,
    letterSpacing: 2,
  },
  emptyHint: {
    color: colors.sand,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 17,
  },
});
