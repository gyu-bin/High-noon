import { Stack, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { NpcFirstPersonDuelArena } from '@/components/game/NpcFirstPersonDuelArena';
import {
  enginePhaseToSignalBoardPhase,
  type DuelSignalBoardPhase,
} from '@/components/game/DuelSignalBoard';
import { PauseMenuModal } from '@/components/game/PauseMenuModal';
import { PhoneStageShell } from '@/components/layout/PhoneStageShell';
import {
  DUEL_DEFEAT_MODAL_DELAY_MS,
  DUEL_DEFEAT_REVEAL_DELAY_MS,
} from '@/constants/duelPresentation';
import { pickBattleDayNight } from '@/constants/gameImages';
import { RM_GAME } from '@/constants/reanimatedGame';
import {
  PVP_MAX_ROUNDS,
  PVP_WINS_NEEDED,
  parseRankTier,
} from '@/constants/pvpRanks';
import { colors } from '@/constants/theme';
import { useDuelBgmDuck } from '@/hooks/useDuelBgmDuck';
import { useGhostDuelEngine } from '@/hooks/useGhostDuelEngine';
import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { pvpSubmitDaily, pvpSubmitFriendChallenge, pvpSubmitMatch } from '@/lib/supabase/pvpApi';
import { recordAppEvent } from '@/lib/supabase/analyticsApi';
import { usePvpStore } from '@/store/pvpStore';
import { usePvpStatsStore } from '@/store/pvpStatsStore';
import { useRankingRewardStore } from '@/store/rankingRewardStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { PvpMatchResult, PvpRoundRecord } from '@/types/pvp';
import { utcDateKey } from '@/utils/dailyChallenge';
import { bestPlayerMs } from '@/utils/reactionStats';
import { playGunshot } from '@/utils/audioService';
import { speakDuelCue } from '@/utils/duelSignalSpeech';
import { trigger } from '@/utils/hapticService';
import { prefetchLocalDuelSprites } from '@/utils/preloadDuelSprites';
import {
  npcSpritePoseFromPhase,
} from '@/utils/spritePose';

export default function RankingDuelScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useScreenBgm('duel');
  const stage = usePhoneStageMetrics();
  const winW = stage.windowWidth;
  const winH = stage.windowHeight;
  const opponent = usePvpStore((s) => s.opponent);
  const matchId = usePvpStore((s) => s.matchId);
  const profile = usePvpStore((s) => s.profile);
  const matchMode = usePvpStore((s) => s.matchMode);
  const friendChallenge = usePvpStore((s) => s.friendChallenge);
  const pushRound = usePvpStore((s) => s.pushRound);
  const setScores = usePvpStore((s) => s.setScores);
  const setLastSubmit = usePvpStore((s) => s.setLastSubmit);
  const setLastDailySubmit = usePvpStore((s) => s.setLastDailySubmit);
  const setLastFriendSubmit = usePvpStore((s) => s.setLastFriendSubmit);
  const setProfile = usePvpStore((s) => s.setProfile);

  const [playerWins, setPlayerWins] = useState(0);
  const [oppWins, setOppWins] = useState(0);
  const [paused, setPaused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [roundBanner, setRoundBanner] = useState<string | null>(null);
  const [defeatedSide, setDefeatedSide] = useState<'player' | 'npc' | null>(null);
  const [playerShootFlash, setPlayerShootFlash] = useState(false);
  const [ghostShotActive, setGhostShotActive] = useState(false);
  const [signalBoardPhase, setSignalBoardPhase] =
    useState<DuelSignalBoardPhase>('idle');

  const roundsRef = useRef<PvpRoundRecord[]>([]);
  const playerWinsRef = useRef(0);
  const oppWinsRef = useRef(0);
  const finishingRef = useRef(false);
  const processedOutcomeRef = useRef<object | null>(null);
  const playerTapAck = useSharedValue(0);

  const overlayPad = useMemo(
    () => ({
      top: insets.top + 6,
      right: 12 + insets.right,
      left: 12 + insets.left,
    }),
    [insets.top, insets.right, insets.left],
  );

  const battleDayNight = useMemo(
    () => pickBattleDayNight(opponent?.character_id ?? 1),
    [opponent?.character_id],
  );

  const leave = useCallback(() => {
    router.replace('/ranking' as Href);
  }, [router]);

  const fireGunshot = useCallback(() => {
    playGunshot();
  }, []);

  const {
    phase,
    outcome,
    start,
    tap,
    reset,
    isBangReactionArmed,
    pauseTimers,
    resumeTimers,
  } = useGhostDuelEngine({
    onBangEnter: () => {
      void speakDuelCue('bang');
      void trigger('heavy');
    },
    onBangTap: () => {
      void trigger('medium');
      fireGunshot();
    },
    onGhostFire: () => {
      setGhostShotActive(true);
      fireGunshot();
    },
  });

  useDuelBgmDuck(phase);

  useEffect(() => {
    if (!opponent) {
      router.replace('/ranking' as Href);
    }
  }, [opponent, router]);

  useEffect(() => {
    if (!opponent) return;
    if (matchMode === 'daily') {
      void recordAppEvent('daily_start', {});
    } else if (matchMode === 'friend') {
      void recordAppEvent('challenge_open', {
        code: friendChallenge?.code ?? null,
        phase: 'duel',
      });
    } else {
      void recordAppEvent('game_start', { mode: 'ranked' });
    }
  }, [friendChallenge?.code, matchMode, opponent]);

  useEffect(() => {
    if (!opponent) return;
    const playerId = useSettingsStore.getState().selectedCharacterId;
    void prefetchLocalDuelSprites(
      { kind: 'player', id: playerId },
      { kind: 'player', id: opponent.character_id },
    );
  }, [opponent]);

  const startRound = useCallback(() => {
    if (!opponent) return;
    setRoundBanner(null);
    setDefeatedSide(null);
    setPlayerShootFlash(false);
    const roundIndex = Math.min(roundsRef.current.length, PVP_MAX_ROUNDS - 1);
    // 비동기 기록 결투는 상대의 저장된 각 라운드를 그대로 재생한다.
    // NPC AI처럼 평균값에 임의 흔들림을 더하지 않는다.
    start(opponent.sample_ms[roundIndex] ?? opponent.sample_ms[0] ?? 280);
  }, [opponent, start]);

  useEffect(() => {
    if (!opponent) return;
    playerWinsRef.current = 0;
    oppWinsRef.current = 0;
    roundsRef.current = [];
    finishingRef.current = false;
    processedOutcomeRef.current = null;
    setPlayerWins(0);
    setOppWins(0);
    const tmr = setTimeout(() => startRound(), 400);
    return () => clearTimeout(tmr);
  }, [opponent, startRound]);

  useEffect(() => {
    if (paused) pauseTimers();
    else resumeTimers();
  }, [paused, pauseTimers, resumeTimers]);

  useEffect(() => {
    if (phase === '준비') void speakDuelCue('ready');
    if (phase === '집중') void speakDuelCue('steady');
  }, [phase]);

  useEffect(() => {
    setSignalBoardPhase(enginePhaseToSignalBoardPhase(phase));
  }, [phase]);

  useEffect(() => {
    if (phase !== '뱅' && phase !== '결과') {
      setPlayerShootFlash(false);
      setGhostShotActive(false);
    }
  }, [phase]);

  const playerTapAckStyle = useAnimatedStyle(() => ({
    opacity: playerTapAck.value,
  }));

  const pulsePlayerTapAck = useCallback(
    (kind: 'bang' | 'other') => {
      cancelAnimation(playerTapAck);
      playerTapAck.value = 0;
      const peak = kind === 'bang' ? 0.22 : 0.14;
      const upMs = kind === 'bang' ? 100 : 70;
      playerTapAck.value = withSequence(
        withTiming(peak, { duration: upMs, easing: Easing.out(Easing.quad), reduceMotion: RM_GAME }),
        withTiming(0, { duration: 220, easing: Easing.in(Easing.quad), reduceMotion: RM_GAME }),
      );
    },
    [playerTapAck],
  );

  const finishMatch = useCallback(
    async (finalPlayerWins: number, finalOppWins: number, records: PvpRoundRecord[]) => {
      if (!opponent || finishingRef.current) return;
      finishingRef.current = true;
      setSubmitting(true);

      let result: PvpMatchResult = 'draw';
      if (finalPlayerWins > finalOppWins) result = 'win';
      else if (finalOppWins > finalPlayerWins) result = 'loss';

      const playerRounds: (number | null)[] = [null, null, null];
      const opponentRounds: number[] = [
        opponent.sample_ms[0],
        opponent.sample_ms[1],
        opponent.sample_ms[2],
      ];
      records.forEach((r, i) => {
        if (i < 3) {
          playerRounds[i] = r.playerMs;
          if (r.opponentMs != null) opponentRounds[i] = r.opponentMs;
        }
      });

      setScores(finalPlayerWins, finalOppWins);
      usePvpStore.setState({ rounds: records });

      const sessionBest = bestPlayerMs(records);
      usePvpStatsStore.getState().recordBestReaction(sessionBest);

      try {
        const characterId = useSettingsStore.getState().selectedCharacterId;

        if (matchMode === 'daily') {
          const dailySubmit = await pvpSubmitDaily({
            playerRounds,
            scorePlayer: finalPlayerWins,
            scoreOpponent: finalOppWins,
            result,
          });
          setLastDailySubmit(dailySubmit);
          setLastSubmit(null);
          setLastFriendSubmit(null);
          if (!dailySubmit.already_completed) {
            usePvpStatsStore.getState().recordDailyComplete(utcDateKey());
            void recordAppEvent('daily_complete', {
              result,
              avg_ms: dailySubmit.avg_ms,
            });
          }
        } else if (matchMode === 'friend' && friendChallenge) {
          const friendSubmit = await pvpSubmitFriendChallenge({
            code: friendChallenge.code,
            playerRounds,
            scorePlayer: finalPlayerWins,
            scoreCreator: finalOppWins,
            result,
          });
          setLastFriendSubmit(friendSubmit);
          setLastSubmit(null);
          setLastDailySubmit(null);
          if (!friendSubmit.already_completed) {
            void recordAppEvent('challenge_complete', {
              code: friendChallenge.code,
              result,
              avg_ms: friendSubmit.avg_ms,
            });
          }
        } else {
          const submit = await pvpSubmitMatch({
            matchId: matchId ?? opponent.id,
            opponentIsBot: opponent.is_bot,
            playerRounds,
            opponentRounds,
            scorePlayer: finalPlayerWins,
            scoreOpponent: finalOppWins,
            result,
            characterId,
          });
          setLastSubmit(submit);
          setLastDailySubmit(null);
          setLastFriendSubmit(null);
          useRankingRewardStore.getState().recordSeasonPeak(submit.rank_tier);
          if (profile) {
            setProfile({
              ...profile,
              rating: submit.rating_after,
              rank_tier: submit.rank_tier,
              wins: submit.wins,
              losses: submit.losses,
            });
          }
        }
      } catch (e) {
        console.warn('[pvp] submit failed', e);
        setLastSubmit(null);
        setLastDailySubmit(null);
        setLastFriendSubmit(null);
      }

      setSubmitting(false);
      router.replace('/ranking/result' as Href);
    },
    [
      friendChallenge,
      matchMode,
      matchId,
      opponent,
      profile,
      router,
      setLastDailySubmit,
      setLastFriendSubmit,
      setLastSubmit,
      setProfile,
      setScores,
    ],
  );

  useEffect(() => {
    if (!outcome || phase !== '결과' || finishingRef.current) return;
    if (processedOutcomeRef.current === outcome) return;
    processedOutcomeRef.current = outcome;

    const record: PvpRoundRecord = {
      playerMs: outcome.playerMs,
      opponentMs: outcome.opponentMs,
      winner: outcome.winner,
      playerEarly: outcome.playerEarly,
      playerTimeout: outcome.playerTimeout,
    };
    roundsRef.current = [...roundsRef.current, record];
    pushRound(record);

    let pw = playerWinsRef.current;
    let ow = oppWinsRef.current;
    if (outcome.winner === 'player') pw += 1;
    if (outcome.winner === 'opponent') ow += 1;
    playerWinsRef.current = pw;
    oppWinsRef.current = ow;
    setPlayerWins(pw);
    setOppWins(ow);

    const banner =
      outcome.winner === 'draw'
        ? t('ranking.roundDraw')
        : outcome.winner === 'player'
          ? t('result.roundVictory')
          : t('result.defeat');
    setRoundBanner(banner);

    const matchOver =
      pw >= PVP_WINS_NEEDED ||
      ow >= PVP_WINS_NEEDED ||
      roundsRef.current.length >= PVP_MAX_ROUNDS;

    const revealDelay =
      outcome.winner === 'draw' ? 80 : DUEL_DEFEAT_REVEAL_DELAY_MS;
    const nextDelay =
      outcome.winner === 'draw' ? 900 : DUEL_DEFEAT_MODAL_DELAY_MS;

    const revealT = setTimeout(() => {
      if (outcome.winner === 'player') setDefeatedSide('npc');
      else if (outcome.winner === 'opponent') setDefeatedSide('player');
    }, revealDelay);

    const nextT = setTimeout(() => {
      if (matchOver) {
        void finishMatch(pw, ow, roundsRef.current);
        return;
      }
      startRound();
    }, nextDelay);

    return () => {
      clearTimeout(revealT);
      clearTimeout(nextT);
    };
  }, [outcome, phase, finishMatch, pushRound, startRound, t]);

  const holdResultShoot = phase === '결과' && defeatedSide == null;
  const npcPose = useMemo(() => {
    if (defeatedSide === 'npc') return 'defeat' as const;
    if (defeatedSide === 'player') return 'idle' as const;
    if (phase === '뱅') return ghostShotActive ? 'shoot' as const : 'aim' as const;
    return npcSpritePoseFromPhase(phase, holdResultShoot);
  }, [defeatedSide, ghostShotActive, phase, holdResultShoot]);
  const shootCapturesEarly =
    phase !== '대기' && phase !== '결과' && !paused && !submitting;
  const shootActive = shootCapturesEarly && isBangReactionArmed();

  const onShootPress = useCallback(() => {
    if (!shootCapturesEarly) return;
    const armed = isBangReactionArmed();
    if (armed) {
      pulsePlayerTapAck('bang');
      setPlayerShootFlash(true);
    } else {
      pulsePlayerTapAck('other');
      void trigger('light');
      setPlayerShootFlash(true);
    }
    tap();
  }, [isBangReactionArmed, pulsePlayerTapAck, shootCapturesEarly, tap]);

  if (!opponent) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const playerHearts = Math.max(0, PVP_WINS_NEEDED - oppWins);
  const opponentHearts = Math.max(0, PVP_WINS_NEEDED - playerWins);

  const arena = (
    <>
      <NpcFirstPersonDuelArena
        width={winW}
        height={winH}
        paddingTop={overlayPad.top}
        paddingBottom={insets.bottom}
        paddingLeft={overlayPad.left}
        paddingRight={overlayPad.right}
        npcId={1}
        tier="bronze"
        bossFlag={false}
        dayNight={battleDayNight}
        npcPose={npcPose}
        npcVictoryActive={defeatedSide === 'player'}
        playerDefeated={defeatedSide === 'player'}
        signalPhase={signalBoardPhase}
        blindBangText={false}
        hideBangText={false}
        voidShroud={false}
        echoBangMiddleSignal={false}
        specialPresentation={null}
        opponentHearts={opponentHearts}
        playerHearts={playerHearts}
        currentRound={Math.min(roundsRef.current.length + 1, PVP_MAX_ROUNDS)}
        shootCapturesEarly={shootCapturesEarly}
        shootActive={shootActive}
        playerShotActive={playerShootFlash}
        npcShotActive={ghostShotActive}
        earlyWarning={false}
        onShootPress={onShootPress}
        onPause={() => {
          if (phase === '뱅' || phase === '페이크') return;
          setPaused(true);
        }}
        pauseDisabled={submitting || phase === '뱅' || phase === '페이크'}
        opponentName={opponent.display_name}
        opponentCharacterId={opponent.character_id}
        opponentTierLabel={t(`ranking.tier.${parseRankTier(opponent.rank_tier)}`)}
        recordDuelLabel={t('ranking.recordDuel')}
        heartsMax={PVP_WINS_NEEDED}
      />

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, playerTapAckStyle, styles.tapAck]} />

      {roundBanner ? (
        <View pointerEvents="none" style={styles.roundBannerWrap}>
          <Text style={styles.roundBanner}>{roundBanner}</Text>
        </View>
      ) : null}

      {submitting ? (
        <View style={styles.submitting} pointerEvents="auto">
          <ActivityIndicator color={colors.gold} />
        </View>
      ) : null}

      <PauseMenuModal
        visible={paused}
        onResume={() => setPaused(false)}
        onSecondaryExit={() => {
          setPaused(false);
          reset();
          leave();
        }}
        secondaryLabel={t('ranking.abort')}
        onMainMenu={() => {
          setPaused(false);
          reset();
          router.replace('/menu');
        }}
      />
    </>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PhoneStageShell edgeToEdge>{arena}</PhoneStageShell>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1208',
  },
  roundBannerWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 12,
    paddingTop: 80,
  },
  roundBanner: {
    color: colors.gold,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  submitting: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 4, 2, 0.45)',
    zIndex: 20,
  },
  tapAck: {
    backgroundColor: '#FFD08A',
  },
});
