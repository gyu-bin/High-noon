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
import {
  pvpCreateFriendChallenge,
  pvpMarkDailyShared,
  pvpMatchmake,
} from '@/lib/supabase/pvpApi';
import { usePvpStore } from '@/store/pvpStore';
import { usePvpStatsStore } from '@/store/pvpStatsStore';
import { useRankingRewardStore } from '@/store/rankingRewardStore';
import { useSettingsStore } from '@/store/settingsStore';
import {
  buildChallengeDeepLink,
  buildChallengeWebLink,
} from '@/utils/challengeLink';
import { buildPvpShareText } from '@/utils/pvpShareText';
import {
  averagePlayerMs,
  bestPlayerMs,
  ghostSampleFromRounds,
} from '@/utils/reactionStats';
import { shareWantedPosterImage } from '@/utils/shareWantedPoster';
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
  const friendChallenge = usePvpStore((s) => s.friendChallenge);
  const lastCreatedChallengeCode = usePvpStore((s) => s.lastCreatedChallengeCode);
  const beginMatch = usePvpStore((s) => s.beginMatch);
  const setLastCreatedChallengeCode = usePvpStore(
    (s) => s.setLastCreatedChallengeCode,
  );
  const seasonPeaks = useRankingRewardStore((s) => s.seasonPeaks);
  const recordSeasonPeak = useRankingRewardStore((s) => s.recordSeasonPeak);
  const dailyStreak = usePvpStatsStore((s) => s.dailyStreak);
  const lifetimeBest = usePvpStatsStore((s) => s.bestReactionMs);

  const [creatingChallenge, setCreatingChallenge] = useState(false);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [sharingPoster, setSharingPoster] = useState(false);
  const [posterError, setPosterError] = useState<string | null>(null);
  const posterRef = useRef<View>(null);

  const won = playerWins > opponentWins;
  const draw = playerWins === opponentWins;
  const isDaily = matchMode === 'daily';
  const isFriend = matchMode === 'friend';
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
  const title = won
    ? t('result.victory')
    : draw
      ? t('result.draw')
      : t('result.defeat');

  const cardTitle = isDaily
    ? t('ranking.dailyTitle')
    : isFriend
      ? t('ranking.challengeResultTitle')
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
        playerWins,
        opponentWins,
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
      opponentWins,
      playerName,
      playerWins,
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
      const raw = e instanceof Error ? e.message : String(e);
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

  const onCreateChallenge = useCallback(async () => {
    if (creatingChallenge || isFriend) return;
    setCreatingChallenge(true);
    setChallengeError(null);
    try {
      let code = lastCreatedChallengeCode;
      let avgForCopy = avgMs;

      if (!code) {
        const sampleMs = ghostSampleFromRounds(
          rounds,
          opponent?.sample_ms ?? [280, 280, 280],
        );
        const created = await pvpCreateFriendChallenge({
          sampleMs,
          scoreCreator: playerWins,
          creatorAvgMs: avgMs != null ? Math.round(avgMs) : null,
          creatorBestMs: sessionBest != null ? Math.round(sessionBest) : null,
          characterId: useSettingsStore.getState().selectedCharacterId,
        });
        code = created.code;
        setLastCreatedChallengeCode(created.code);
        void recordAppEvent('challenge_create', { code: created.code });
        void trigger('success');
      }

      const link = buildChallengeWebLink(code);
      const deep = buildChallengeDeepLink(code);
      await Share.share({
        message: [
          t('ranking.challengeInvite', {
            code,
            ms: avgForCopy != null ? `${Math.round(avgForCopy)}` : '???',
          }),
          link,
          deep,
        ].join('\n'),
      });
      void recordAppEvent('share_click', {
        mode: 'challenge_invite',
        code,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setChallengeError(msg);
    } finally {
      setCreatingChallenge(false);
    }
  }, [
    avgMs,
    creatingChallenge,
    isFriend,
    lastCreatedChallengeCode,
    opponent?.sample_ms,
    playerWins,
    rounds,
    sessionBest,
    setLastCreatedChallengeCode,
    t,
  ]);

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
                playerWins={playerWins}
                opponentWins={opponentWins}
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

          {lastSubmit ? (
            <RankingRewardCard
              ratingBefore={lastSubmit.rating_before}
              ratingAfter={lastSubmit.rating_after}
              ratingDelta={lastSubmit.rating_delta}
              tierAfter={lastSubmit.rank_tier}
              tierUp={tierUp}
            />
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

          {challengeError ? (
            <Text style={styles.error}>{challengeError}</Text>
          ) : null}

          {posterError ? <Text style={styles.error}>{posterError}</Text> : null}

          <WesternButton
            title={
              sharingPoster
                ? t('ranking.wantedSharing')
                : t('ranking.wantedShare')
            }
            onPress={() => void onShareWanted()}
            disabled={sharingPoster}
            variant="primary"
          />
          <WesternButton title={t('ranking.share')} onPress={onShare} />

          {!isFriend ? (
            <WesternButton
              title={
                creatingChallenge
                  ? t('ranking.challengeCreating')
                  : activeCode
                    ? t('ranking.challengeShareAgain')
                    : t('ranking.challengeCreate')
              }
              onPress={() => void onCreateChallenge()}
              disabled={creatingChallenge}
            />
          ) : null}

          {matchMode === 'ranked' ? (
            <WesternButton
              title={t('ranking.duelAgain')}
              onPress={() => void onAgain()}
            />
          ) : null}
          <WesternButton
            title={t('ranking.backHub')}
            onPress={() => router.replace('/ranking' as Href)}
            variant="quiet"
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
  previewWrap: {
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.35)',
  },
  note: {
    color: colors.sand,
    fontSize: 12,
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
