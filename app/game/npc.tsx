import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  enginePhaseToSignalBoardPhase,
  type DuelSignalBoardPhase,
} from '@/components/game/DuelSignalBoard';
import {
  AbilityOverlay,
  type AbilityOverlayType,
} from '@/components/game/AbilityOverlay';
import { DuelArenaLayout } from '@/components/game/DuelArenaLayout';
import {
  NpcRoundModal,
  type NpcRoundModalData,
} from '@/components/game/NpcRoundModal';
import { PauseMenuModal } from '@/components/game/PauseMenuModal';
import { DuelFullBackground } from '@/components/game/DuelFullBackground';
import { SceneBackground } from '@/components/game/SceneBackground';
import { PhoneStageShell } from '@/components/layout/PhoneStageShell';
import {
  getBackgroundImage,
  pickBattleDayNight,
} from '@/constants/gameImages';
import { DUEL_VISUAL_THEME, MINIMAL_DUEL } from '@/constants/duelTheme';
import { RM_GAME } from '@/constants/reanimatedGame';
import { DEV_UNLOCK_ALL_NPCS } from '@/constants/devFlags';
import { getNpcById } from '@/constants/npcs';
import {
  DUEL_DEFEAT_MODAL_DELAY_MS,
  DUEL_DEFEAT_REVEAL_DELAY_MS,
  DUEL_EARLY_MODAL_DELAY_MS,
} from '@/constants/duelPresentation';
import { buildDuelStartParams } from '@/utils/npcDuelParams';
import { useDuelBgmDuck } from '@/hooks/useDuelBgmDuck';
import { useDuelEngine, type DuelOutcome, type DuelPhase } from '@/hooks/useDuelEngine';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import {
  usePhoneStageMetrics,
} from '@/hooks/usePhoneStageMetrics';
import { useDailyMissionStore, whenDailyMissionsReady } from '@/store/dailyMissionStore';
import { useGameStore } from '@/store/gameStore';
import { selectPaleRiderUnlocked, useProgressStore } from '@/store/progressStore';
import { useSettingsStore } from '@/store/settingsStore';
import { applyAbility } from '@/utils/characterAbility';
import { simulateNpcReaction, type NpcReactionSimulation } from '@/utils/npcAI';
import {
  npcSpritePoseFromPhase,
  playerSpritePoseFromPhase,
} from '@/utils/spritePose';
import { preloadSceneImages } from '@/utils/preloadSceneImages';
import { prefetchDuelSprites } from '@/utils/preloadDuelSprites';
import { AdReviveModal } from '@/components/game/AdReviveModal';
import { preloadInterstitial, preloadRewardedAd, showRewardedAd } from '@/utils/adService';
import { play, playGunshot } from '@/utils/audioService';
import { speakDuelCue, stopDuelSignalSpeech, warmupDuelSpeech } from '@/utils/duelSignalSpeech';
import { trigger } from '@/utils/hapticService';

const WINS_TO_END = 3;
const HEARTS = 3;

function firstSearchParam(v?: string | string[]): string | undefined {
  if (v == null) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  return s === '' ? undefined : s;
}

/** 데일리로 캠페인보다 앞선 보스를 깨도 해금이 건너뛰지 않게. */
function recordNpcWinIfAllowed(npcId: number, fromDaily: boolean) {
  if (fromDaily) {
    const unlocked = useProgressStore.getState().highestUnlockedNpcId;
    if (npcId > unlocked) return;
  }
  useProgressStore.getState().markNpcCleared(npcId);
}

// 네이티브 모듈 미포함 구버전 빌드에서도 동작하도록 lazy 로드
let ScreenOrientation: typeof import('expo-screen-orientation') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ScreenOrientation = require('expo-screen-orientation');
} catch {
  ScreenOrientation = null;
}

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

