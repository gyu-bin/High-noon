import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { RankingPortrait } from '@/components/ranking/RankingPortrait';
import { SeasonBadgesRow } from '@/components/ranking/SeasonBadgesRow';
import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import { MenuBackButton } from '@/components/ui/MenuBackButton';
import { WesternHeader, WesternPanel } from '@/components/ui/western/WesternPrimitives';
import { FONT_RYE, FONT_WESTERN_SERIF, usesCjkFont } from '@/constants/fonts';
import { parseRankTier } from '@/constants/pvpRanks';
import { uiV3Colors } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { pvpHistory, pvpLeaderboard, pvpLogin } from '@/lib/supabase/pvpApi';
import { usePvpStatsStore } from '@/store/pvpStatsStore';
import { usePvpStore } from '@/store/pvpStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { PvpHistoryEntry } from '@/types/pvp';

export default function RankingProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = usePvpStore((s) => s.profile);
  const setProfile = usePvpStore((s) => s.setProfile);
  const characterId = useSettingsStore((s) => s.selectedCharacterId);
  const best = usePvpStatsStore((s) => s.bestReactionMs);
  const streak = usePvpStatsStore((s) => s.dailyStreak);
  const [rank, setRank] = useState<number | null>(null);
  const [history, setHistory] = useState<PvpHistoryEntry[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void Promise.allSettled([pvpLogin(), pvpLeaderboard(1), pvpHistory(8)]).then(
      ([profileResult, boardResult, historyResult]) => {
        if (profileResult.status === 'fulfilled') setProfile(profileResult.value);
        if (boardResult.status === 'fulfilled') setRank(boardResult.value.me?.rank ?? null);
        if (historyResult.status === 'fulfilled') setHistory(historyResult.value);
      },
    );
  }, [setProfile]);

  const onBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/ranking');
  }, [router]);

  const tier = parseRankTier(profile?.rank_tier ?? 'bronze');

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <MetaScreenShell>
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <MenuBackButton onPress={onBack} />
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
          <WesternHeader title={t('ranking.profileTitle')} subtitle={t('ranking.profileSub')} />

          <WesternPanel style={styles.poster}>
            <Text style={styles.kicker}>GUNSLINGER RECORD</Text>
            <RankingPortrait width={156} height={204} characterId={characterId} />
            <Text
              style={[
                styles.alias,
                { fontFamily: usesCjkFont(profile?.display_name ?? '') ? FONT_WESTERN_SERIF : FONT_RYE },
              ]}
            >
              {profile?.display_name ?? t('ranking.offlineAlias')}
            </Text>
            <Text style={styles.tier}>{t(`ranking.tier.${tier}`)}</Text>
          </WesternPanel>

          <WesternPanel>
            <View style={styles.grid}>
              <Stat label={t('ranking.rating')} value={profile ? String(profile.rating) : '—'} />
              <Stat label={t('ranking.rank')} value={rank != null ? `#${rank}` : '—'} />
              <Stat label={t('ranking.record')} value={profile ? `${profile.wins} — ${profile.losses}` : '—'} />
              <Stat label={t('ranking.bestDraw')} value={best != null ? `${best} ms` : '—'} />
              <Stat label={t('ranking.dailyStreak')} value={String(streak)} />
            </View>
          </WesternPanel>

          <SeasonBadgesRow />

          <WesternPanel>
            <Text style={styles.historyTitle}>{t('ranking.recentDuels')}</Text>
            {history.length === 0 ? (
              <Text style={styles.historyEmpty}>{t('ranking.recentDuelsEmpty')}</Text>
            ) : history.map((entry) => (
              <View key={entry.id} style={styles.historyRow}>
                <View style={styles.historyCopy}>
                  <Text numberOfLines={1} style={styles.historyOpponent}>{entry.opponent_name}</Text>
                  <Text style={styles.historyScore}>{entry.score_player} — {entry.score_opponent}</Text>
                </View>
                <Text style={[styles.historyResult, entry.result === 'win' ? styles.win : entry.result === 'loss' ? styles.loss : null]}>
                  {t(`ranking.result.${entry.result}`)}
                </Text>
                <Text style={[styles.historyDelta, entry.rating_delta >= 0 ? styles.win : styles.loss]}>
                  {entry.rating_delta >= 0 ? '+' : ''}{entry.rating_delta}
                </Text>
              </View>
            ))}
          </WesternPanel>
        </ScrollView>
      </MetaScreenShell>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 16, zIndex: 2 },
  content: { paddingHorizontal: 22, gap: 14 },
  poster: { alignItems: 'center' },
  kicker: { color: uiV3Colors.ochre, fontFamily: FONT_RYE, fontSize: 11, letterSpacing: 2.2, textAlign: 'center' },
  alias: { color: uiV3Colors.cream, fontSize: 24, textAlign: 'center', marginTop: 4 },
  tier: { color: uiV3Colors.gold, fontFamily: FONT_RYE, fontSize: 15, textTransform: 'uppercase', letterSpacing: 1.4, textAlign: 'center', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { width: '48%', minHeight: 72, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(212,160,23,0.35)', backgroundColor: 'rgba(8,4,2,0.35)' },
  statLabel: { color: uiV3Colors.dustGray, fontFamily: FONT_WESTERN_SERIF, fontSize: 11, textAlign: 'center' },
  statValue: { color: uiV3Colors.cream, fontFamily: FONT_RYE, fontSize: 18, marginTop: 5 },
  historyTitle: { color: uiV3Colors.cream, fontFamily: FONT_RYE, fontSize: 16, letterSpacing: 1.2, marginBottom: 9 },
  historyEmpty: { color: uiV3Colors.dustGray, fontFamily: FONT_WESTERN_SERIF, fontSize: 12, textAlign: 'center', paddingVertical: 12 },
  historyRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(201,166,107,0.28)' },
  historyCopy: { flex: 1 },
  historyOpponent: { color: uiV3Colors.cream, fontFamily: FONT_WESTERN_SERIF, fontSize: 13, fontWeight: '700' },
  historyScore: { color: uiV3Colors.dustGray, fontFamily: FONT_RYE, fontSize: 10, marginTop: 2 },
  historyResult: { width: 54, color: uiV3Colors.ochre, fontFamily: FONT_RYE, fontSize: 10, textAlign: 'center' },
  historyDelta: { width: 44, color: uiV3Colors.cream, fontFamily: FONT_RYE, fontSize: 11, textAlign: 'right' },
  win: { color: '#E2BD84' },
  loss: { color: '#B35A45' },
});
