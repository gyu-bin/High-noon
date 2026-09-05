import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import { DailyMissionsCard } from '@/components/ranking/DailyMissionsCard';
import { RankingPortrait } from '@/components/ranking/RankingPortrait';
import { SeasonBadgesRow } from '@/components/ranking/SeasonBadgesRow';
import { WoodButton } from '@/components/ui/WoodButton';
import { FONT_RYE } from '@/constants/fonts';
import { parseRankTier } from '@/constants/pvpRanks';
import {
  META_PANEL_BG,
  META_PANEL_BORDER,
  metaTextShadow,
} from '@/constants/westernBackground';
import { colors } from '@/constants/theme';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import {
  pvpGetDaily,
  pvpLeaderboard,
  pvpLogin,
  pvpMatchmake,
  pvpRerollDisplayName,
} from '@/lib/supabase/pvpApi';
import { usePvpStore } from '@/store/pvpStore';
import {
  useRankingRewardStore,
  whenRankingRewardsReady,
} from '@/store/rankingRewardStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { DailyChallenge, PvpLeaderboardEntry } from '@/types/pvp';
import { trigger } from '@/utils/hapticService';

const REROLL_COOLDOWN_MS = 1200;

type ExtraPanel = 'missions' | 'season' | null;

function podiumAccent(rank: number): string | null {
  if (rank === 1) return '#E8C547';
  if (rank === 2) return '#C0C7D1';
  if (rank === 3) return '#C47A3A';
  return null;
}

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
  const setCosmeticNpcId = useRankingRewardStore((s) => s.setCosmeticNpcId);
  const cosmeticNpcId = useRankingRewardStore((s) => s.selectedCosmeticNpcId);
  const characterId = useSettingsStore((s) => s.selectedCharacterId);

  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [dailyMatching, setDailyMatching] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const [nameDim, setNameDim] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [board, setBoard] = useState<PvpLeaderboardEntry[]>([]);
  const [meRank, setMeRank] = useState<number | null>(null);
  const [daily, setDaily] = useState<DailyChallenge | null>(null);
  const [extra, setExtra] = useState<ExtraPanel>(null);
  const lastRerollAt = useRef(0);
  const dimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/menu');
  }, [router]);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError(t('ranking.notConfigured'));
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
      const localCosmetic =
        useRankingRewardStore.getState().selectedCosmeticNpcId;
      if (localCosmetic == null && me.cosmetic_npc_id != null) {
        setCosmeticNpcId(me.cosmetic_npc_id);
      }
      const lb = await pvpLeaderboard(30);
      setBoard(lb.entries ?? []);
      setMeRank(lb.me?.rank ?? null);
      if (lb.me) {
        setProfile({
          id: lb.me.id,
          display_name: lb.me.display_name,
          character_id: me.character_id,
          cosmetic_npc_id: me.cosmetic_npc_id,
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
      } catch (dailyErr) {
        console.warn('[pvp] daily fetch failed', dailyErr);
        setDaily(null);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [recordSeasonPeak, setCosmeticNpcId, setDailyChallenge, setProfile, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return () => {
      if (dimTimer.current) clearTimeout(dimTimer.current);
    };
  }, []);

  const startDuel = useCallback(async () => {
    if (matching || dailyMatching) return;
    setMatching(true);
    setError(null);
    try {
      const characterId = useSettingsStore.getState().selectedCharacterId;
      const payload = await pvpMatchmake();
      beginMatch({
        ...payload,
        player: { ...payload.player, character_id: characterId },
      });
      router.push('/ranking/duel' as Href);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setMatching(false);
    }
  }, [beginMatch, dailyMatching, matching, router]);

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
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setDailyMatching(false);
    }
  }, [
    beginDailyMatch,
    daily,
    dailyMatching,
    matching,
    router,
    setDailyChallenge,
    t,
  ]);

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
    } catch {
      setError(t('ranking.nicknameRerollFailed'));
    } finally {
      setRerolling(false);
    }
  }, [rerolling, setProfile, t]);

  const extraTitle =
    extra === 'missions'
      ? t('ranking.dailyTitle')
      : extra === 'season'
        ? t('ranking.seasonTitle')
        : '';

  return (
    <MetaScreenShell>
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={onBack}
          hitSlop={10}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.gold} />
          <Text style={styles.backText}>{t('common.back')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ranking.refresh')}
          onPress={() => void refresh()}
          disabled={loading}
          hitSlop={10}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        >
          <Ionicons
            name="refresh"
            size={20}
            color={loading ? colors.sand : colors.gold}
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.head, { fontFamily: FONT_RYE }]}>
          {t('ranking.title')}
        </Text>

        {loading && !profile ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: 32 }} />
        ) : (
          <>
            {profile ? (
              <View style={styles.meStrip}>
                <Text style={styles.meLabel}>{t('ranking.youAccount')}</Text>
                <View style={styles.meRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('ranking.profileTitle')}
                    onPress={() => router.push('/ranking/profile' as Href)}
                    style={({ pressed }) => [
                      styles.avatarBtn,
                      pressed && styles.pressed,
                    ]}
                  >
                    <RankingPortrait
                      width={72}
                      height={84}
                      characterId={characterId}
                      cosmeticNpcId={cosmeticNpcId}
                    />
                  </Pressable>
                  <View style={styles.meMain}>
                    <Text style={[styles.meRank, { fontFamily: FONT_RYE }]}>
                      #{meRank ?? '—'}
                    </Text>
                    <View style={styles.meText}>
                      <Text
                        style={[
                          styles.meName,
                          { fontFamily: FONT_RYE, opacity: nameDim ? 0.45 : 1 },
                        ]}
                        numberOfLines={1}
                      >
                        {profile.display_name}
                      </Text>
                      <Text style={styles.meMeta}>
                        {t(`npcs.tier.${parseRankTier(profile.rank_tier)}`)} ·{' '}
                        {profile.rating} ·{' '}
                        {t('ranking.recordLine', {
                          wins: profile.wins,
                          losses: profile.losses,
                        })}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('ranking.nicknameReroll')}
                    disabled={rerolling}
                    onPress={() => void rerollName()}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.rerollIcon,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name="shuffle-outline"
                      size={18}
                      color={rerolling ? colors.sand : colors.gold}
                    />
                  </Pressable>
                </View>
                <Text style={styles.meHint}>{t('ranking.youHint')}</Text>
              </View>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <WoodButton
              title={matching ? t('ranking.matching') : t('ranking.duel')}
              onPress={() => void startDuel()}
              disabled={matching || dailyMatching || !isSupabaseConfigured}
              style={styles.primary}
            />

            <WoodButton
              title={
                dailyMatching
                  ? t('ranking.dailyDuelLoading')
                  : daily?.completed
                    ? t('ranking.dailyDuelDone')
                    : t('ranking.dailyDuel', {
                        name: daily?.opponent_name ?? '…',
                      })
              }
              onPress={() => void startDailyDuel()}
              disabled={
                matching ||
                dailyMatching ||
                !isSupabaseConfigured ||
                daily?.completed === true
              }
              style={styles.dailyBtn}
            />
            {daily && !daily.completed ? (
              <Text style={styles.dailyHint}>{t('ranking.dailyDuelHint')}</Text>
            ) : null}

            <View style={styles.moreRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setExtra('missions')}
                style={({ pressed }) => [
                  styles.moreChip,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.moreChipText}>{t('ranking.missionsChip')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/ranking/profile' as Href)}
                style={({ pressed }) => [
                  styles.moreChip,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.moreChipText}>
                  {t('ranking.profileTitle')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setExtra('season')}
                style={({ pressed }) => [
                  styles.moreChip,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.moreChipText}>
                  {t('ranking.seasonTitle')}
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.section, { fontFamily: FONT_RYE }]}>
              {t('ranking.leaderboard')}
            </Text>

            {board.length === 0 ? (
              <Text style={styles.empty}>{t('ranking.leaderboardEmpty')}</Text>
            ) : (
              <View style={styles.board}>
                {board.map((row) => {
                  const accent = podiumAccent(row.rank);
                  const isMe = profile?.id === row.id;
                  return (
                    <View
                      key={row.id}
                      style={[
                        styles.row,
                        accent != null && { borderColor: accent },
                        isMe && styles.rowMe,
                      ]}
                    >
                      <Text
                        style={[
                          styles.rankNum,
                          { fontFamily: FONT_RYE },
                          accent != null && { color: accent },
                        ]}
                      >
                        #{row.rank}
                      </Text>
                      <View style={styles.rowMid}>
                        <Text style={styles.rowName} numberOfLines={1}>
                          {row.display_name}
                          {isMe ? ` · ${t('ranking.you')}` : ''}
                        </Text>
                        <Text style={styles.rowMeta}>
                          {row.rank_tier} · {row.wins}W {row.losses}L
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.rowRating,
                          { fontFamily: FONT_RYE },
                          accent != null && { color: accent },
                        ]}
                      >
                        {row.rating}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={extra != null}
        animationType="slide"
        transparent
        onRequestClose={() => setExtra(null)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalDim} onPress={() => setExtra(null)} />
          <View
            style={[
              styles.modalSheet,
              { paddingBottom: Math.max(insets.bottom, 16) + 8 },
            ]}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalHead}>
              <Text style={[styles.modalTitle, { fontFamily: FONT_RYE }]}>
                {extraTitle}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
                onPress={() => setExtra(null)}
                hitSlop={10}
              >
                <Ionicons name="close" size={22} color={colors.sand} />
              </Pressable>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalBody}
            >
              {extra === 'missions' ? <DailyMissionsCard /> : null}
              {extra === 'season' ? <SeasonBadgesRow compact /> : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </MetaScreenShell>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 4,
    zIndex: 2,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 8,
    paddingRight: 8,
  },
  backText: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '700',
    ...metaTextShadow,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
    backgroundColor: META_PANEL_BG,
  },
  pressed: { opacity: 0.75 },
  root: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    gap: 14,
  },
  head: {
    fontSize: 32,
    color: colors.gold,
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
    ...metaTextShadow,
  },
  meStrip: {
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
    backgroundColor: META_PANEL_BG,
  },
  meLabel: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  meRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarBtn: {
    width: 76,
    height: 88,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  meMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  meRank: {
    color: colors.gold,
    fontSize: 18,
    letterSpacing: 0.5,
    minWidth: 36,
  },
  meText: { flex: 1, gap: 3 },
  meName: {
    color: colors.cream,
    fontSize: 17,
    letterSpacing: 0.5,
  },
  meMeta: {
    color: colors.sand,
    fontSize: 12,
  },
  meHint: {
    color: colors.sand,
    fontSize: 11,
    lineHeight: 15,
    opacity: 0.9,
  },
  rerollIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { color: '#E8A0A0', fontSize: 13 },
  primary: { marginTop: 2 },
  dailyBtn: { marginTop: -4 },
  dailyHint: {
    color: colors.sand,
    fontSize: 12,
    textAlign: 'center',
    marginTop: -6,
    ...metaTextShadow,
  },
  moreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  moreChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
    backgroundColor: 'rgba(26, 18, 8, 0.45)',
  },
  moreChipText: {
    color: colors.sand,
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginTop: 6,
    color: colors.gold,
    fontSize: 18,
    letterSpacing: 1.2,
    ...metaTextShadow,
  },
  empty: {
    color: colors.sand,
    fontSize: 13,
    lineHeight: 18,
  },
  board: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: META_PANEL_BG,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
  },
  rowMe: {
    backgroundColor: 'rgba(232, 197, 71, 0.1)',
  },
  rankNum: {
    width: 40,
    color: colors.gold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
  rowMid: { flex: 1, gap: 2 },
  rowName: { color: colors.cream, fontWeight: '700', fontSize: 14 },
  rowMeta: { color: colors.sand, fontSize: 11 },
  rowRating: {
    color: colors.gold,
    fontSize: 18,
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalSheet: {
    maxHeight: '78%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: '#1a1208',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: META_PANEL_BORDER,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(212, 170, 112, 0.45)',
    marginBottom: 10,
  },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    color: colors.gold,
    fontSize: 20,
    letterSpacing: 1,
  },
  modalBody: {
    paddingBottom: 12,
    gap: 8,
  },
});
