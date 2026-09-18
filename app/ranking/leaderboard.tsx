import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import { LeaderboardRow } from '@/components/ranking/LeaderboardPreview';
import { WesternButton, WesternHeader } from '@/components/ui/western/WesternPrimitives';
import { FONT_WESTERN_SERIF } from '@/constants/fonts';
import { parseRankTier } from '@/constants/pvpRanks';
import { META_PANEL_BG, META_PANEL_BORDER, metaTextShadow } from '@/constants/westernBackground';
import { colors } from '@/constants/theme';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { formatUnknownError } from '@/lib/supabase/errors';
import { pvpLeaderboard, pvpLogin } from '@/lib/supabase/pvpApi';
import type { PvpLeaderboardEntry } from '@/types/pvp';

export default function FullLeaderboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<PvpLeaderboardEntry[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useScreenBgm('menu');

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [me, board] = await Promise.all([pvpLogin(), pvpLeaderboard(100)]);
      setMeId(me.id);
      setRows(board.entries ?? []);
    } catch (cause) {
      console.warn('[pvp] leaderboard failed', formatUnknownError(cause));
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/ranking');
  };

  return (
    <MetaScreenShell>
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={onBack} hitSlop={10} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={22} color={colors.gold} />
          <Text style={styles.backText}>{t('common.back')}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]} showsVerticalScrollIndicator={false}>
        <WesternHeader title={t('ranking.leaderboard')} subtitle={t('ranking.leaderboardSub')} />
        {loading ? <ActivityIndicator color={colors.gold} style={styles.loader} /> : null}
        {failed ? (
          <View style={styles.failed}>
            <Text style={styles.failedText}>{t('ranking.networkFailed')}</Text>
            <WesternButton title={t('ranking.refresh')} onPress={() => void load()} variant="quiet" />
          </View>
        ) : null}
        {!loading && !failed && rows.length === 0 ? <Text style={styles.empty}>{t('ranking.leaderboardEmpty')}</Text> : null}
        {!failed && rows.length > 0 ? (
          <View style={styles.board}>
            {rows.map((row) => (
              <LeaderboardRow
                key={row.id}
                row={row}
                tierLabel={t(`ranking.tier.${parseRankTier(row.rank_tier)}`)}
                isMe={row.id === meId}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </MetaScreenShell>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: 16, paddingBottom: 4, zIndex: 2 },
  backBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 2, paddingVertical: 8, paddingRight: 8 },
  backText: { color: colors.gold, fontSize: 15, fontWeight: '700', ...metaTextShadow },
  pressed: { opacity: 0.72 },
  content: { paddingHorizontal: 18, gap: 16 },
  loader: { marginTop: 40 },
  failed: { gap: 14, marginTop: 20 },
  failedText: { color: colors.cream, fontFamily: FONT_WESTERN_SERIF, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  empty: { color: colors.sand, fontFamily: FONT_WESTERN_SERIF, textAlign: 'center', marginTop: 28 },
  board: { paddingHorizontal: 12, borderWidth: 1, borderColor: META_PANEL_BORDER, borderRadius: 5, backgroundColor: META_PANEL_BG },
});
