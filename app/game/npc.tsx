import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  NpcCharacterSprite,
  PlayerCharacterSprite,
} from '@/components/game/CharacterSprites';
import {
  DuelSignalBoard,
  enginePhaseToSignalBoardPhase,
} from '@/components/game/DuelSignalBoard';
import {
  AbilityOverlay,
  type AbilityOverlayType,
} from '@/components/game/AbilityOverlay';
import {
  NpcRoundModal,
  type NpcRoundModalData,
} from '@/components/game/NpcRoundModal';
import { PauseMenuModal } from '@/components/game/PauseMenuModal';
import { SceneBackground } from '@/components/game/SceneBackground';
import { PhoneStageShell } from '@/components/layout/PhoneStageShell';
import {
  gameImages,
  getBackgroundImage,
  pickBattleDayNight,
} from '@/constants/gameImages';
import { RM_GAME } from '@/constants/reanimatedGame';
import { colors } from '@/constants/theme';
import { FONT_RYE } from '@/constants/fonts';
import { getNpcById } from '@/constants/npcs';
import { buildDuelStartParams } from '@/utils/npcDuelParams';
import { useDuelEngine, type DuelOutcome, type DuelPhase } from '@/hooks/useDuelEngine';
import {
  phoneStageSafeOffsets,
  usePhoneStageMetrics,
} from '@/hooks/usePhoneStageMetrics';
import { useGameStore } from '@/store/gameStore';
import { selectPaleRiderUnlocked, useProgressStore } from '@/store/progressStore';
import { useSettingsStore } from '@/store/settingsStore';
import { applyAbility } from '@/utils/characterAbility';
import { simulateNpcReaction } from '@/utils/npcAI';
import { preloadSceneImages } from '@/utils/preloadSceneImages';
import { play, playBangShotDuel } from '@/utils/audioService';
import { speakDuelCue, stopDuelSignalSpeech } from '@/utils/duelSignalSpeech';
import { trigger } from '@/utils/hapticService';

const WINS_TO_END = 3;
const HEARTS = 3;
/** GDD v1.2 — 상단 / 신호판 / 하단 비율 */
const PANEL_TOP = 0.3;
const PANEL_MID = 0.25;
const PANEL_BOTTOM = 0.45;

const TIER_KO: Record<string, string> = {
  bronze: '브론즈',
  silver: '실버',
  gold: '골드',
  platinum: '플래티넘',
  diamond: '다이아',
  master: '마스터',
  legend: '레전드',
  hidden: '???',
};

const HEART_FULL = '#E11D48';
const HEART_EMPTY = 'rgba(245, 230, 200, 0.55)';

function buildLastStandWinData(
  loss: Extract<NpcRoundModalData, { kind: 'loss' }>,
  o: DuelOutcome,
  npcSim: { reactionMs: number | null },
): Extract<NpcRoundModalData, { kind: 'win' }> {
  if (loss.reason === 'slower' && loss.playerMs != null && loss.npcMs != null) {
    return {
      kind: 'win',
      playerMs: loss.playerMs,
      npcMs: loss.npcMs,
      lastStand: true,
    };
  }
  const pm = o.reactionMs ?? 0;
  const nm = npcSim.reactionMs;
  return {
    kind: 'win',
    playerMs: pm,
    npcMs: nm,
    npcMisfire: loss.reason !== 'slower',
    lastStand: true,
  };
}

function UnicodeHeartRow({ filled, max }: { filled: number; max: number }) {
  return (
    <View style={styles.heartRow}>
      {Array.from({ length: max }).map((_, i) => (
        <Text
          key={i}
          style={[styles.heartGlyph, i < filled ? styles.heartFull : styles.heartEmpty]}
        >
          {i < filled ? '♥' : '♡'}
        </Text>
      ))}
    </View>
  );
}

