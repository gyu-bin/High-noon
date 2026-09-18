import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import { BountyActionRow } from '@/components/ranking/BountyActionRow';
import { LeaderboardPreview } from '@/components/ranking/LeaderboardPreview';
import { WantedProfile } from '@/components/ranking/WantedProfile';
import { WesternButton, WesternHeader } from '@/components/ui/western/WesternPrimitives';
import { FONT_RYE, FONT_WESTERN_SERIF } from '@/constants/fonts';
import { parseRankTier } from '@/constants/pvpRanks';
import { META_PANEL_BG, META_PANEL_BORDER, metaTextShadow } from '@/constants/westernBackground';
import { colors, uiV3Colors } from '@/constants/theme';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { formatUnknownError } from '@/lib/supabase/errors';
import { pvpGetDaily, pvpLeaderboard, pvpLogin, pvpMatchmake, pvpRerollDisplayName } from '@/lib/supabase/pvpApi';
import { usePvpStatsStore } from '@/store/pvpStatsStore';
import { usePvpStore } from '@/store/pvpStore';
import { useRankingRewardStore, whenRankingRewardsReady } from '@/store/rankingRewardStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { DailyChallenge, PvpLeaderboardEntry } from '@/types/pvp';
import { trigger } from '@/utils/hapticService';

const REROLL_COOLDOWN_MS = 1200;

