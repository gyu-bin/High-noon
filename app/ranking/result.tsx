import { Stack, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { ScrollView, Share, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import { RankingRewardCard } from '@/components/ranking/RankingRewardCard';
import { PvpShareCard } from '@/components/result/PvpShareCard';
import { WoodButton } from '@/components/ui/WoodButton';
import {
  currentSeasonKey,
  formatSeasonKey,
  isRankTierUpgrade,
  parseRankTier,
} from '@/constants/pvpRanks';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { pvpMatchmake } from '@/lib/supabase/pvpApi';
import { useDailyMissionStore } from '@/store/dailyMissionStore';
import { usePvpStore } from '@/store/pvpStore';
import { useRankingRewardStore } from '@/store/rankingRewardStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getNpcDisplayName } from '@/utils/npcLabels';
import { buildPvpShareText } from '@/utils/pvpShareText';
import { trigger } from '@/utils/hapticService';

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
  const dailyAllDone = useDailyMissionStore(
    (s) => s.rankingPlay && s.rankingWin && s.todayBoss,
  );
  const cosmeticId = useRankingRewardStore((s) => s.selectedCosmeticNpcId);
  const seasonPeaks = useRankingRewardStore((s) => s.seasonPeaks);
  const recordSeasonPeak = useRankingRewardStore((s) => s.recordSeasonPeak);

  const won = playerWins > opponentWins;
  const draw = playerWins === opponentWins;
  const dailyBadge = dailyAllDone ? t('ranking.dailyBadge') : null;
  const tierUp = lastSubmit
    ? isRankTierUpgrade(lastSubmit.rating_before, lastSubmit.rank_tier)
    : false;
  const seasonKey = currentSeasonKey();
  const seasonTier = parseRankTier(
    seasonPeaks[seasonKey] ?? lastSubmit?.rank_tier ?? 'bronze',
  );
  const seasonBadge = t('ranking.seasonShareBadge', {
    season: formatSeasonKey(seasonKey, i18n.language),
    tier: t(`npcs.tier.${seasonTier}`),
  });
  const cosmeticLabel =
    cosmeticId != null ? getNpcDisplayName(t, cosmeticId) : null;

  useEffect(() => {
    if (!lastSubmit) return;
    recordSeasonPeak(lastSubmit.rank_tier);
    if (tierUp) void trigger('success');
  }, [lastSubmit, recordSeasonPeak, tierUp]);

  const avgMs = useMemo(() => {
    const vals = rounds
      .map((r) => r.playerMs)
      .filter((v): v is number => v != null && Number.isFinite(v));
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [rounds]);

  const playerName = profile?.display_name ?? t('result.me');
  const opponentName = opponent?.display_name ?? t('result.opponent');
  const title = won
    ? t('result.victory')
    : draw
      ? t('result.draw')
      : t('result.defeat');

  const shareText = useMemo(
    () =>
      buildPvpShareText({
        playerName,
        opponentName,
        rounds,
        playerWins,
        opponentWins,
        avgMs,
        won,
        draw,
        challengeLine: t('ranking.shareChallenge'),
        dailyBadge,
        seasonBadge,
        cosmeticLabel,
        resultVictory: t('result.victory'),
        resultDefeat: t('result.defeat'),
        resultDraw: t('result.draw'),
      }),
    [
      avgMs,
      dailyBadge,
      seasonBadge,
      cosmeticLabel,
      draw,
      opponentName,
      opponentWins,
      playerName,
      playerWins,
      rounds,
      t,
      won,
    ],
  );

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
      router.replace('/ranking/duel' as Href);
    } catch {
      router.replace('/ranking' as Href);
    }
  }, [beginMatch, router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <MetaScreenShell>
        <ScrollView
          style={styles.root}
          contentContainerStyle={{
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 20,
            gap: 12,
          }}
          showsVerticalScrollIndicator={false}
        >
          <PvpShareCard
            playerName={playerName}
            opponentName={opponentName}
            rounds={rounds}
            playerWins={playerWins}
            opponentWins={opponentWins}
            avgMs={avgMs}
            won={won}
            draw={draw}
            title={title}
            avgLabel={t('ranking.avgCaption')}
            dailyBadge={dailyBadge}
            seasonBadge={seasonBadge}
            cosmeticLabel={cosmeticLabel}
          />

          {lastSubmit ? (
            <RankingRewardCard
              ratingBefore={lastSubmit.rating_before}
              ratingAfter={lastSubmit.rating_after}
              ratingDelta={lastSubmit.rating_delta}
              tierAfter={lastSubmit.rank_tier}
              tierUp={tierUp}
            />
          ) : null}

          <WoodButton title={t('ranking.share')} onPress={onShare} />
          <WoodButton title={t('ranking.duelAgain')} onPress={() => void onAgain()} />
          <WoodButton
            title={t('ranking.backHub')}
            onPress={() => router.replace('/ranking' as Href)}
          />
        </ScrollView>
      </MetaScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
  },
});