export default function NpcGameScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const stage = usePhoneStageMetrics();
  const winW = stage.windowWidth;
  const winH = stage.windowHeight;
  const isLandscape = winW > winH;
  const selectedCharacterId = useSettingsStore((s) => s.selectedCharacterId);

  // 전 화면 회전 허용 — 결투 화면도 잠금 없이 유지
  useFocusEffect(
    useCallback(() => {
      const so = ScreenOrientation;
      if (!so) return;
      void so.unlockAsync().catch(() => {});
    }, []),
  );
  const overlayPad = useMemo(
    () => ({
      top: insets.top + 6,
      right: 12 + insets.right,
      left: 12 + insets.left,
    }),
    [insets.top, insets.right, insets.left],
  );
  const { npcId: npcIdRaw, fromDaily: fromDailyRaw } = useLocalSearchParams<{
    npcId?: string | string[];
    fromDaily?: string | string[];
  }>();
  const npcIdStr = useMemo(() => firstSearchParam(npcIdRaw), [npcIdRaw]);
  const fromDaily = firstSearchParam(fromDailyRaw) === '1';
  const npcId = useMemo(() => {
    if (npcIdStr == null) return NaN;
    const n = Number(npcIdStr);
    return Number.isFinite(n) ? n : NaN;
  }, [npcIdStr]);
  const npc = useMemo(
    () => (Number.isFinite(npcId) ? getNpcById(npcId) : undefined),
    [npcId],
  );
  const battleDayNight = useMemo(
    () => (npc ? pickBattleDayNight(npc.id) : 'day'),
    [npc?.id],
  );
  const duelBg = useMemo(() => {
    if (DUEL_VISUAL_THEME === 'minimal') {
      return { kind: 'solid' as const, color: MINIMAL_DUEL.bg };
    }
    if (!npc) {
      return { kind: 'full' as const, variant: 'day' as const };
    }
    return getBackgroundImage(npc.tier, npc.id, battleDayNight);
  }, [npc, battleDayNight]);
  const duelBgmTrack = npc?.bossFlag ? ('boss' as const) : ('duel' as const);
  useScreenBgm(npc ? duelBgmTrack : null, true);
  const highestUnlocked = useProgressStore((s) => s.highestUnlockedNpcId);
  const [dailyReady, setDailyReady] = useState(false);
  useEffect(() => {
    return whenDailyMissionsReady(() => setDailyReady(true));
  }, []);

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

  const fireGunshot = useCallback(() => {
    playGunshot();
  }, []);

  const bangHapticDoneRef = useRef(false);

  /**
   * 뱅 신호 채널(소리·햅틱). 엔진의 `onBangEnter`로 넘겨 **반응 측정이 시작되는 것과
   * 같은 시점**에 낸다.
   *
   * 예전에는 `phase === '뱅'`을 보는 `useEffect`에서 냈는데, 그건 페인트가 끝난 뒤라
   * 소리가 한 프레임 늦게 출발했고 렌더가 무거우면 더 밀렸다. 그만큼 소리를 듣고
   * 반응하는 플레이어가 화면을 보고 반응하는 플레이어보다 불리했다.
   * (로컬 2인 대결은 처음부터 `onBangEnter`로 내고 있었다)
   */
  const triggerBangCue = useCallback(() => {
    if (bangHapticDoneRef.current) return;
    bangHapticDoneRef.current = true;
    speakDuelCue('bang');
    void trigger('heavy');
  }, []);

  const {
    phase,
    outcome,
    lastSteadyToBangDelayMs,
    start: startDuelEngine,
    tap,
    isBangReactionArmed,
    scheduleOpponentShot,
    clearOpponentShot,
    reset: resetDuel,
    pauseTimers,
    resumeTimers,
  } = useDuelEngine({
    onBangEnter: triggerBangCue,
    onPlayerShoot: fireGunshot,
    onOpponentShoot: fireGunshot,
  });

  useDuelBgmDuck(phase);

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
  // 광고 부활 — 접전 패배(2:3) 시 한 번만 제안. `useRef`는 매치 리셋 때 초기화.
  const [adRevivePending, setAdRevivePending] = useState<null | { ps: number; ns: number }>(null);
  const [adReviveLoading, setAdReviveLoading] = useState(false);
  const adReviveUsedRef = useRef(false);
  const isAdFree = useProgressStore((s) => s.isAdFree);
  const [abilityOverlay, setAbilityOverlay] = useState<AbilityOverlayType>(null);
  const [headshotOffered, setHeadshotOffered] = useState(false);
  const [earlyOverlay, setEarlyOverlay] = useState(false);
  const [defeatedSide, setDefeatedSide] = useState<'player' | 'npc' | null>(null);
  const [paused, setPaused] = useState(false);
  /** #21 chaos 조합 적용 후 신호판 반영용 */
  const [, setChaosRenderTick] = useState(0);
  const [npcRoundWinBurstId, setNpcRoundWinBurstId] = useState(0);
  const [playerShootFlash, setPlayerShootFlash] = useState(false);
  const wasPausedRef = useRef(false);

  const blueRing = useSharedValue(0);
  const playerTapAck = useSharedValue(0);

  const playerStreakRef = useRef(0);
  const prevBangDelayRef = useRef<number | null>(null);
  const processedOutcomeKey = useRef<string>('');
  const prevPhaseRef = useRef<DuelPhase>(phase);
  const spokenCuesRef = useRef({ ready: false, steady: false });
  const signalHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outcomeRevealTimersRef = useRef<{
    defeat: ReturnType<typeof setTimeout> | null;
    modal: ReturnType<typeof setTimeout> | null;
  }>({ defeat: null, modal: null });
  const [signalBoardPhase, setSignalBoardPhase] = useState<DuelSignalBoardPhase>('idle');
  /** #13 미러 잭 — 직전 라운드 플레이어 유효 반응(ms) */
  const prevPlayerBangMsRef = useRef<number | null>(null);
  /** #21 Undertaker — 라운드마다 랜덤 교란(반전 / 블라인드 / 복합 / 없음) */
  const chaosModeRef = useRef<'none' | 'inverted' | 'blindBang' | 'combo'>('none');
  const deferredModalRef = useRef<{
    data: NpcRoundModalData;
    headshotOffered: boolean;
  } | null>(null);
  const headshotApplyPendingRef = useRef(false);
  const npcRoundSimRef = useRef<NpcReactionSimulation | null>(null);

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
      const peak = kind === 'bang' ? 0.22 : 0.14;
      const upMs = kind === 'bang' ? 100 : 70;
      const downMs = kind === 'bang' ? 380 : 260;
      playerTapAck.value = withSequence(
        withTiming(peak, {
          duration: upMs,
          easing: Easing.out(Easing.quad),
          reduceMotion: RM_GAME,
        }),
        withTiming(0, {
          duration: downMs,
          easing: Easing.inOut(Easing.quad),
          reduceMotion: RM_GAME,
        }),
      );
    },
    [playerTapAck],
  );

  useEffect(() => {
    modalDataRef.current = modal;
  }, [modal]);

  useEffect(() => {
    if (phase !== '뱅') {
      bangHapticDoneRef.current = false;
    }
  }, [phase]);

  /**
   * 뱅 진입 시 NPC 반응을 시뮬레이션하고 발사를 예약한다.
   *
   * `useLayoutEffect`였을 때는 이 계산이 커밋 단계에서 동기로 돌아 "BANG" 페인트를
   * 붙잡았다. 게다가 NPC의 시계가 페인트 전에 출발해서, 화면을 보고 반응하는
   * 플레이어보다 한 프레임 유리했다. `useEffect`로 옮겨 두 시계의 출발점을 맞춘다.
   * (`npcRoundSimRef`는 렌더 중엔 읽히지 않고 결과 단계에서만 읽히며 폴백도 있다)
   */
  useEffect(() => {
    if (phase !== '뱅' || !npc) {
      clearOpponentShot();
      if (phase !== '뱅') {
        npcRoundSimRef.current = null;
      }
      return;
    }

    const sim = simulateNpcReaction({
      npc,
      previousSteadyToBangDelayMs: prevBangDelayRef.current,
      mirrorPlayerMs: npc.id === 13 ? prevPlayerBangMsRef.current : null,
    });
    npcRoundSimRef.current = sim;

    if (sim.reactionMs != null && !sim.npcEarlyTap) {
      scheduleOpponentShot(sim.reactionMs);
    } else {
      clearOpponentShot();
    }

    return clearOpponentShot;
  }, [phase, npc?.id, scheduleOpponentShot, clearOpponentShot]);

  useEffect(() => {
    const prev = prevPhaseRef.current;
    if (phase === '준비' && prev !== '준비') {
      spokenCuesRef.current = { ready: false, steady: false };
    }
    if (phase === '준비' && prev !== '준비' && !spokenCuesRef.current.ready) {
      spokenCuesRef.current.ready = true;
      speakDuelCue('ready');
      void trigger('light');
    }
    if (phase === '집중' && prev === '준비' && !spokenCuesRef.current.steady) {
      spokenCuesRef.current.steady = true;
      speakDuelCue('steady');
      void trigger('light');
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (signalHoldTimerRef.current != null) {
      clearTimeout(signalHoldTimerRef.current);
      signalHoldTimerRef.current = null;
    }
    if (phase === '결과') {
      setSignalBoardPhase('결과');
      return;
    }
    setSignalBoardPhase(enginePhaseToSignalBoardPhase(phase));
  }, [phase]);

  useEffect(
    () => () => {
      if (outcomeRevealTimersRef.current.defeat != null) {
        clearTimeout(outcomeRevealTimersRef.current.defeat);
      }
      if (outcomeRevealTimersRef.current.modal != null) {
        clearTimeout(outcomeRevealTimersRef.current.modal);
      }
      outcomeRevealTimersRef.current = { defeat: null, modal: null };
    },
    [],
  );

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
      warmupDuelSpeech();
      // 매치가 진행되는 동안 광고를 미리 받아둔다. (이미 로드돼 있으면 no-op)
      // 결과 화면은 "이미 준비된" 전면만 띄우므로, 로드가 늦으면 광고 없이 바로 결과가 나온다.
      preloadInterstitial();
      preloadRewardedAd();
      if (npcIdStr == null) {
        return () => {
          resetDuel();
        };
      }
      if (fromDaily && !dailyReady) {
        return undefined;
      }
      const dailyBossOk =
        fromDaily &&
        npc != null &&
        Number.isFinite(npcId) &&
        npcId !== 22;
      if (dailyBossOk) {
        useDailyMissionStore.getState().ensureToday(highestUnlocked);
      }
      const isTodayBoss =
        dailyBossOk &&
        useDailyMissionStore.getState().todayBossNpcId === npcId;
      const canAccess =
        DEV_UNLOCK_ALL_NPCS ||
        isTodayBoss ||
        (npc &&
          Number.isFinite(npcId) &&
          npcId >= 1 &&
          (npcId === 22 ? selectPaleRiderUnlocked() : npcId <= highestUnlocked));
      if (!canAccess) {
        router.replace((fromDaily ? '/ranking' : '/npc-select') as Href);
        return undefined;
      }
      let cancelled = false;
      void (async () => {
        const characterId = useSettingsStore.getState().selectedCharacterId;
        await Promise.all([
          preloadSceneImages(),
          npc ? prefetchDuelSprites(npc.id, characterId) : Promise.resolve(),
        ]);
        if (cancelled || !npc) return;
        if (npc?.id !== 21) {
          chaosModeRef.current = 'none';
        }
        startMatch({ mode: 'npc', playerHearts: HEARTS, opponentHearts: HEARTS });
        playerStreakRef.current = 0;
        prevBangDelayRef.current = null;
        prevPlayerBangMsRef.current = null;
        processedOutcomeKey.current = '';
        adReviveUsedRef.current = false;
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
      fromDaily,
      dailyReady,
      router,
      startMatch,
      resetDuel,
      startRoundDuel,
    ]),
  );

  useEffect(() => {
    if (phase !== '결과' || !outcome || !npc) return;

    const key = `${currentRound}:${outcome.earlyTap}:${outcome.timeout}:${outcome.reactionMs}`;
    if (processedOutcomeKey.current === key) return;
    processedOutcomeKey.current = key;

    const o = outcome;
    const streakBefore = playerStreakRef.current;
    const npcSim =
      npcRoundSimRef.current ??
      simulateNpcReaction({
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

    const nextDefeatedSide: 'player' | 'npc' | null = effectiveWin
      ? oh > 0
        ? 'npc'
        : null
      : reviveFlip
        ? 'player'
        : ph > 0
          ? 'player'
          : null;

    if (effectiveWin) {
      setScores(ps + 1, ns);
      if (oh > 0) {
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
        setHearts(ph - 1, oh);
      }
      playerStreakRef.current = 0;
    }

    const modalDelay = o.earlyTap
      ? DUEL_EARLY_MODAL_DELAY_MS
      : nextDefeatedSide != null
        ? DUEL_DEFEAT_MODAL_DELAY_MS
        : 0;

    if (outcomeRevealTimersRef.current.defeat != null) {
      clearTimeout(outcomeRevealTimersRef.current.defeat);
      outcomeRevealTimersRef.current.defeat = null;
    }
    if (outcomeRevealTimersRef.current.modal != null) {
      clearTimeout(outcomeRevealTimersRef.current.modal);
      outcomeRevealTimersRef.current.modal = null;
    }

    const playerLostHeart =
      !effectiveWin && !reviveFlip && data.kind === 'loss' && ph > 0;
    const npcLostHeart = effectiveWin && oh > 0;

    if (nextDefeatedSide == null) {
      setDefeatedSide(null);
    } else {
      outcomeRevealTimersRef.current.defeat = setTimeout(() => {
        setDefeatedSide(nextDefeatedSide);
        // thud는 피격 휘청 peak에 맞춤 (pose 전환 직후 즉시면 컷이 강조됨)
        setTimeout(() => void play('defeat_thud'), 170);
        void trigger('medium');
        if (playerLostHeart || npcLostHeart) {
          setTimeout(() => void play('heart_break'), 130);
        }
        outcomeRevealTimersRef.current.defeat = null;
      }, DUEL_DEFEAT_REVEAL_DELAY_MS);
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
      queueMicrotask(() => {
        const { recordGlobalReactionSample, recordNpcBestReaction } =
          useProgressStore.getState();
        recordGlobalReactionSample(ms);
        recordNpcBestReaction(npc.id, ms);
      });
    }

    if (o.earlyTap) {
      void play('early_tap');
      void trigger('error');
    } else if (effectiveWin) {
      void trigger('success');
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
      return () => {
        if (outcomeRevealTimersRef.current.defeat != null) {
          clearTimeout(outcomeRevealTimersRef.current.defeat);
          outcomeRevealTimersRef.current.defeat = null;
        }
      };
    }

    if (reviveFlip && data.kind === 'loss') {
      const reviveModalData: NpcRoundModalData = { ...data, revive: true };
      deferredModalRef.current = { data: reviveModalData, headshotOffered: false };
      setHeadshotOffered(false);
      setModalVisible(false);
      setModal(null);
      setAbilityOverlay('revive');
      return () => {
        if (outcomeRevealTimersRef.current.defeat != null) {
          clearTimeout(outcomeRevealTimersRef.current.defeat);
          outcomeRevealTimersRef.current.defeat = null;
        }
      };
    }

    if (modalDelay > 0) {
      outcomeRevealTimersRef.current.modal = setTimeout(() => {
        setModal(modalData);
        setModalVisible(true);
        setHeadshotOffered(offerHeadshot);
        outcomeRevealTimersRef.current.modal = null;
      }, modalDelay);
    } else {
      setModal(modalData);
      setModalVisible(true);
      setHeadshotOffered(offerHeadshot);
    }

    return () => {
      if (outcomeRevealTimersRef.current.modal != null) {
        clearTimeout(outcomeRevealTimersRef.current.modal);
        outcomeRevealTimersRef.current.modal = null;
      }
    };
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
    if (outcomeRevealTimersRef.current.defeat != null) {
      clearTimeout(outcomeRevealTimersRef.current.defeat);
      outcomeRevealTimersRef.current.defeat = null;
    }
    if (outcomeRevealTimersRef.current.modal != null) {
      clearTimeout(outcomeRevealTimersRef.current.modal);
      outcomeRevealTimersRef.current.modal = null;
    }
    if (headshotOffered) {
      setAbilityUsed(true);
    }
    setHeadshotOffered(false);
    setDefeatedSide(null);
    setModalVisible(false);
    setModal(null);

    const ps = useGameStore.getState().playerScore;
    const ns = useGameStore.getState().opponentScore;

    if (ps >= WINS_TO_END || ns >= WINS_TO_END) {
      // 접전 패배(2:3) — 광고 부활 제안 (매치당 1회, 보스전 22번 제외)
      const closeLoss =
        ns >= WINS_TO_END &&
        ps === WINS_TO_END - 1 &&
        !adReviveUsedRef.current &&
        npc?.id !== 22;
      if (closeLoss) {
        // 소진 처리는 실제로 부활에 성공했을 때만 (제안 시점에 세우면
        // 광고 로드 실패 등으로 부활을 못 받아도 기회가 날아간다)
        setAdRevivePending({ ps, ns });
        return;
      }
      if (ps >= WINS_TO_END) {
        recordNpcWinIfAllowed(npc!.id, fromDaily);
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
          dayNight: battleDayNight,
          fromDaily: fromDaily ? '1' : '0',
        },
      });
      return;
    }

    processedOutcomeKey.current = '';
    nextRound();
    resetDuel();
    startRoundDuel();
  }, [npc, nextRound, resetDuel, router, startRoundDuel, headshotOffered, setAbilityUsed, battleDayNight, fromDaily]);

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
    } else {
      pulsePlayerTapAck('other');
      void trigger('light');
      setPlayerShootFlash(true);
    }
    tap();
  }, [shootCapturesEarly, isBangReactionArmed, pulsePlayerTapAck, tap]);

  const leaveToNpcSelect = useCallback(() => {
    setPaused(false);
    resetDuel();
    if (fromDaily) {
      router.replace('/ranking' as Href);
    } else {
      router.back();
    }
  }, [fromDaily, resetDuel, router]);

  const leaveToMainMenu = useCallback(() => {
    setPaused(false);
    resetDuel();
    router.replace('/menu');
  }, [resetDuel, router]);

  /** 광고 부활 결과 처리 — 성공 시 상대 마지막 승 롤백 후 다음 라운드, 실패·거절 시 정상 결과 화면으로 */
  const finishMatchToResult = useCallback(() => {
    const ps = useGameStore.getState().playerScore;
    const ns = useGameStore.getState().opponentScore;
    if (ps >= WINS_TO_END) {
      recordNpcWinIfAllowed(npc!.id, fromDaily);
    }
    const lr = useGameStore.getState().lastReaction;
    router.replace({
      pathname: '/result/npc',
      params: {
        npcId: String(npc!.id),
        won: ps >= WINS_TO_END ? '1' : '0',
        playerWins: String(ps),
        npcWins: String(ns),
        completionStamp: String(Date.now()),
        playerMs: lr.playerMs != null ? String(lr.playerMs) : '',
        npcMs: lr.npcMs != null ? String(lr.npcMs) : '',
        lossReason: '',
        dayNight: battleDayNight,
        fromDaily: fromDaily ? '1' : '0',
      },
    });
  }, [npc, router, battleDayNight, fromDaily]);

  const onAdReviveDecline = useCallback(() => {
    setAdRevivePending(null);
    finishMatchToResult();
  }, [finishMatchToResult]);

  const onAdReviveWatchAd = useCallback(async () => {
    const pending = adRevivePending;
    if (!pending) return;

    const adFree = useProgressStore.getState().isAdFree;
    let rewarded = adFree;
    if (!adFree) {
      // 모달은 유지한 채 loading만 켠다 — 광고 SDK가 위에 뜨고,
      // 실패 시에도 모달이 갑자기 사라져 결과로 튕기는 느낌을 줄인다.
      setAdReviveLoading(true);
      rewarded = await showRewardedAd();
      setAdReviveLoading(false);
    }

    setAdRevivePending(null);

    if (!rewarded) {
      finishMatchToResult();
      return;
    }

    adReviveUsedRef.current = true;
    const store = useGameStore.getState();
    // 접전 패배(2:3) 직전 상태로: 상대 승수 -1, 플레이어 하트 1칸 복구
    store.setScores(pending.ps, Math.max(0, pending.ns - 1));
    store.setHearts(1, store.opponentHearts);
    setDefeatedSide(null);
    setModalVisible(false);
    setModal(null);
    processedOutcomeKey.current = '';
    resetDuel();
    startRoundDuel();
  }, [adRevivePending, finishMatchToResult, resetDuel, startRoundDuel]);

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

  useEffect(() => {
    if (phase !== '뱅' && phase !== '결과') {
      setPlayerShootFlash(false);
    }
  }, [phase]);

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

  const arenaShellProps = {
    style: { width: winW, height: winH } as const,
    contentWidth: winW,
    contentHeight: winH,
  };

  const arenaBody = (
    <>
      <Animated.View pointerEvents="none" style={[styles.blueRing, blueStyle]} />

      {npc?.id === 22 && (phase === '집중' || phase === '페이크') ? (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, styles.paleDim]}
        />
      ) : null}

      {earlyOverlay ? (
        <View pointerEvents="none" style={styles.earlyLabelWrap}>
          <Text
            style={[
              styles.earlyLabel,
              DUEL_VISUAL_THEME === 'minimal' && styles.earlyLabelInk,
            ]}
          >
            EARLY!
          </Text>
        </View>
      ) : null}

      {npc ? (
        <>
          <DuelArenaLayout
            width={winW}
            height={winH}
            paddingTop={overlayPad.top}
            paddingBottom={insets.bottom}
            paddingRight={overlayPad.right}
            npcId={npc.id}
            tier={npc.tier}
            bossFlag={npc.bossFlag}
            npcPose={npcPose}
            npcVictoryActive={defeatedSide === 'player'}
            playerVictoryActive={defeatedSide === 'npc'}
            playerCharacterId={selectedCharacterId}
            playerPose={playerPose}
            signalPhase={signalBoardPhase}
            blindBangText={blindBangText}
            invertSignalColors={invertSignalColors}
            echoReadySignal={npc.specialAbility === 'echoReady'}
            opponentHearts={opponentHearts}
            playerHearts={playerHearts}
            playerScore={playerScore}
            opponentScore={opponentScore}
            shootCapturesEarly={shootCapturesEarly}
            shootActive={shootActive}
            onShootPress={onShootPress}
            onPause={() => setPaused(true)}
            pauseDisabled={phase === '페이크'}
            playerTapAckStyle={playerTapAckStyle}
            hideBottomHud={modalVisible}
            orientation={isLandscape ? 'landscape' : 'portrait'}
          />

          <NpcRoundModal
            visible={modalVisible}
            data={modal}
            onContinue={onContinue}
            winBurstId={npcRoundWinBurstId}
            headshotOffered={headshotOffered}
            onHeadshotPress={onHeadshotPress}
            paddingBottom={insets.bottom}
          />

          <AbilityOverlay
            abilityType={abilityOverlay}
            onComplete={handleAbilityOverlayComplete}
          />

          <PauseMenuModal
            visible={paused}
            onResume={() => setPaused(false)}
            onSecondaryExit={leaveToNpcSelect}
            secondaryLabel={
              fromDaily ? t('ranking.backHub') : t('game.toOpponentSelect')
            }
            onMainMenu={leaveToMainMenu}
          />

          <AdReviveModal
            visible={adRevivePending != null}
            playerWins={adRevivePending?.ps ?? 0}
            opponentWins={adRevivePending?.ns ?? 0}
            loading={adReviveLoading}
            adFree={isAdFree}
            onWatchAd={onAdReviveWatchAd}
            onDecline={onAdReviveDecline}
          />
        </>
      ) : null}
    </>
  );

  return (
    <PhoneStageShell
      edgeToEdge
      backgroundColor={DUEL_VISUAL_THEME === 'minimal' ? MINIMAL_DUEL.stageEdge : undefined}
    >
      {duelBg.kind === 'solid' ? (
        <SceneBackground
          {...arenaShellProps}
          solidColor={duelBg.color}
          dimColor={
            DUEL_VISUAL_THEME === 'minimal'
              ? 'transparent'
              : battleDayNight === 'night'
                ? 'rgba(12, 8, 5, 0.1)'
                : 'rgba(12, 8, 5, 0.16)'
          }
        >
          {arenaBody}
        </SceneBackground>
      ) : duelBg.kind === 'full' ? (
        <DuelFullBackground {...arenaShellProps} variant={duelBg.variant}>
          {arenaBody}
        </DuelFullBackground>
      ) : (
        <SceneBackground
          {...arenaShellProps}
          source={duelBg.source}
          dimColor={
            battleDayNight === 'night'
              ? 'rgba(12, 8, 5, 0.1)'
              : 'rgba(12, 8, 5, 0.16)'
          }
        >
          {arenaBody}
        </SceneBackground>
      )}
    </PhoneStageShell>
  );
}

const styles = StyleSheet.create({
  paleDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(22, 18, 42, 0.1)',
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
  earlyLabelInk: {
    color: MINIMAL_DUEL.ink,
    textShadowColor: 'transparent',
    textShadowRadius: 0,
  },
});