export default function RankingHubScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useScreenBgm('menu');

  const setProfile = usePvpStore((s) => s.setProfile);
  const beginMatch = usePvpStore((s) => s.beginMatch);
  const beginDailyMatch = usePvpStore((s) => s.beginDailyMatch);
  const setDailyChallenge = usePvpStore((s) => s.setDailyChallenge);
  const profile = usePvpStore((s) => s.profile);
  const recordSeasonPeak = useRankingRewardStore((s) => s.recordSeasonPeak);
  const characterId = useSettingsStore((s) => s.selectedCharacterId);
  const dailyStreak = usePvpStatsStore((s) => s.dailyStreak);

  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [dailyMatching, setDailyMatching] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const [nameDim, setNameDim] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [board, setBoard] = useState<PvpLeaderboardEntry[]>([]);
  const [meRank, setMeRank] = useState<number | null>(null);
  const [daily, setDaily] = useState<DailyChallenge | null>(null);
  const lastRerollAt = useRef(0);
  const dimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentEntry = useMemo<PvpLeaderboardEntry | null>(() => {
    if (!profile || meRank == null) return null;
    return { ...profile, character_id: characterId, rank: meRank };
  }, [characterId, meRank, profile]);

  const onBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/menu');
  }, [router]);

  const showFriendlyError = useCallback((source: string, cause: unknown) => {
    console.warn(`[pvp] ${source}`, formatUnknownError(cause));
    setError(t('ranking.networkFailed'));
  }, [t]);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError(t('ranking.offlineBody'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await whenRankingRewardsReady();
      const me = await pvpLogin();
      setProfile(me);
      recordSeasonPeak(me.rank_tier);

      const lb = await pvpLeaderboard(30);
      setBoard(lb.entries ?? []);
      setMeRank(lb.me?.rank ?? null);
      if (lb.me) {
        setProfile({
          id: lb.me.id,
          display_name: lb.me.display_name,
          character_id: me.character_id,
          rating: lb.me.rating,
          rank_tier: lb.me.rank_tier,
          wins: lb.me.wins,
          losses: lb.me.losses,
        });
      }

      try {
        const today = await pvpGetDaily();
        setDaily(today);
        setDailyChallenge(today);
      } catch (cause) {
        console.warn('[pvp] daily fetch failed', formatUnknownError(cause));
        setDaily(null);
      }
    } catch (cause) {
      showFriendlyError('ranking refresh failed', cause);
    } finally {
      setLoading(false);
    }
  }, [recordSeasonPeak, setDailyChallenge, setProfile, showFriendlyError, t]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => () => {
    if (dimTimer.current) clearTimeout(dimTimer.current);
  }, []);

  const startDuel = useCallback(async () => {
    if (matching || dailyMatching) return;
    setMatching(true);
    setError(null);
    try {
      const selectedCharacterId = useSettingsStore.getState().selectedCharacterId;
      const payload = await pvpMatchmake();
      beginMatch({ ...payload, player: { ...payload.player, character_id: selectedCharacterId } });
      router.push('/ranking/duel' as Href);
    } catch (cause) {
      showFriendlyError('matchmaking failed', cause);
    } finally {
      setMatching(false);
    }
  }, [beginMatch, dailyMatching, matching, router, showFriendlyError]);

  const startDailyDuel = useCallback(async () => {
    if (matching || dailyMatching) return;
    if (daily?.completed) {
      setError(t('ranking.dailyDuelAlreadyDone'));
      return;
    }
    setDailyMatching(true);
    setError(null);
    try {
      const today = daily ?? (await pvpGetDaily());
      if (today.completed) {
        setDaily(today);
        setDailyChallenge(today);
        setError(t('ranking.dailyDuelAlreadyDone'));
        return;
      }
      beginDailyMatch(today);
      setDaily(today);
      setDailyChallenge(today);
      router.push('/ranking/duel' as Href);
    } catch (cause) {
      showFriendlyError('daily duel failed', cause);
    } finally {
      setDailyMatching(false);
    }
  }, [beginDailyMatch, daily, dailyMatching, matching, router, setDailyChallenge, showFriendlyError, t]);

  const rerollName = useCallback(async () => {
    if (rerolling) return;
    const now = Date.now();
    if (now - lastRerollAt.current < REROLL_COOLDOWN_MS) return;
    lastRerollAt.current = now;
    setRerolling(true);
    setError(null);
    try {
      const updated = await pvpRerollDisplayName();
      setProfile(updated);
      void trigger('selection');
      setNameDim(true);
      if (dimTimer.current) clearTimeout(dimTimer.current);
      dimTimer.current = setTimeout(() => setNameDim(false), 180);
    } catch (cause) {
      console.warn('[pvp] nickname reroll failed', formatUnknownError(cause));
      setError(t('ranking.nicknameRerollFailed'));
    } finally {
      setRerolling(false);
    }
  }, [rerolling, setProfile, t]);

  const onlineDisabled = !isSupabaseConfigured || !profile;

  return (
    <MetaScreenShell>
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={onBack} hitSlop={10} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={22} color={colors.gold} />
          <Text style={styles.backText}>{t('common.back')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('ranking.refresh')} onPress={() => void refresh()} disabled={loading} hitSlop={10} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
          <Ionicons name="refresh" size={20} color={loading ? colors.sand : colors.gold} />
        </Pressable>
      </View>

      <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]} showsVerticalScrollIndicator={false}>
        <WesternHeader title={t('ranking.title')} subtitle={t('ranking.sub')} />

        {loading && !profile ? (
          <ActivityIndicator color={colors.gold} style={styles.loader} />
        ) : profile ? (
          <WantedProfile
            profile={profile}
            characterId={characterId}
            worldRank={meRank}
            tierLabel={t(`ranking.tier.${parseRankTier(profile.rank_tier)}`)}
            labels={{
              alias: t('ranking.aliasLabel'),
              rank: t('ranking.rankLabel'),
              rating: t('ranking.rating'),
              record: t('ranking.record'),
              world: t('ranking.worldRank'),
              motto: t('ranking.wantedMotto'),
              reroll: t('ranking.nicknameReroll'),
            }}
            nameDim={nameDim}
            rerolling={rerolling}
            onOpen={() => router.push('/ranking/profile' as Href)}
            onReroll={() => void rerollName()}
          />
        ) : (
          <View style={styles.offlinePanel}>
            <Ionicons name="cloud-offline-outline" size={28} color={colors.gold} />
            <View style={styles.offlineCopy}>
              <Text style={styles.offlineTitle}>{t('ranking.offlineTitle')}</Text>
              <Text style={styles.offlineBody}>{t('ranking.offlineBody')}</Text>
            </View>
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <WesternButton
          title={matching ? t('ranking.matching') : t('ranking.duel')}
          subtitle={t('ranking.recordDuel')}
          leadingIcon={<Ionicons name="locate-outline" size={27} color="#2B160D" />}
          onPress={() => void startDuel()}
          disabled={matching || dailyMatching || onlineDisabled}
          variant="primary"
          style={styles.primary}
        />

        <BountyActionRow
          icon="calendar-outline"
          title={t('ranking.todayDuelTitle')}
          subtitle={dailyMatching ? t('ranking.dailyDuelLoading') : daily?.completed ? t('ranking.todayDuelComplete') : t('ranking.dailyDuel', { name: daily?.opponent_name ?? '…' })}
          detail={t('ranking.todayDuelDetail', { streak: dailyStreak })}
          completed={daily?.completed === true}
          disabled={matching || dailyMatching || onlineDisabled || daily?.completed === true}
          onPress={() => void startDailyDuel()}
        />

        <BountyActionRow
          icon="ticket-outline"
          title={t('ranking.friendChallengeTitle')}
          subtitle={t('ranking.friendChallengeSubtitle')}
          detail={t('ranking.challengeEnterHint')}
          disabled={onlineDisabled}
          onPress={() => router.push('/ranking/challenge' as Href)}
        />

        <LeaderboardPreview
          title={t('ranking.leaderboard')}
          viewAllLabel={t('ranking.viewAll')}
          emptyLabel={t('ranking.leaderboardEmpty')}
          rows={board}
          current={currentEntry}
          tierLabel={(tier) => t(`ranking.tier.${parseRankTier(tier)}`)}
          onViewAll={() => router.push('/ranking/leaderboard' as Href)}
        />

        <View style={styles.recordRow}>
          <RecordButton icon="book-outline" label={t('ranking.duelHistory')} onPress={() => router.push('/ranking/profile' as Href)} />
          <RecordButton icon="stats-chart-outline" label={t('ranking.myRecord')} onPress={() => router.push('/ranking/profile' as Href)} />
        </View>

        <View style={styles.brandFooter}>
          <Text style={styles.brand}>HIGH NOON</Text>
          <Text style={styles.brandSub}>A DUEL AWAITS</Text>
        </View>
      </ScrollView>
    </MetaScreenShell>
  );
}

function RecordButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.recordButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={21} color={colors.gold} />
      <Text style={styles.recordButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 4, zIndex: 2 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 8, paddingRight: 8 },
  backText: { color: colors.gold, fontSize: 15, fontWeight: '700', ...metaTextShadow },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: META_PANEL_BORDER, backgroundColor: META_PANEL_BG },
  pressed: { opacity: 0.72 },
  root: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 12 },
  loader: { marginVertical: 44 },
  primary: { minHeight: 70, marginTop: 2 },
  error: { color: '#F0C1B7', fontFamily: FONT_WESTERN_SERIF, fontSize: 12, lineHeight: 17, textAlign: 'center', paddingHorizontal: 10 },
  offlinePanel: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, borderWidth: 1, borderColor: META_PANEL_BORDER, backgroundColor: 'rgba(20,12,8,0.9)' },
  offlineCopy: { flex: 1, gap: 3 },
  offlineTitle: { color: uiV3Colors.gold, fontFamily: FONT_RYE, fontSize: 14 },
  offlineBody: { color: colors.sand, fontFamily: FONT_WESTERN_SERIF, fontSize: 11, lineHeight: 16 },
  recordRow: { flexDirection: 'row', gap: 10 },
  recordButton: { flex: 1, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#76502D', borderRadius: 4, backgroundColor: 'rgba(25,14,9,0.92)' },
  recordButtonText: { color: uiV3Colors.cream, fontFamily: FONT_WESTERN_SERIF, fontSize: 12, fontWeight: '700' },
  brandFooter: { alignItems: 'center', marginTop: 6, gap: 1 },
  brand: { color: colors.gold, fontFamily: FONT_RYE, fontSize: 12, letterSpacing: 2.2, opacity: 0.74 },
  brandSub: { color: colors.sand, fontFamily: FONT_RYE, fontSize: 6, letterSpacing: 2, opacity: 0.64 },
});
