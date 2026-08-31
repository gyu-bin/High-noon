import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import { WoodButton } from '@/components/ui/WoodButton';
import { FONT_RYE } from '@/constants/fonts';
import { formatRatingDelta } from '@/constants/pvpRanks';
import {
  META_PANEL_BG,
  META_PANEL_BORDER,
  metaTextShadow,
} from '@/constants/westernBackground';
import { colors } from '@/constants/theme';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { formatReactionMs } from '@/utils/formatReactionMs';
import { pvpMatchmake } from '@/lib/supabase/pvpApi';
import { usePvpStore } from '@/store/pvpStore';
import { useSettingsStore } from '@/store/settingsStore';

export default function RankingResultScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useScreenBgm('menu');

  const opponent = usePvpStore((s) => s.opponent);
  const profile = usePvpStore((s) => s.profile);
  const rounds = usePvpStore((s) => s.rounds);
  const playerWins = usePvpStore((s) => s.playerWins);
  const opponentWins = usePvpStore((s) => s.opponentWins);
  const lastSubmit = usePvpStore((s) => s.lastSubmit);
  const beginMatch = usePvpStore((s) => s.beginMatch);

  const won = playerWins > opponentWins;
  const draw = playerWins === opponentWins;

  const avgMs = useMemo(() => {
    const vals = rounds
      .map((r) => r.playerMs)
      .filter((v): v is number => v != null && Number.isFinite(v));
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [rounds]);

  const shareText = useMemo(() => {
    const lines = rounds.map((r, i) => {
      const mine = r.playerMs != null ? `${Math.round(r.playerMs)}` : '—';
      const theirs = r.opponentMs != null ? `${Math.round(r.opponentMs)}` : '—';
      const mark =
        r.winner === 'player' ? '✓' : r.winner === 'opponent' ? '✗' : '=';
      return `${i + 1}  ${mine}ms vs ${theirs}ms  ${mark}`;
    });
    const resultLabel = won
      ? t('result.victory')
      : draw
        ? t('result.draw')
        : t('result.defeat');
    const avg = avgMs != null ? `${Math.round(avgMs)}ms` : '—';
    const challenge =
      i18n.language === 'ko'
        ? '나보다 빠른 사람 있어?'
        : i18n.language === 'ja'
          ? '俺より速い奴いる？'
          : 'Think you\'re faster?';
    return [
      'HIGH NOON · RANKING',
      `${profile?.display_name ?? 'Me'} vs ${opponent?.display_name ?? 'Opponent'}`,
      ...lines,
      `${resultLabel}  ${playerWins}–${opponentWins}  ·  AVG ${avg}`,
      challenge,
      'https://highnoon.game',
    ].join('\n');
  }, [
    avgMs,
    draw,
    i18n.language,
    opponent?.display_name,
    playerWins,
    opponentWins,
    profile?.display_name,
    rounds,
    t,
    won,
  ]);

  const onShare = useCallback(() => {
    void Share.share({ message: shareText }).catch(() => {});
  }, [shareText]);

  const onAgain = useCallback(async () => {
    try {
      const characterId = useSettingsStore.getState().selectedCharacterId;
      const payload = await pvpMatchmake();
      beginMatch({
        ...payload,
        player: { ...payload.player, character_id: characterId },
      });
      router.replace('/ranking/duel');
    } catch {
      router.replace('/ranking');
    }
  }, [beginMatch, router]);

  const title = won
    ? t('result.victory')
    : draw
      ? t('result.draw')
      : t('result.defeat');

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <MetaScreenShell>
        <View
          style={[
            styles.root,
            {
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 20,
            },
          ]}
        >
          <Text style={[styles.eyebrow, { fontFamily: FONT_RYE }]}>
            HIGH NOON
          </Text>
          <Text
            style={[
              styles.title,
              { fontFamily: FONT_RYE, color: won ? colors.gold : '#E8A0A0' },
            ]}
          >
            {title}
          </Text>
          <Text style={styles.score}>
            {playerWins} — {opponentWins}
          </Text>

          <View style={styles.card}>
            {rounds.map((r, i) => (
              <View key={i} style={styles.roundRow}>
                <Text style={styles.roundIdx}>{i + 1}</Text>
                <Text style={styles.roundMs}>
                  {r.playerMs != null ? formatReactionMs(r.playerMs) : '—'}
                  {' vs '}
                  {r.opponentMs != null ? formatReactionMs(r.opponentMs) : '—'}
                </Text>
                <Text
                  style={[
                    styles.roundMark,
                    r.winner === 'player' && styles.markWin,
                    r.winner === 'opponent' && styles.markLose,
                  ]}
                >
                  {r.winner === 'player'
                    ? '✓'
                    : r.winner === 'opponent'
                      ? '✗'
                      : '='}
                </Text>
              </View>
            ))}
            <Text style={styles.avg}>
              {t('ranking.avgLine', {
                avg: avgMs != null ? Math.round(avgMs) : '—',
              })}
            </Text>
            {lastSubmit ? (
              <Text style={styles.rating}>
                {t('ranking.ratingLine', {
                  before: lastSubmit.rating_before,
                  after: lastSubmit.rating_after,
                  delta: formatRatingDelta(lastSubmit.rating_delta),
                })}
              </Text>
            ) : null}
          </View>

          <WoodButton title={t('ranking.share')} onPress={onShare} />
          <WoodButton title={t('ranking.duelAgain')} onPress={() => void onAgain()} />
          <WoodButton
            title={t('ranking.backHub')}
            onPress={() => router.replace('/ranking')}
          />
        </View>
      </MetaScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
    gap: 12,
  },
  eyebrow: {
    color: colors.sand,
    fontSize: 14,
    letterSpacing: 3,
    ...metaTextShadow,
  },
  title: {
    fontSize: 36,
    letterSpacing: 2,
    ...metaTextShadow,
  },
  score: {
    color: colors.cream,
    fontSize: 28,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: META_PANEL_BG,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
    gap: 8,
    marginBottom: 8,
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roundIdx: {
    width: 18,
    color: colors.sand,
    fontWeight: '700',
  },
  roundMs: {
    flex: 1,
    color: colors.cream,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  roundMark: {
    width: 22,
    textAlign: 'center',
    color: colors.sand,
    fontSize: 16,
    fontWeight: '800',
  },
  markWin: { color: colors.gold },
  markLose: { color: '#E8A0A0' },
  avg: {
    marginTop: 6,
    color: colors.sand,
    fontSize: 13,
    fontWeight: '600',
  },
  rating: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '700',
  },
});
