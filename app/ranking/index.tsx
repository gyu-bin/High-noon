import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import { MenuBackButton } from '@/components/ui/MenuBackButton';
import { WoodButton } from '@/components/ui/WoodButton';
import { FONT_RYE } from '@/constants/fonts';
import {
  META_PANEL_BG,
  META_PANEL_BORDER,
  metaTextShadow,
} from '@/constants/westernBackground';
import { colors } from '@/constants/theme';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { pvpLeaderboard, pvpLogin, pvpMatchmake } from '@/lib/supabase/pvpApi';
import { usePvpStore } from '@/store/pvpStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { PvpLeaderboardEntry, PvpProfile } from '@/types/pvp';

export default function RankingHubScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useScreenBgm('menu');

  const setProfile = usePvpStore((s) => s.setProfile);
  const beginMatch = usePvpStore((s) => s.beginMatch);
  const profile = usePvpStore((s) => s.profile);

  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [board, setBoard] = useState<PvpLeaderboardEntry[]>([]);
  const [meRank, setMeRank] = useState<number | null>(null);

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
      const me = (await pvpLogin()) as PvpProfile;
      setProfile(me);
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [setProfile, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startDuel = useCallback(async () => {
    if (matching) return;
    setMatching(true);
    setError(null);
    try {
      const characterId = useSettingsStore.getState().selectedCharacterId;
      const payload = await pvpMatchmake();
      beginMatch({
        ...payload,
        player: { ...payload.player, character_id: characterId },
      });
      router.push('/ranking/duel');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setMatching(false);
    }
  }, [beginMatch, matching, router]);

  return (
    <>
      <Stack.Screen
        options={{
          headerBackVisible: false,
          headerLeft: () => <MenuBackButton onPress={onBack} />,
        }}
      />
      <MetaScreenShell>
        <ScrollView
          style={styles.root}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.head, { fontFamily: FONT_RYE }]}>
            {t('ranking.title')}
          </Text>
          <Text style={styles.sub}>{t('ranking.sub')}</Text>

          {loading ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: 24 }} />
          ) : (
            <>
              {profile ? (
                <View style={styles.card}>
                  <Text style={styles.label}>{t('ranking.you')}</Text>
                  <Text style={[styles.name, { fontFamily: FONT_RYE }]}>
                    {profile.display_name}
                  </Text>
                  <Text style={styles.meta}>
                    {t('ranking.rankLine', {
                      tier: profile.rank_tier,
                      rating: profile.rating,
                      rank: meRank ?? '—',
                    })}
                  </Text>
                  <Text style={styles.meta}>
                    {t('ranking.recordLine', {
                      wins: profile.wins,
                      losses: profile.losses,
                    })}
                  </Text>
                </View>
              ) : null}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <WoodButton
                title={matching ? t('ranking.matching') : t('ranking.duel')}
                onPress={() => void startDuel()}
                disabled={matching || !isSupabaseConfigured}
                style={styles.primary}
              />
              <WoodButton
                title={t('ranking.refresh')}
                onPress={() => void refresh()}
                style={styles.secondary}
              />

              <Text style={[styles.section, { fontFamily: FONT_RYE }]}>
                {t('ranking.leaderboard')}
              </Text>
              {board.length === 0 ? (
                <Text style={styles.empty}>{t('ranking.leaderboardEmpty')}</Text>
              ) : (
                board.map((row) => (
                  <View key={row.id} style={styles.row}>
                    <Text style={styles.rankNum}>#{row.rank}</Text>
                    <View style={styles.rowMid}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {row.display_name}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {row.rank_tier} · {row.wins}W {row.losses}L
                      </Text>
                    </View>
                    <Text style={styles.rowRating}>{row.rating}</Text>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      </MetaScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 24, gap: 12 },
  head: {
    fontSize: 28,
    color: colors.gold,
    letterSpacing: 2,
    ...metaTextShadow,
  },
  sub: {
    color: colors.sand,
    fontSize: 14,
    marginBottom: 8,
    ...metaTextShadow,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: META_PANEL_BG,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
    gap: 4,
    marginBottom: 8,
  },
  label: {
    color: colors.sand,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  name: { color: colors.cream, fontSize: 22, letterSpacing: 1 },
  meta: { color: colors.sand, fontSize: 13 },
  error: { color: '#E8A0A0', fontSize: 13, marginVertical: 4 },
  primary: { marginTop: 4 },
  secondary: { opacity: 0.92 },
  section: {
    marginTop: 16,
    color: colors.gold,
    fontSize: 18,
    letterSpacing: 1,
    ...metaTextShadow,
  },
  empty: { color: colors.sand, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: META_PANEL_BG,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
  },
  rankNum: {
    width: 36,
    color: colors.gold,
    fontWeight: '800',
    fontSize: 13,
  },
  rowMid: { flex: 1, gap: 2 },
  rowName: { color: colors.cream, fontWeight: '700', fontSize: 14 },
  rowMeta: { color: colors.sand, fontSize: 11 },
  rowRating: {
    color: colors.gold,
    fontWeight: '800',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
});
