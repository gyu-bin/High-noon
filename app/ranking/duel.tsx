import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { PauseMenuModal } from '@/components/game/PauseMenuModal';
import { PhoneStageShell } from '@/components/layout/PhoneStageShell';
import { FONT_RYE } from '@/constants/fonts';
import { PVP_MAX_ROUNDS, PVP_WINS_NEEDED } from '@/constants/pvpRanks';
import { colors } from '@/constants/theme';
import { useGhostDuelEngine } from '@/hooks/useGhostDuelEngine';
import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { play } from '@/utils/audioService';
import { speakDuelCue } from '@/utils/duelSignalSpeech';
import { formatReactionMs } from '@/utils/formatReactionMs';
import { trigger } from '@/utils/hapticService';
import { pvpSubmitMatch } from '@/lib/supabase/pvpApi';
import { usePvpStore } from '@/store/pvpStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { PvpMatchResult, PvpRoundRecord } from '@/types/pvp';

export default function RankingDuelScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useScreenBgm('duel');
  const { stageWidth: winW, stageHeight: winH } = usePhoneStageMetrics();

  const opponent = usePvpStore((s) => s.opponent);
  const profile = usePvpStore((s) => s.profile);
  const pushRound = usePvpStore((s) => s.pushRound);
  const setScores = usePvpStore((s) => s.setScores);
  const setLastSubmit = usePvpStore((s) => s.setLastSubmit);
  const setProfile = usePvpStore((s) => s.setProfile);

  const [playerWins, setPlayerWins] = useState(0);
  const [oppWins, setOppWins] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [roundBanner, setRoundBanner] = useState<string | null>(null);

  const roundsRef = useRef<PvpRoundRecord[]>([]);
  const playerWinsRef = useRef(0);
  const oppWinsRef = useRef(0);
  const finishingRef = useRef(false);
  const roundIndexRef = useRef(0);

  const leave = useCallback(() => {
    router.replace('/ranking');
  }, [router]);

  const {
    phase,
    signalText,
    outcome,
    start,
    tap,
    reset,
    pauseTimers,
    resumeTimers,
  } = useGhostDuelEngine({
    onBangEnter: () => {
      void speakDuelCue('bang');
      void play('bang_shot');
    },
    onBangTap: () => {
      void trigger('medium');
      void play('bang_shot');
    },
    onGhostFire: () => {
      void play('bang_shot');
    },
  });

  // Guard: no opponent → back to hub
  useEffect(() => {
    if (!opponent) {
      router.replace('/ranking');
    }
  }, [opponent, router]);

  const startRound = useCallback(
    (idx: number) => {
      if (!opponent) return;
      const ms = opponent.sample_ms[idx] ?? opponent.sample_ms[0];
      setRoundBanner(null);
      start(ms);
    },
    [opponent, start],
  );

  useEffect(() => {
    if (!opponent) return;
    roundIndexRef.current = 0;
    playerWinsRef.current = 0;
    oppWinsRef.current = 0;
    roundsRef.current = [];
    setPlayerWins(0);
    setOppWins(0);
    setRoundIndex(0);
    const tmr = setTimeout(() => startRound(0), 400);
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

  const finishMatch = useCallback(
    async (finalPlayerWins: number, finalOppWins: number, records: PvpRoundRecord[]) => {
      if (!opponent || finishingRef.current) return;
      finishingRef.current = true;
      setSubmitting(true);

      let result: PvpMatchResult = 'draw';
      if (finalPlayerWins > finalOppWins) result = 'win';
      else if (finalOppWins > finalPlayerWins) result = 'loss';

      // Pad to 3 slots for server
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

      try {
        const characterId = useSettingsStore.getState().selectedCharacterId;
        const submit = await pvpSubmitMatch({
          opponentId: opponent.id,
          opponentIsBot: opponent.is_bot,
          playerRounds,
          opponentRounds,
          scorePlayer: finalPlayerWins,
          scoreOpponent: finalOppWins,
          result,
          characterId,
        });
        setLastSubmit(submit);
        if (profile) {
          setProfile({
            ...profile,
            rating: submit.rating_after,
            rank_tier: submit.rank_tier,
            wins: submit.wins,
            losses: submit.losses,
          });
        }
      } catch (e) {
        console.warn('[pvp] submit failed', e);
        setLastSubmit(null);
      }

      setSubmitting(false);
      router.replace('/ranking/result');
    },
    [
      opponent,
      profile,
      router,
      setLastSubmit,
      setProfile,
      setScores,
    ],
  );

  // Handle round outcome
  useEffect(() => {
    if (!outcome || phase !== '결과' || finishingRef.current) return;

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
    // draw → replay same round index (no score change), don't advance
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

    // Count only decisive rounds toward round index advance
    if (outcome.winner !== 'draw') {
      roundIndexRef.current += 1;
      setRoundIndex(roundIndexRef.current);
    }

    const delay = setTimeout(() => {
      if (matchOver) {
        void finishMatch(pw, ow, roundsRef.current);
        return;
      }
      // draw: same sample again; else next sample
      const nextIdx =
        outcome.winner === 'draw'
          ? Math.min(roundIndexRef.current, PVP_MAX_ROUNDS - 1)
          : Math.min(roundIndexRef.current, PVP_MAX_ROUNDS - 1);
      startRound(nextIdx);
    }, 1400);

    return () => clearTimeout(delay);
  }, [outcome, phase, finishMatch, pushRound, startRound, t]);

  if (!opponent) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const signalColor =
    phase === '뱅' ? '#F5E6C8' : phase === '집중' ? '#E8A82A' : colors.sand;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PhoneStageShell>
        <View style={[styles.root, { width: winW, height: winH }]}>
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <Pressable onPress={() => setPaused(true)} hitSlop={12}>
              <Text style={styles.pause}>⏸</Text>
            </Pressable>
            <Text style={styles.score}>
              {playerWins} — {oppWins}
            </Text>
            <Text style={styles.roundLabel}>
              R{Math.min(roundIndex + 1, PVP_MAX_ROUNDS)}
            </Text>
          </View>

          <View style={styles.vsRow}>
            <Text style={styles.vsName} numberOfLines={1}>
              {profile?.display_name ?? t('result.me')}
            </Text>
            <Text style={[styles.vsVs, { fontFamily: FONT_RYE }]}>VS</Text>
            <Text style={styles.vsName} numberOfLines={1}>
              {opponent.display_name}
            </Text>
          </View>

          <Pressable style={styles.tapArea} onPress={tap}>
            <Text style={[styles.signal, { color: signalColor, fontFamily: FONT_RYE }]}>
              {roundBanner ?? (signalText || t('game.waitForBang'))}
            </Text>
            {phase === '결과' && outcome ? (
              <Text style={styles.msLine}>
                {outcome.playerMs != null ? formatReactionMs(outcome.playerMs) : '—'}
                {' ms  vs  '}
                {outcome.opponentMs != null
                  ? formatReactionMs(outcome.opponentMs)
                  : '—'}
                {' ms'}
              </Text>
            ) : (
              <Text style={styles.hint}>{t('game.tapAnywhere')}</Text>
            )}
            {submitting ? (
              <ActivityIndicator color={colors.gold} style={{ marginTop: 16 }} />
            ) : null}
          </Pressable>
        </View>

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
  root: {
    flex: 1,
    backgroundColor: '#1a1208',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  pause: { color: colors.sand, fontSize: 22 },
  score: {
    color: colors.gold,
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  roundLabel: { color: colors.sand, fontSize: 14, fontWeight: '700' },
  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  vsName: {
    flex: 1,
    color: colors.cream,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  vsVs: { color: colors.gold, fontSize: 16, letterSpacing: 2 },
  tapArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  signal: {
    fontSize: 48,
    letterSpacing: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  hint: {
    marginTop: 20,
    color: 'rgba(245,230,200,0.55)',
    fontSize: 13,
    letterSpacing: 2,
  },
  msLine: {
    marginTop: 16,
    color: colors.sand,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
