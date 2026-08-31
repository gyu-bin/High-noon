import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FONT_RYE } from '@/constants/fonts';
import {
  META_PANEL_BG,
  META_PANEL_BORDER,
  metaTextShadow,
} from '@/constants/westernBackground';
import { colors } from '@/constants/theme';
import { formatRatingDelta, parseRankTier } from '@/constants/pvpRanks';

type Props = {
  ratingBefore: number;
  ratingAfter: number;
  ratingDelta: number;
  tierAfter: string;
  tierUp: boolean;
};

export function RankingRewardCard({
  ratingBefore,
  ratingAfter,
  ratingDelta,
  tierAfter,
  tierUp,
}: Props) {
  const { t } = useTranslation();
  const up = ratingDelta > 0;
  const tier = parseRankTier(tierAfter);

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>{t('ranking.ratingReward')}</Text>
      <Text
        style={[
          styles.delta,
          { fontFamily: FONT_RYE, color: up ? colors.gold : '#E8A0A0' },
        ]}
      >
        {formatRatingDelta(ratingDelta)}
      </Text>
      <Text style={styles.line}>
        {t('ranking.ratingLine', {
          before: ratingBefore,
          after: ratingAfter,
          delta: formatRatingDelta(ratingDelta),
        })}
      </Text>
      {tierUp ? (
        <Text style={[styles.tierUp, { fontFamily: FONT_RYE }]}>
          {t('ranking.tierUp', { tier: t(`npcs.tier.${tier}`) })}
        </Text>
      ) : (
        <Text style={styles.tierKeep}>
          {t('ranking.tierStay', { tier: t(`npcs.tier.${tier}`) })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: META_PANEL_BG,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
    alignItems: 'center',
    gap: 6,
  },
  kicker: {
    color: colors.sand,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  delta: {
    fontSize: 44,
    letterSpacing: 1,
    ...metaTextShadow,
  },
  line: {
    color: colors.cream,
    fontSize: 13,
    fontWeight: '700',
  },
  tierUp: {
    marginTop: 4,
    color: colors.gold,
    fontSize: 20,
    letterSpacing: 1,
    ...metaTextShadow,
  },
  tierKeep: {
    color: colors.sand,
    fontSize: 13,
    fontWeight: '700',
  },
});
