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

import { DuelArenaLayout } from '@/components/game/DuelArenaLayout';
import {
  enginePhaseToSignalBoardPhase,
  type DuelSignalBoardPhase,
} from '@/components/game/DuelSignalBoard';
import { DuelFullBackground } from '@/components/game/DuelFullBackground';
import { PauseMenuModal } from '@/components/game/PauseMenuModal';
import { SceneBackground } from '@/components/game/SceneBackground';
import { PhoneStageShell } from '@/components/layout/PhoneStageShell';
import {
  DUEL_DEFEAT_MODAL_DELAY_MS,
  DUEL_DEFEAT_REVEAL_DELAY_MS,
} from '@/constants/duelPresentation';
import { DUEL_VISUAL_THEME, MINIMAL_DUEL } from '@/constants/duelTheme';
import { pickBattleDayNight } from '@/constants/gameImages';
import { RM_GAME } from '@/constants/reanimatedGame';
import {
  PVP_MAX_ROUNDS,
  PVP_WINS_NEEDED,
  averageSampleMs,
} from '@/constants/pvpRanks';
import { colors } from '@/constants/theme';
import { useDuelBgmDuck } from '@/hooks/useDuelBgmDuck';
import { useGhostDuelEngine } from '@/hooks/useGhostDuelEngine';
import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { pvpSubmitDaily, pvpSubmitMatch } from '@/lib/supabase/pvpApi';
import { completeDailyAfterReady } from '@/store/dailyMissionStore';
import { usePvpStore } from '@/store/pvpStore';
import { useRankingRewardStore } from '@/store/rankingRewardStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { PvpMatchResult, PvpRoundRecord } from '@/types/pvp';
import { playGunshot } from '@/utils/audioService';
import { speakDuelCue } from '@/utils/duelSignalSpeech';
import { trigger } from '@/utils/hapticService';
import { simulateTargetReactionMs } from '@/utils/npcAI';
import {
  prefetchDuelSprites,
  prefetchPlayerDuelSprites,
} from '@/utils/preloadDuelSprites';
import {
  npcSpritePoseFromPhase,
  playerSpritePoseFromPhase,
} from '@/utils/spritePose';