export default function NpcGameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const stage = usePhoneStageMetrics();
  const { stageWidth: winW, stageHeight: winH } = stage;
  const overlayPad = useMemo(
    () =>
      phoneStageSafeOffsets(stage, {
        top: insets.top,
        right: insets.right,
        bottom: insets.bottom,
        left: insets.left,
      }),
    [stage, insets.top, insets.right, insets.bottom, insets.left],
  );
  const { npcId: npcIdRaw } = useLocalSearchParams<{ npcId?: string | string[] }>();
  const npcIdStr = useMemo(() => {
    const v = npcIdRaw;
    if (v == null) return undefined;
    const s = Array.isArray(v) ? v[0] : v;
    return s === '' ? undefined : s;
  }, [npcIdRaw]);
  const npcId = useMemo(() => {
    if (npcIdStr == null) return NaN;
    const n = Number(npcIdStr);
    return Number.isFinite(n) ? n : NaN;
  }, [npcIdStr]);
  const npc = useMemo(
    () => (Number.isFinite(npcId) ? getNpcById(npcId) : undefined),
    [npcId],
  );
  const highestUnlocked = useProgressStore((s) => s.highestUnlockedNpcId);

  const currentRound = useGameStore((s) => s.currentRound);
  const playerScore = useGameStore((s) => s.playerScore);
  const opponentScore = useGameStore((s) => s.opponentScore);
  const playerHearts = useGameStore((s) => s.playerHearts);
  const opponentHearts = useGameStore((s) => s.opponentHearts);
  const startMatch = useGameStore((s) => s.startMatch);
  const setScores = useGameStore((s) => s.setScores);
  const setHearts = useGameStore((s) => s.setHearts);
  const setAbilityUsed = useGameStore((s) => s.setAbilityUsed);
  const nextRound = useGameStore((s) => s.nextRound);

  const {
    phase,
    outcome,
    lastSteadyToBangDelayMs,
    start: startDuelEngine,
    tap,
    isBangReactionArmed,
    reset: resetDuel,
    pauseTimers,
    resumeTimers,
  } = useDuelEngine();

  const startRoundDuel = useCallback(() => {
    if (!npc) return;
    if (npc.id === 21) {
      const r = Math.random();
      if (r < 0.25) chaosModeRef.current = 'inverted';
      else if (r < 0.5) chaosModeRef.current = 'blindBang';
      else if (r < 0.75) chaosModeRef.current = 'combo';
      else chaosModeRef.current = 'none';
      setChaosRenderTick((n) => n + 1);
    } else {
      chaosModeRef.current = 'none';
    }
    const { timing, fakeBangCount } = buildDuelStartParams(npc);
    startDuelEngine(timing, { fakeBangCount });
  }, [npc, startDuelEngine]);

  const [modal, setModal] = useState<NpcRoundModalData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const modalDataRef = useRef<NpcRoundModalData | null>(null);
  const [abilityOverlay, setAbilityOverlay] = useState<AbilityOverlayType>(null);
  const [headshotOffered, setHeadshotOffered] = useState(false);
  const [earlyOverlay, setEarlyOverlay] = useState(false);
  const [animatePlayerLoss, setAnimatePlayerLoss] = useState(false);
  const [animateNpcLoss, setAnimateNpcLoss] = useState(false);
  const [paused, setPaused] = useState(false);
  /** #21 chaos 조합 적용 후 신호판 반영용 */
  const [, setChaosRenderTick] = useState(0);
  const [npcRoundWinBurstId, setNpcRoundWinBurstId] = useState(0);
  const wasPausedRef = useRef(false);

  const topH = Math.round(winH * PANEL_TOP);
  const midH = Math.round(winH * PANEL_MID);
  const bottomH = Math.max(0, winH - topH - midH);

  const blueRing = useSharedValue(0);
  const playerTapAck = useSharedValue(0);

  const playerStreakRef = useRef(0);
  const prevBangDelayRef = useRef<number | null>(null);
  const processedOutcomeKey = useRef<string>('');
  const bangHapticDoneRef = useRef(false);
  const prevPhaseRef = useRef<DuelPhase>(phase);
  /** #13 미러 잭 — 직전 라운드 플레이어 유효 반응(ms) */
  const prevPlayerBangMsRef = useRef<number | null>(null);
  /** #21 Undertaker — 라운드마다 랜덤 교란(반전 / 블라인드 / 복합 / 없음) */
  const chaosModeRef = useRef<'none' | 'inverted' | 'blindBang' | 'combo'>('none');
  const deferredModalRef = useRef<{
    data: NpcRoundModalData;
    headshotOffered: boolean;
  } | null>(null);
  const headshotApplyPendingRef = useRef(false);

  const blueStyle = useAnimatedStyle(() => ({
    opacity: blueRing.value,
  }));

  const playerTapAckStyle = useAnimatedStyle(() => ({
    opacity: playerTapAck.value,
  }));

  const pulsePlayerTapAck = useCallback(
    (kind: 'bang' | 'other') => {
      cancelAnimation(playerTapAck);
      playerTapAck.value = 0;
      const peak = kind === 'bang' ? 1 : 0.62;
      const upMs = kind === 'bang' ? 55 : 42;
      const downMs = kind === 'bang' ? 300 : 200;
      playerTapAck.value = withSequence(
        withTiming(peak, {
          duration: upMs,
          easing: Easing.out(Easing.quad),
          reduceMotion: RM_GAME,
        }),
        withTiming(0, {
          duration: downMs,
          easing: Easing.in(Easing.quad),
          reduceMotion: RM_GAME,
        }),
      );
    },
    [playerTapAck],
  );

  useEffect(() => {
    modalDataRef.current = modal;
  }, [modal]);

  const npcFall = useSharedValue(0);
  useEffect(() => {
    if (animateNpcLoss) {
      npcFall.value = 0;
      npcFall.value = withTiming(1, {
        duration: 520,
        easing: Easing.out(Easing.cubic),
        reduceMotion: RM_GAME,
      });
    } else {
      cancelAnimation(npcFall);
      npcFall.value = 0;
    }
  }, [animateNpcLoss, npcFall]);

  const npcFallStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: npcFall.value * 72 },
      { rotate: `${npcFall.value * 88}deg` },
    ],
    opacity: 1 - npcFall.value * 0.22,
  }));

  useEffect(() => {
    if (phase !== '뱅') {
      bangHapticDoneRef.current = false;
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== '뱅') return;
    if (bangHapticDoneRef.current) return;
    bangHapticDoneRef.current = true;
    if (npc?.id === 22) {
      return;
    }
    speakDuelCue('bang');
    void playBangShotDuel();
    void trigger('heavy');
  }, [phase, npc?.id]);

  useEffect(() => {
    const prev = prevPhaseRef.current;
    if (npc?.id === 22) {
      prevPhaseRef.current = phase;
      return;
    }
    if (phase === '준비' && prev !== '준비') {
      speakDuelCue('ready');
      void trigger('light');
      if (npc?.id === 20) {
        setTimeout(() => {
          speakDuelCue('ready');
        }, 420);
      }
    }
    if (phase === '집중' && prev !== '집중') {
      speakDuelCue('steady');
      void trigger('light');
    }
    prevPhaseRef.current = phase;
  }, [phase, npc?.id]);

  useEffect(() => {
    if (paused) {
      stopDuelSignalSpeech();
      pauseTimers();
      wasPausedRef.current = true;
    } else if (wasPausedRef.current) {
      resumeTimers();
      wasPausedRef.current = false;
    }
  }, [paused, pauseTimers, resumeTimers]);

  useFocusEffect(
    useCallback(() => {
      if (npcIdStr == null) {
        return () => {
          resetDuel();
        };
      }
      const canAccess =
        npc &&
        Number.isFinite(npcId) &&
        npcId >= 1 &&
        (npcId === 22 ? selectPaleRiderUnlocked() : npcId <= highestUnlocked);
      if (!canAccess) {
        router.replace('/npc-select');
        return undefined;
      }
      let cancelled = false;
      void (async () => {
        await preloadSceneImages();
        if (cancelled) return;
        if (npc?.id !== 21) {
          chaosModeRef.current = 'none';
        }
        startMatch({ mode: 'npc', playerHearts: HEARTS, opponentHearts: HEARTS });
        playerStreakRef.current = 0;
        prevBangDelayRef.current = null;
        prevPlayerBangMsRef.current = null;
        processedOutcomeKey.current = '';
        resetDuel();
        startRoundDuel();
      })();
      return () => {
        cancelled = true;
        resetDuel();
      };
    }, [
      npcIdStr,
      npc,
      npcId,
      highestUnlocked,
      router,
      startMatch,
      resetDuel,
      startRoundDuel,
    ]),
  );

  useEffect(() => {
    if (!animatePlayerLoss && !animateNpcLoss) return;
    const t = setTimeout(() => {
      setAnimatePlayerLoss(false);
      setAnimateNpcLoss(false);
    }, 520);
    return () => clearTimeout(t);
  }, [animatePlayerLoss, animateNpcLoss]);

  useEffect(() => {
    if (phase !== '결과' || !outcome || !npc) return;

    const key = `${currentRound}:${outcome.earlyTap}:${outcome.timeout}:${outcome.reactionMs}`;
    if (processedOutcomeKey.current === key) return;
    processedOutcomeKey.current = key;

    const o = outcome;
    const streakBefore = playerStreakRef.current;
    const npcSim = simulateNpcReaction({
      npc,
      previousSteadyToBangDelayMs: prevBangDelayRef.current,
      mirrorPlayerMs: npc.id === 13 ? prevPlayerBangMsRef.current : null,
    });

    let data: NpcRoundModalData;

    if (o.earlyTap) {
      setEarlyOverlay(true);
      blueRing.value = withSequence(
        RM_GAME,
        withTiming(1, { duration: 60, reduceMotion: RM_GAME }),
        withTiming(0, { duration: 720, reduceMotion: RM_GAME }),
      );
      setTimeout(() => setEarlyOverlay(false), 800);
      data = {
        kind: 'loss',
        reason: 'early',
        playerMs: null,
        npcMs: npcSim.reactionMs,
      };
    } else if (o.timeout) {
      data = {
        kind: 'loss',
        reason: 'timeout',
        playerMs: null,
        npcMs: npcSim.reactionMs,
      };
    } else if (o.reactionMs != null) {
      if (npcSim.npcEarlyTap) {
        data = {
          kind: 'win',
          playerMs: o.reactionMs,
          npcMs: null,
          npcMisfire: true,
        };
      } else if (npcSim.reactionMs != null) {
        if (o.reactionMs < npcSim.reactionMs) {
          data = {
            kind: 'win',
            playerMs: o.reactionMs,
            npcMs: npcSim.reactionMs,
          };
        } else {
          data = {
            kind: 'loss',
            reason: 'slower',
            playerMs: o.reactionMs,
            npcMs: npcSim.reactionMs,
          };
        }
      } else {
        data = {
          kind: 'win',
          playerMs: o.reactionMs,
          npcMs: null,
          npcMisfire: true,
        };
      }
    } else {
      data = {
        kind: 'loss',
        reason: 'timeout',
        playerMs: null,
        npcMs: npcSim.reactionMs,
      };
    }

    const ps = useGameStore.getState().playerScore;
    const ns = useGameStore.getState().opponentScore;
    const ph = useGameStore.getState().playerHearts;
    const oh = useGameStore.getState().opponentHearts;
    const abilityUsed = useGameStore.getState().abilityUsed;
    const characterId = useSettingsStore.getState().selectedCharacterId;

    let modalData: NpcRoundModalData = data;
    let lastStandFlip = false;

    if (data.kind === 'loss' && characterId === 2 && !abilityUsed) {
      const phAfter = ph > 0 ? ph - 1 : ph;
      const ls = applyAbility(2, {
        outcome: o,
        provisionalWinner: 'opponent',
        abilityUsedThisMatch: abilityUsed,
        playerHeartsBefore: ph,
        playerHeartsAfter: phAfter,
        opponentHeartsAfter: oh,
      });
      if (ls.lastStandFlipToPlayerWin) {
        lastStandFlip = true;
        modalData = buildLastStandWinData(data, o, npcSim);
      }
    }

    let reviveFlip = false;
    if (data.kind === 'loss' && !lastStandFlip && characterId === 4 && !abilityUsed) {
      const phAfterLoss = ph > 0 ? ph - 1 : ph;
      const rv = applyAbility(4, {
        outcome: o,
        provisionalWinner: 'opponent',
        abilityUsedThisMatch: abilityUsed,
        playerHeartsBefore: ph,
        playerHeartsAfter: phAfterLoss,
        opponentHeartsAfter: oh,
      });
      if (rv.revivePlayerToOneHeart) {
        reviveFlip = true;
      }
    }

    const effectiveWin = modalData.kind === 'win';

    setAnimatePlayerLoss(false);
    setAnimateNpcLoss(false);

    if (effectiveWin) {
      setScores(ps + 1, ns);
      if (oh > 0) {
        setAnimateNpcLoss(true);
        setHearts(ph, oh - 1);
      }
      playerStreakRef.current = streakBefore + 1;
      if (lastStandFlip) {
        setAbilityUsed(true);
      }
    } else if (reviveFlip) {
      setScores(ps, ns + 1);
      setHearts(1, oh);
      playerStreakRef.current = 0;
      setAbilityUsed(true);
    } else {
      setScores(ps, ns + 1);
      if (ph > 0) {
        setAnimatePlayerLoss(true);
        setHearts(ph - 1, oh);
      }
      playerStreakRef.current = 0;
    }

    const ohAfterWin = effectiveWin && oh > 0 ? oh - 1 : oh;
    const phAfterWin = ph;

    let offerHeadshot = false;
    if (effectiveWin && characterId === 3 && !abilityUsed && !lastStandFlip) {
      const hs = applyAbility(3, {
        outcome: o,
        provisionalWinner: 'player',
        abilityUsedThisMatch: abilityUsed,
        playerHeartsBefore: ph,
        playerHeartsAfter: phAfterWin,
        opponentHeartsAfter: ohAfterWin,
      });
      offerHeadshot = hs.headshotRemoveTwoOpponentHearts === true;
    }

    if (lastSteadyToBangDelayMs != null) {
      prevBangDelayRef.current = lastSteadyToBangDelayMs;
    }

    if (o.reactionMs != null) {
      prevPlayerBangMsRef.current = o.reactionMs;
      const ms = o.reactionMs;
      const { recordGlobalReactionSample, recordNpcBestReaction } =
        useProgressStore.getState();
      recordGlobalReactionSample(ms);
      recordNpcBestReaction(npc.id, ms);
    }

    if (o.earlyTap) {
      void play('early_tap');
      void trigger('error');
    } else if (effectiveWin) {
      void play('win_fanfare');
      void trigger('success');
    } else {
      void play('lose_sad');
    }

    const playerLostHeart =
      !effectiveWin && !reviveFlip && data.kind === 'loss' && ph > 0;
    const npcLostHeart = effectiveWin && oh > 0;
    if (playerLostHeart || npcLostHeart) {
      void play('heart_break');
      void trigger('medium');
    }

    if (effectiveWin) {
      setNpcRoundWinBurstId((n) => n + 1);
    }

    if (lastStandFlip) {
      deferredModalRef.current = { data: modalData, headshotOffered: false };
      setHeadshotOffered(false);
      setModalVisible(false);
      setModal(null);
      setAbilityOverlay('last_stand');
      return;
    }

    if (reviveFlip && data.kind === 'loss') {
      const reviveModalData: NpcRoundModalData = { ...data, revive: true };
      deferredModalRef.current = { data: reviveModalData, headshotOffered: false };
      setHeadshotOffered(false);
      setModalVisible(false);
      setModal(null);
      setAbilityOverlay('revive');
      return;
    }

    setModal(modalData);
    setModalVisible(true);
    setHeadshotOffered(offerHeadshot);
  }, [
    phase,
    outcome,
    npc,
    currentRound,
    lastSteadyToBangDelayMs,
    blueRing,
    setScores,
    setHearts,
    setAbilityUsed,
  ]);

  const handleAbilityOverlayComplete = useCallback(() => {
    setAbilityOverlay(null);
    if (headshotApplyPendingRef.current) {
      headshotApplyPendingRef.current = false;
      const { playerHearts, opponentHearts } = useGameStore.getState();
      setHearts(playerHearts, Math.max(0, opponentHearts - 1));
      setAbilityUsed(true);
      setHeadshotOffered(false);
      return;
    }
    const p = deferredModalRef.current;
    deferredModalRef.current = null;
    if (p) {
      setModal(p.data);
      setModalVisible(true);
    }
  }, [setHearts, setAbilityUsed]);

  const onHeadshotPress = useCallback(() => {
    headshotApplyPendingRef.current = true;
    setAbilityOverlay('headshot');
  }, []);

  const onContinue = useCallback(() => {
    if (headshotOffered) {
      setAbilityUsed(true);
    }
    setHeadshotOffered(false);
    setModalVisible(false);
    setModal(null);

    const ps = useGameStore.getState().playerScore;
    const ns = useGameStore.getState().opponentScore;

    if (ps >= WINS_TO_END || ns >= WINS_TO_END) {
      if (ps >= WINS_TO_END) {
        useProgressStore.getState().markNpcCleared(npc!.id);
      }
      const m = modalDataRef.current;
      const lr = useGameStore.getState().lastReaction;
      let playerMsStr = lr.playerMs != null ? String(lr.playerMs) : '';
      let npcMsStr = lr.npcMs != null ? String(lr.npcMs) : '';
      let lossReason = '';
      if (m?.kind === 'win') {
        playerMsStr = String(m.playerMs);
        npcMsStr = m.npcMs != null ? String(m.npcMs) : '';
      } else if (m?.kind === 'loss') {
        lossReason = m.reason;
        if (m.playerMs != null) playerMsStr = String(m.playerMs);
        if (m.npcMs != null) npcMsStr = String(m.npcMs);
      }
      router.replace({
        pathname: '/result/npc',
        params: {
          npcId: String(npc!.id),
          won: ps >= WINS_TO_END ? '1' : '0',
          playerWins: String(ps),
          npcWins: String(ns),
          completionStamp: String(Date.now()),
          playerMs: playerMsStr,
          npcMs: npcMsStr,
          lossReason,
        },
      });
      return;
    }

    processedOutcomeKey.current = '';
    nextRound();
    resetDuel();
    startRoundDuel();
  }, [npc, nextRound, resetDuel, router, startRoundDuel, headshotOffered, setAbilityUsed]);

  /** 뱅 이전에도 탭을 엔진으로 넘겨 얼리 즉시 패배(누르고 있다가 뱅 때 손 떼면 이기는 버그 방지) */
  const shootCapturesEarly =
    phase !== '대기' &&
    phase !== '결과' &&
    !modalVisible &&
    !paused &&
    abilityOverlay == null;

  const shootActive = shootCapturesEarly && isBangReactionArmed();

  const onShootPress = useCallback(() => {
    if (!shootCapturesEarly) return;
    const armed = isBangReactionArmed();
    if (armed) {
      pulsePlayerTapAck('bang');
      void trigger('heavy');
    } else {
      pulsePlayerTapAck('other');
      void trigger('light');
    }
    tap();
  }, [shootCapturesEarly, isBangReactionArmed, pulsePlayerTapAck, tap]);

  const leaveToNpcSelect = useCallback(() => {
    setPaused(false);
    resetDuel();
    router.back();
  }, [resetDuel, router]);

  const leaveToMainMenu = useCallback(() => {
    setPaused(false);
    resetDuel();
    router.replace('/menu');
  }, [resetDuel, router]);

  const tierLabel = npc ? (TIER_KO[npc.tier] ?? npc.tier) : '';

  const battleDayNight = useMemo(
    () => (npc ? pickBattleDayNight(npc.id) : 'day'),
    [npc?.id],
  );

  const duelBg = useMemo(() => {
    if (!npc) {
      return { kind: 'image' as const, source: gameImages.duelBackground };
    }
    return getBackgroundImage(npc.tier, npc.id, battleDayNight);
  }, [npc, battleDayNight]);

  const blindBangText =
    !!npc &&
    phase === '뱅' &&
    (npc.specialAbility === 'blindBang' ||
      npc.id === 18 ||
      (npc.id === 21 &&
        (chaosModeRef.current === 'blindBang' || chaosModeRef.current === 'combo')));

  const invertSignalColors =
    !!npc &&
    (npc.specialAbility === 'invertedSignals' ||
      (npc.id === 21 &&
        (chaosModeRef.current === 'inverted' || chaosModeRef.current === 'combo')));

  return (
    <PhoneStageShell>
      <SceneBackground
        source={duelBg.kind === 'image' ? duelBg.source : undefined}
        solidColor={duelBg.kind === 'solid' ? duelBg.color : undefined}
        style={{ width: winW, height: winH }}
        contentWidth={winW}
        contentHeight={winH}
      >
        <Animated.View pointerEvents="none" style={[styles.blueRing, blueStyle]} />

        {npc?.id === 22 && (phase === '집중' || phase === '페이크') ? (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, styles.paleDim]}
          />
        ) : null}

        {earlyOverlay ? (
          <View pointerEvents="none" style={styles.earlyLabelWrap}>
            <Text style={styles.earlyLabel}>EARLY!</Text>
          </View>
        ) : null}

        {npc ? (
          <>
            <View style={[styles.columnRoot, { width: winW, height: winH }]}>
              {/* 상단 30% — NPC 패널 */}
              <View
                style={[
                  styles.panelTop,
                  {
                    height: topH,
                    paddingTop: overlayPad.top + 6,
                    paddingHorizontal: 14,
                  },
                ]}
              >
                <View style={styles.npcHeaderRow}>
                  <View style={styles.npcTitleBlock}>
                    <Text
                      style={[styles.npcName, { fontFamily: FONT_RYE }]}
                      numberOfLines={1}
                    >
                      {npc.title} {npc.name}
                    </Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{tierLabel}</Text>
                    </View>
                    {npc.bossFlag ? (
                      <Ionicons name="skull" size={22} color={colors.cream} style={styles.bossSkull} />
                    ) : null}
                  </View>
                </View>
                <UnicodeHeartRow filled={opponentHearts} max={HEARTS} />
                <View style={styles.npcFigSlot}>
                  <Animated.View style={npcFallStyle}>
                    <NpcCharacterSprite
                      npcId={npc.id}
                      width={Math.min(200, Math.floor(winW * 0.5))}
                      height={Math.min(118, Math.floor(topH * 0.42))}
                      flipHorizontal
                      style={styles.duelFigMatte}
                    />
                  </Animated.View>
                </View>
              </View>

              {/* 중앙 25% — 신호판 */}
              <View style={[styles.panelMid, { height: midH, paddingHorizontal: 12 }]}>
                <DuelSignalBoard
                  phase={enginePhaseToSignalBoardPhase(phase)}
                  blindBangText={blindBangText}
                  invertSignalColors={invertSignalColors}
                />
              </View>

              {/* 하단 45% — 플레이어 + SHOOT */}
              <View
                style={[
                  styles.panelBottom,
                  {
                    height: bottomH,
                    paddingBottom: insets.bottom + 10,
                    paddingHorizontal: 14,
                  },
                ]}
              >
                <Animated.View
                  pointerEvents="none"
                  style={[styles.playerTapAckGlow, playerTapAckStyle]}
                />
                <View style={styles.playerFigSlot}>
                  <PlayerCharacterSprite
                    width={Math.min(200, Math.floor(winW * 0.52))}
                    height={Math.min(124, Math.floor(bottomH * 0.38))}
                    style={styles.duelFigMatte}
                  />
                </View>
                <UnicodeHeartRow filled={playerHearts} max={HEARTS} />
                <Text style={styles.scoreHint}>
                  {playerScore} — {opponentScore} (선 {WINS_TO_END}승)
                </Text>
                <Pressable
                  accessibilityLabel="SHOOT"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !shootCapturesEarly }}
                  accessibilityHint={
                    shootActive
                      ? '뱅 신호 직후 반응으로 탭합니다'
                      : '준비·집중 중 탭 시 즉시 패배합니다. 뱅 이후에만 유효합니다'
                  }
                  disabled={!shootCapturesEarly}
                  onPress={onShootPress}
                  style={[
                    styles.shootBtn,
                    !shootActive && styles.shootBtnDim,
                  ]}
                >
                  <Text style={styles.shootBtnText}>SHOOT</Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              accessibilityLabel="일시정지"
              disabled={phase === '페이크'}
              onPress={() => setPaused(true)}
              style={[styles.pauseBtn, { top: overlayPad.top, right: overlayPad.right }]}
              hitSlop={12}
            >
              <Ionicons name="pause-circle" size={40} color={colors.cream} />
            </Pressable>

            <NpcRoundModal
              visible={modalVisible}
              data={modal}
              onContinue={onContinue}
              winBurstId={npcRoundWinBurstId}
              headshotOffered={headshotOffered}
              onHeadshotPress={onHeadshotPress}
            />

            <AbilityOverlay
              abilityType={abilityOverlay}
              onComplete={handleAbilityOverlayComplete}
            />

            <PauseMenuModal
              visible={paused}
              onResume={() => setPaused(false)}
              onSecondaryExit={leaveToNpcSelect}
              secondaryLabel="NPC 선택으로"
              onMainMenu={leaveToMainMenu}
            />
          </>
        ) : null}
      </SceneBackground>
    </PhoneStageShell>
  );
}

