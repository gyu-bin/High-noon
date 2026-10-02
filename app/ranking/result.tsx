import { Stack, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import { RankingRewardCard } from '@/components/ranking/RankingRewardCard';
import { PvpShareCard } from '@/components/result/PvpShareCard';
import {
  WantedPosterCard,
  WANTED_POSTER_HEIGHT,
  WANTED_POSTER_WIDTH,
} from '@/components/result/WantedPosterCard';
import { WesternButton } from '@/components/ui/western/WesternPrimitives';
import {
  currentSeasonKey,
  formatSeasonKey,
  isRankTierUpgrade,
  parseRankTier,
} from '@/constants/pvpRanks';
import { colors } from '@/constants/theme';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { recordAppEvent } from '@/lib/supabase/analyticsApi';
import { formatUnknownError } from '@/lib/supabase/errors';
import { pvpMarkDailyShared, pvpMatchmake } from '@/lib/supabase/pvpApi';
import { usePvpStore } from '@/store/pvpStore';
import { usePvpStatsStore } from '@/store/pvpStatsStore';
import { useRankingRewardStore } from '@/store/rankingRewardStore';
import { useSettingsStore } from '@/store/settingsStore';
import { buildChallengeWebLink } from '@/utils/challengeLink';
import { buildPvpShareText } from '@/utils/pvpShareText';
import { averagePlayerMs, bestPlayerMs } from '@/utils/reactionStats';
import { shareWantedPosterImage } from '@/utils/shareWantedPoster';
import { retryPendingSubmission } from '@/utils/rankingSubmission';
import { trigger } from '@/utils/hapticService';

const PREVIEW_SCALE = 0.72;

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
  const lastDailySubmit = usePvpStore((s) => s.lastDailySubmit);
  const lastFriendSubmit = usePvpStore((s) => s.lastFriendSubmit);
  const matchMode = usePvpStore((s) => s.matchMode);
  const submissionStatus = usePvpStore((s) => s.submissionStatus);
  const submissionFailure = usePvpStore((s) => s.submissionFailure);
  const submissionId = usePvpStore((s) => s.submissionId);
  const submissionRetryable = usePvpStore((s) => s.submissionRetryable);
  const friendChallenge = usePvpStore((s) => s.friendChallenge);
  const lastCreatedChallengeCode = usePvpStore((s) => s.lastCreatedChallengeCode);
  const beginMatch = usePvpStore((s) => s.beginMatch);
  const seasonPeaks = useRankingRewardStore((s) => s.seasonPeaks);
  const recordSeasonPeak = useRankingRewardStore((s) => s.recordSeasonPeak);
  const dailyStreak = usePvpStatsStore((s) => s.dailyStreak);
  const lifetimeBest = usePvpStatsStore((s) => s.bestReactionMs);

  const [sharingPoster, setSharingPoster] = useState(false);
  const [posterError, setPosterError] = useState<string | null>(null);
  const posterRef = useRef<View>(null);
  const [retryingSettlement, setRetryingSettlement] = useState(false);

  const onRetrySettlement = useCallback(async () => {
    if (!submissionId || retryingSettlement) return;
    const task = retryPendingSubmission(submissionId);
    if (!task) return;
    setRetryingSettlement(true);
    // The service mirrors the outcome into pvpStore for this submission id.
    await task;
    setRetryingSettlement(false);
  }, [retryingSettlement, submissionId]);

  const isDaily = matchMode === 'daily';
  const isFriend = matchMode === 'friend';
  // Friend duels show the server-recalculated score once it is settled.
  const shownPlayerWins = isFriend && lastFriendSubmit ? lastFriendSubmit.score_player : playerWins;
  const shownOpponentWins =
    isFriend && lastFriendSubmit ? lastFriendSubmit.score_creator : opponentWins;
  const won = shownPlayerWins > shownOpponentWins;
  const draw = shownPlayerWins === shownOpponentWins;
  const dailyBadge = isDaily
    ? lastDailySubmit
      ? t('ranking.dailyBadge')
      : null
    : isFriend
      ? null
      : null;
  const tierUp = lastSubmit
    ? isRankTierUpgrade(lastSubmit.rating_before, lastSubmit.rank_tier)
    : false;
  const seasonKey = currentSeasonKey();
  const seasonTier = parseRankTier(
    seasonPeaks[seasonKey] ?? lastSubmit?.rank_tier ?? 'bronze',
  );
  const seasonBadge =
    isDaily || isFriend
      ? null
      : t('ranking.seasonShareBadge', {
          season: formatSeasonKey(seasonKey, i18n.language),
          tier: t(`ranking.tier.${seasonTier}`),
        });

  useEffect(() => {
    if (!lastSubmit) return;
    recordSeasonPeak(lastSubmit.rank_tier);
    if (tierUp) void trigger('success');
  }, [lastSubmit, recordSeasonPeak, tierUp]);

  const avgMs = useMemo(() => averagePlayerMs(rounds), [rounds]);
  const sessionBest = useMemo(() => bestPlayerMs(rounds), [rounds]);
  const bestMs = sessionBest ?? lifetimeBest;
  const streakForUi = isDaily || dailyStreak > 0 ? dailyStreak : null;

  const playerName = profile?.display_name ?? t('result.me');
  const opponentName = opponent?.display_name ?? t('result.opponent');
  const title = isFriend
    ? won
      ? t('ranking.fcYouWin')
      : draw
        ? t('ranking.fcDraw')
        : t('ranking.fcYouLose')
    : won
      ? t('result.victory')
      : draw
        ? t('result.draw')
        : t('result.defeat');

  const cardTitle = isDaily
    ? t('ranking.dailyTitle')
    : isFriend
      ? `${title} · ${t('ranking.fcFriendDuel')}`
      : title;

  const activeCode =
    lastCreatedChallengeCode ??
    (isFriend ? friendChallenge?.code ?? null : null);

  const shareText = useMemo(
    () =>
      buildPvpShareText({
        playerName,
        opponentName,
        rounds,
        playerWins: shownPlayerWins,
        opponentWins: shownOpponentWins,
        avgMs,
        bestMs,
        streak: isDaily ? dailyStreak : null,
        won,
        draw,
        challengeLine: activeCode
          ? t('ranking.shareChallengeWithCode', { code: activeCode })
          : t('ranking.shareChallenge'),
        challengeCode: activeCode,
        challengeLink: activeCode ? buildChallengeWebLink(activeCode) : null,
        dailyBadge,
        seasonBadge,
        resultVictory: t('result.victory'),
        resultDefeat: t('result.defeat'),
        resultDraw: t('result.draw'),
      }),
    [
      activeCode,
      avgMs,
      bestMs,
      dailyBadge,
      dailyStreak,
      draw,
      isDaily,
      opponentName,
      shownOpponentWins,
      playerName,
      shownPlayerWins,
      rounds,
      seasonBadge,
      t,
      won,
    ],
  );

  const onShare = useCallback(() => {
    void recordAppEvent('share_click', {
      mode: matchMode,
      code: activeCode,
      kind: 'text',
    });
    void Share.share({ message: shareText })
      .then(() => {
        if (isDaily) {
          void pvpMarkDailyShared().catch(() => {});
        }
      })
      .catch(() => {});
  }, [activeCode, isDaily, matchMode, shareText]);

  const onShareWanted = useCallback(async () => {
    if (sharingPoster) return;
    setSharingPoster(true);
    setPosterError(null);
    try {
      // layout 한 프레임 확보
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const ok = await shareWantedPosterImage(posterRef, shareText);
      if (!ok) {
        setPosterError(t('ranking.wantedShareFailed'));
        return;
      }
      void recordAppEvent('share_click', {
        mode: matchMode,
        code: activeCode,
        kind: 'wanted_image',
      });
      if (isDaily) {
        void pvpMarkDailyShared().catch(() => {});
      }
      void trigger('success');
    } catch (e) {
      const raw = formatUnknownError(e);
      const friendly =
        raw.includes('ExpoSharing') ||
        raw.includes('RNViewShot') ||
        raw.includes('Native module') ||
        raw.includes('image_share_unavailable') ||
        raw.includes('capture_failed') ||
        raw.includes('poster_not_ready')
          ? t('ranking.wantedShareFailed')
          : raw || t('ranking.wantedShareFailed');
      setPosterError(friendly);
      console.warn('[wanted-share]', raw);
    } finally {
      setSharingPoster(false);
    }
  }, [activeCode, isDaily, matchMode, shareText, sharingPoster, t]);

  /** One creation path: the challenge screen builds it from real recent shots. */
  const onSendChallenge = useCallback(() => {
    router.replace({ pathname: '/ranking/challenge', params: { send: '1' } } as Href);
  }, [router]);

  /** Back to the Bounty Board already in the stack: no remount, no reload. */
  const onBackToBoard = useCallback(() => {
    router.dismissTo('/ranking' as Href);
  }, [router]);

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
            playerWins={shownPlayerWins}
            opponentWins={shownOpponentWins}
            avgMs={avgMs}
            bestMs={bestMs}
            streak={streakForUi}
            won={won}
            draw={draw}
            title={cardTitle}
            avgLabel={t('ranking.avgCaption')}
            bestLabel={t('ranking.bestCaption')}
            streakLabel={t('ranking.streakCaption')}
            dailyBadge={dailyBadge}
            seasonBadge={seasonBadge}
          />

          <View
            style={[
              styles.previewWrap,
              {
                height: WANTED_POSTER_HEIGHT * PREVIEW_SCALE,
                width: WANTED_POSTER_WIDTH * PREVIEW_SCALE,
              },
            ]}
          >
            <View
              ref={posterRef}
              collapsable={false}
              style={{
                width: WANTED_POSTER_WIDTH,
                height: WANTED_POSTER_HEIGHT,
                transform: [
                  {
                    translateX:
                      (-WANTED_POSTER_WIDTH * (1 - PREVIEW_SCALE)) / 2,
                  },
                  {
                    translateY:
                      (-WANTED_POSTER_HEIGHT * (1 - PREVIEW_SCALE)) / 2,
                  },
                  { scale: PREVIEW_SCALE },
                ],
              }}
            >
              <WantedPosterCard
                playerName={playerName}
                opponentName={opponentName}
                rounds={rounds}
                playerWins={shownPlayerWins}
                opponentWins={shownOpponentWins}
                avgMs={avgMs}
                bestMs={bestMs}
                streak={isDaily ? dailyStreak : streakForUi}
                won={won}
                draw={draw}
                challengeCode={activeCode}
                subtitle={cardTitle}
              />
            </View>
          </View>

          {isFriend ? (
            <Text style={styles.unranked}>{t('ranking.fcResultNote')}</Text>
          ) : null}
          {isFriend && lastFriendSubmit?.already_completed ? (
            <Text style={styles.note}>{t('ranking.fcResultAlready')}</Text>
          ) : null}

          {/* Rating exists only for Ranked; a Friend duel never shows a delta. */}
          {!isFriend && lastSubmit ? (
            <RankingRewardCard
              ratingBefore={lastSubmit.rating_before}
              ratingAfter={lastSubmit.rating_after}
              ratingDelta={lastSubmit.rating_delta}
              tierAfter={lastSubmit.rank_tier}
              tierUp={tierUp}
            />
          ) : null}
          {!isFriend && lastSubmit ? (
            <Text style={styles.note}>
              {t('ranking.recordLine', {
                wins: lastSubmit.wins,
                losses: lastSubmit.losses,
              })}
            </Text>
          ) : null}

          {/* Never show a rating the server has not confirmed. */}
          {submissionStatus === 'submitting' ? (
            <Text style={styles.note}>{t('ranking.syncSubmitting')}</Text>
          ) : null}
          {submissionStatus === 'pending_retry' ? (
            <View style={styles.syncBox}>
              <Text style={styles.syncTitle}>{t('ranking.syncPendingTitle')}</Text>
              <Text style={styles.note}>{t('ranking.syncPendingBody')}</Text>
              {submissionRetryable ? (
                <WesternButton
                  title={
                    retryingSettlement
                      ? t('ranking.syncRetrying')
                      : t('ranking.syncRetry')
                  }
                  onPress={() => void onRetrySettlement()}
                  disabled={retryingSettlement}
                />
              ) : (
                <Text style={styles.note}>{t('ranking.syncAwaitServer')}</Text>
              )}
            </View>
          ) : null}
          {submissionStatus === 'failed' ? (
            <Text style={styles.error}>
              {submissionFailure === 'expired'
                ? t('ranking.syncExpired')
                : t('ranking.syncRejected')}
            </Text>
          ) : null}
          {submissionStatus === 'submitted' && matchMode === 'ranked' && !lastSubmit ? (
            <Text style={styles.note}>{t('ranking.syncSettled')}</Text>
          ) : null}

          {isDaily && lastDailySubmit?.already_completed ? (
            <Text style={styles.note}>{t('ranking.dailyAlreadyDone')}</Text>
          ) : null}

          {isFriend && lastFriendSubmit ? (
            <Text style={styles.note}>
              {t('ranking.challengeCompare', {
                yours: lastFriendSubmit.avg_ms ?? '—',
                theirs: lastFriendSubmit.creator_avg_ms ?? '—',
              })}
            </Text>
          ) : null}

          {activeCode ? (
            <Text style={styles.codeLine}>
              {t('ranking.challengeCodeReady', { code: activeCode })}
            </Text>
          ) : null}

          {posterError ? <Text style={styles.error}>{posterError}</Text> : null}

          <WesternButton
            title={
              sharingPoster
                ? t('ranking.wantedSharing')
                : isFriend
                  ? t('ranking.fcShareResult')
                  : t('ranking.wantedShare')
            }
            onPress={() => void onShareWanted()}
            disabled={sharingPoster}
            variant="primary"
          />
          {/* Friend: the text share stays available only when the image share failed. */}
          {!isFriend || posterError ? (
            <WesternButton title={t('ranking.share')} onPress={onShare} />
          ) : null}

          <WesternButton
            title={isFriend ? t('ranking.fcSendChallenge') : t('ranking.challengeCreate')}
            onPress={onSendChallenge}
          />

          {matchMode === 'ranked' ? (
            <WesternButton
              title={t('ranking.duelAgain')}
              onPress={() => void onAgain()}
            />
          ) : null}
          {isFriend ? (
            <WesternButton
              title={t('ranking.fcBackBoard')}
              onPress={onBackToBoard}
              variant="quiet"
            />
          ) : (
            <WesternButton
              title={t('ranking.backHub')}
              onPress={() => router.replace('/ranking' as Href)}
              variant="quiet"
            />
          )}
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
  previewWrap: {
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.35)',
  },
  syncBox: {
    gap: 8,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.35)',
    backgroundColor: 'rgba(26,18,8,0.72)',
  },
  syncTitle: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
  },
  note: {
    color: colors.sand,
    fontSize: 12,
    textAlign: 'center',
  },
  unranked: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
    textAlign: 'center',
  },
  codeLine: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
  },
  error: {
    color: '#E8A0A0',
    fontSize: 12,
    textAlign: 'center',
  },
});