export default function RankingDuelScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useScreenBgm('duel');
  const stage = usePhoneStageMetrics();
  const winW = stage.windowWidth;
  const winH = stage.windowHeight;
  const isLandscape = winW > winH;
  const selectedCharacterId = useSettingsStore((s) => s.selectedCharacterId);

  const opponent = usePvpStore((s) => s.opponent);
  const profile = usePvpStore((s) => s.profile);
  const matchMode = usePvpStore((s) => s.matchMode);
  const pushRound = usePvpStore((s) => s.pushRound);
  const setScores = usePvpStore((s) => s.setScores);
  const setLastSubmit = usePvpStore((s) => s.setLastSubmit);
  const setLastDailySubmit = usePvpStore((s) => s.setLastDailySubmit);
  const setProfile = usePvpStore((s) => s.setProfile);

  const [playerWins, setPlayerWins] = useState(0);
  const [oppWins, setOppWins] = useState(0);
  const [paused, setPaused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [roundBanner, setRoundBanner] = useState<string | null>(null);
  const [defeatedSide, setDefeatedSide] = useState<'player' | 'npc' | null>(null);
  const [playerShootFlash, setPlayerShootFlash] = useState(false);
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

  const ghostAvgMs = useMemo(() => {
    if (!opponent) return 280;
    return averageSampleMs(opponent.sample_ms);
  }, [opponent]);

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
    const playerId = useSettingsStore.getState().selectedCharacterId;
    const cosmetic = opponent.cosmetic_npc_id;
    if (cosmetic != null && cosmetic > 0) {
      void prefetchDuelSprites(cosmetic, playerId);
    } else {
      void prefetchPlayerDuelSprites(playerId, opponent.character_id);
    }
  }, [opponent]);

  const startRound = useCallback(() => {
    if (!opponent) return;
    setRoundBanner(null);
    setDefeatedSide(null);
    setPlayerShootFlash(false);
    start(simulateTargetReactionMs(ghostAvgMs));
  }, [ghostAvgMs, opponent, start]);

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

      if (matchMode !== 'daily') {
        completeDailyAfterReady(
          result === 'win' ? ['rankingPlay', 'rankingWin'] : ['rankingPlay'],
        );
      }

      try {
        const characterId = useSettingsStore.getState().selectedCharacterId;
        const cosmeticNpcId =
          useRankingRewardStore.getState().selectedCosmeticNpcId;

        if (matchMode === 'daily') {
          const dailySubmit = await pvpSubmitDaily({
            playerRounds,
            scorePlayer: finalPlayerWins,
            scoreOpponent: finalOppWins,
            result,
          });
          setLastDailySubmit(dailySubmit);
          setLastSubmit(null);
        } else {
          const submit = await pvpSubmitMatch({
            opponentId: opponent.id,
            opponentIsBot: opponent.is_bot,
            playerRounds,
            opponentRounds,
            scorePlayer: finalPlayerWins,
            scoreOpponent: finalOppWins,
            result,
            characterId,
            cosmeticNpcId,
          });
          setLastSubmit(submit);
          setLastDailySubmit(null);
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
      }

      setSubmitting(false);
      router.replace('/ranking/result' as Href);
    },
    [
      matchMode,
      opponent,
      profile,
      router,
      setLastDailySubmit,
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
      (outcome.winner !== 'draw' &&
        roundsRef.current.filter((r) => r.winner !== 'draw').length >= PVP_MAX_ROUNDS);

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
    return npcSpritePoseFromPhase(phase, holdResultShoot);
  }, [defeatedSide, phase, holdResultShoot]);
  const playerPose = useMemo(() => {
    if (defeatedSide === 'player') return 'defeat' as const;
    if (defeatedSide === 'npc') return 'idle' as const;
    return playerSpritePoseFromPhase(phase, playerShootFlash, holdResultShoot);
  }, [defeatedSide, phase, playerShootFlash, holdResultShoot]);

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

  const cosmeticId = opponent.cosmetic_npc_id;
  const useNpcSprite = cosmeticId != null && cosmeticId > 0;
  const playerHearts = Math.max(0, PVP_WINS_NEEDED - oppWins);
  const opponentHearts = Math.max(0, PVP_WINS_NEEDED - playerWins);

  const arena = (
    <>
      <DuelArenaLayout
        width={winW}
        height={winH}
        paddingTop={overlayPad.top}
        paddingBottom={insets.bottom}
        paddingRight={overlayPad.right}
        npcId={useNpcSprite ? (cosmeticId as number) : 1}
        tier="gold"
        bossFlag={false}
        npcPose={npcPose}
        npcVictoryActive={defeatedSide === 'player'}
        playerVictoryActive={defeatedSide === 'npc'}
        playerCharacterId={selectedCharacterId}
        playerPose={playerPose}
        signalPhase={signalBoardPhase}
        blindBangText={false}
        invertSignalColors={false}
        opponentHearts={opponentHearts}
        playerHearts={playerHearts}
        playerScore={playerWins}
        opponentScore={oppWins}
        shootCapturesEarly={shootCapturesEarly}
        shootActive={shootActive}
        onShootPress={onShootPress}
        onPause={() => setPaused(true)}
        pauseDisabled={submitting}
        playerTapAckStyle={playerTapAckStyle}
        hideBottomHud={submitting}
        orientation={isLandscape ? 'landscape' : 'portrait'}
        opponentName={opponent.display_name}
        opponentCharacterId={useNpcSprite ? undefined : opponent.character_id}
        winsNeeded={PVP_WINS_NEEDED}
        tierLabel={opponent.rank_tier}
      />

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

  const arenaShellProps = {
    style: { width: winW, height: winH } as const,
    contentWidth: winW,
    contentHeight: winH,
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PhoneStageShell
        edgeToEdge
        backgroundColor={DUEL_VISUAL_THEME === 'minimal' ? MINIMAL_DUEL.stageEdge : undefined}
      >
        {DUEL_VISUAL_THEME === 'minimal' ? (
          <SceneBackground
            {...arenaShellProps}
            solidColor={MINIMAL_DUEL.bg}
            dimColor="transparent"
          >
            {arena}
          </SceneBackground>
        ) : (
          <DuelFullBackground {...arenaShellProps} variant={battleDayNight}>
            {arena}
          </DuelFullBackground>
        )}
      </PhoneStageShell>
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
});