const styles = StyleSheet.create({
  columnRoot: {
    flexDirection: 'column',
    zIndex: 5,
  },
  panelTop: {
    justifyContent: 'flex-start',
    gap: 6,
  },
  panelMid: {
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  panelBottom: {
    justifyContent: 'flex-end',
    gap: 10,
    position: 'relative',
  },
  npcHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  npcTitleBlock: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  npcName: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 100,
    fontSize: 20,
    color: colors.ochre,
  },
  bossSkull: {
    marginLeft: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#3D2414',
    borderWidth: 1,
    borderColor: colors.sand,
  },
  badgeText: {
    color: colors.cream,
    fontWeight: '700',
    fontSize: 12,
  },
  heartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  heartGlyph: {
    fontSize: 30,
    lineHeight: 34,
  },
  heartFull: {
    color: HEART_FULL,
  },
  heartEmpty: {
    color: HEART_EMPTY,
  },
  npcFigSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 0,
  },
  playerFigSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 0,
  },
  duelFigMatte: {
    borderRadius: 12,
    backgroundColor: 'rgba(20, 12, 8, 0.45)',
    borderWidth: 2,
    borderColor: colors.sand,
  },
  scoreHint: {
    textAlign: 'center',
    color: colors.cream,
    opacity: 0.88,
    fontSize: 13,
    fontWeight: '600',
  },
  shootBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#8B1A1A',
    borderWidth: 3,
    borderColor: colors.ochre,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shootBtnDim: {
    opacity: 0.4,
  },
  shootBtnText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 6,
    color: colors.cream,
  },
  playerTapAckGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: 'rgba(255, 236, 200, 0.82)',
    zIndex: 2,
  },
  pauseBtn: {
    position: 'absolute',
    zIndex: 200,
    padding: 4,
    borderRadius: 22,
    backgroundColor: 'rgba(20, 12, 8, 0.55)',
  },
  paleDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    zIndex: 4,
  },
  blueRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 10,
    borderColor: '#4A90D9',
    zIndex: 25,
  },
  earlyLabelWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  earlyLabel: {
    fontSize: 42,
    fontWeight: '900',
    color: '#B8DCFF',
    letterSpacing: 4,
    textShadowColor: '#1A3A6E',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
});
