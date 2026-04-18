import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { SceneBackground } from '@/components/game/SceneBackground';
import { PhoneStageShell } from '@/components/layout/PhoneStageShell';
import { gameImages } from '@/constants/gameImages';
import { RM_GAME } from '@/constants/reanimatedGame';
import { colors } from '@/constants/theme';
import { FONT_RYE } from '@/constants/fonts';
import { getNpcById } from '@/constants/npcs';
import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';
import { bgmPlay } from '@/utils/audioService';
import { formatReactionMs } from '@/utils/formatReactionMs';
import { initAds, preloadInterstitial, showStageCompleteAd } from '@/utils/adService';
import { trigger } from '@/utils/hapticService';

type LossReason = 'early' | 'timeout' | 'slower' | '';

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
}

function GoldenStar({
  winH,
  left,
  delay,
  duration,
}: {
  winH: number;
  left: number;
  delay: number;
  duration: number;
}) {
  const y = useSharedValue(-40);
  const opacity = useSharedValue(0);

  useEffect(() => {
    y.value = -40;
    opacity.value = 0;
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 220, easing: Easing.out(Easing.quad), reduceMotion: RM_GAME }),
        withTiming(0.75, {
          duration: Math.max(400, duration - 400),
          easing: Easing.linear,
          reduceMotion: RM_GAME,
        }),
        withTiming(0, { duration: 280, easing: Easing.in(Easing.quad), reduceMotion: RM_GAME }),
      ),
    );
    y.value = withDelay(
      delay,
      withTiming(winH + 60, {
        duration,
        easing: Easing.linear,
        reduceMotion: RM_GAME,
      }),
    );
  }, [winH, delay, duration, y, opacity]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text
      style={[styles.starGlyph, { left }, anim]}
      pointerEvents="none"
    >
      ★
    </Animated.Text>
  );
}

function GoldenParticles({
  winW,
  winH,
  seed,
}: {
  winW: number;
  winH: number;
  seed: string;
}) {
  const h = hashSeed(seed);
  const stars = useMemo(() => {
    const count = 10 + (h % 6);
    return Array.from({ length: count }, (_, i) => {
      const t = h * (i + 3) * 9301 + 49297;
      const left = 8 + (t % Math.max(1, winW - 32));
      const delay = (t % 380) + i * 45;
      const duration = 2200 + (t % 900) + i * 40;
      return { id: i, left, delay, duration };
    });
  }, [h, winW]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((s) => (
        <GoldenStar key={s.id} winH={winH} left={s.left} delay={s.delay} duration={s.duration} />
      ))}
    </View>
  );
}

function DustParticle({
  left,
  delay,
  size,
  rise,
}: {
  left: number;
  delay: number;
  size: number;
  rise: number;
}) {
  const translateY = useSharedValue(8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = 8;
    opacity.value = 0;
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(0.5, { duration: 200, easing: Easing.out(Easing.quad), reduceMotion: RM_GAME }),
        withTiming(0, { duration: 900, easing: Easing.in(Easing.quad), reduceMotion: RM_GAME }),
      ),
    );
    translateY.value = withDelay(
      delay,
      withTiming(-rise, {
        duration: 1150,
        easing: Easing.out(Easing.cubic),
        reduceMotion: RM_GAME,
      }),
    );
  }, [delay, rise, translateY, opacity]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.dustDot,
        { left, width: size, height: size, borderRadius: size / 2, bottom: 36 },
        anim,
      ]}
      pointerEvents="none"
    />
  );
}

function DustRise({ winW, seed }: { winW: number; seed: string }) {
  const h = hashSeed(seed + 'dust');
  const parts = useMemo(() => {
    const n = 5 + (h % 4);
    return Array.from({ length: n }, (_, i) => {
      const t = h * (i + 11) * 1103515245;
      const left = 10 + (t % Math.max(1, winW - 24));
      const delay = (t % 200) + i * 70;
      const size = 4 + (t % 5);
      const rise = 120 + (t % 140);
      return { id: i, left, delay, size, rise };
    });
  }, [h, winW]);

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 2 }]} pointerEvents="none">
      {parts.map((p) => (
        <DustParticle key={p.id} {...p} />
      ))}
    </View>
  );
}

function lossReasonLabel(reason: LossReason): string {
  switch (reason) {
    case 'early':
      return '얼리 탭 — 뱅 전에 발사했습니다';
    case 'timeout':
      return '타임아웃 — 제한 시간 내에 쏘지 못했습니다';
    case 'slower':
      return '반응 속도 패배 — 상대보다 늦게 쐈습니다';
    default:
      return '';
  }
}

function whoFaster(
  playerMs: number | null,
  npcMs: number | null,
): 'player' | 'npc' | 'tie' | 'unknown' {
  if (playerMs == null || npcMs == null) return 'unknown';
  if (playerMs < npcMs) return 'player';
  if (npcMs < playerMs) return 'npc';
  return 'tie';
}

export default function NpcResultScreen() {
  const router = useRouter();
  const { stageWidth: winW, stageHeight: winH } = usePhoneStageMetrics();
  const {
    npcId,
    won,
    playerWins,
    npcWins,
    completionStamp,
    playerMs: playerMsParam,
    npcMs: npcMsParam,
    lossReason: lossReasonParam,
  } = useLocalSearchParams<{
    npcId?: string;
    won?: string;
    playerWins?: string;
    npcWins?: string;
    completionStamp?: string;
    playerMs?: string;
    npcMs?: string;
    lossReason?: string;
  }>();

  const id = Number(npcId);
  const npc = getNpcById(id);
  const victory = won === '1';
  const bg = victory ? gameImages.winScreen : gameImages.loseScreen;

  const playerMsRaw =
    playerMsParam != null && playerMsParam !== '' ? Number(playerMsParam) : NaN;
  const npcMsRaw = npcMsParam != null && npcMsParam !== '' ? Number(npcMsParam) : NaN;
  const playerMs = Number.isFinite(playerMsRaw) ? playerMsRaw : null;
  const npcMs = Number.isFinite(npcMsRaw) ? npcMsRaw : null;
  const lossReason = (lossReasonParam ?? '') as LossReason;
  const faster = whoFaster(playerMs, npcMs);

  const [adFlowComplete, setAdFlowComplete] = useState(() => !victory);
  const adHandledKeyRef = useRef<string | null>(null);
  const resultSessionKey = `${npcId ?? ''}-${won ?? ''}-${playerWins ?? ''}-${npcWins ?? ''}-${completionStamp ?? ''}`;

  const titleScale = useSharedValue(victory ? 0 : 1);
  const shakeX = useSharedValue(0);
  const fxStartedRef = useRef(false);
  const victoryAnimRan = useRef(false);
  const shakeAnimRan = useRef(false);

  useEffect(() => {
    fxStartedRef.current = false;
    victoryAnimRan.current = false;
    shakeAnimRan.current = false;
  }, [completionStamp]);

  useFocusEffect(
    useCallback(() => {
      if (won !== '1') {
        setAdFlowComplete(true);
        return;
      }
      if (adHandledKeyRef.current === resultSessionKey) {
        setAdFlowComplete(true);
        return;
      }
      adHandledKeyRef.current = resultSessionKey;
      setAdFlowComplete(false);
      let cancelled = false;
      void initAds().then(() => preloadInterstitial());
      void showStageCompleteAd().then(() => {
        if (!cancelled) {
          setAdFlowComplete(true);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [won, resultSessionKey]),
  );

  useEffect(() => {
    if (!adFlowComplete) return;
    if (victory) {
      if (victoryAnimRan.current) return;
      victoryAnimRan.current = true;
      titleScale.value = 0;
      titleScale.value = withSequence(
        withTiming(1.2, {
          duration: 320,
          easing: Easing.out(Easing.back(1.35)),
          reduceMotion: RM_GAME,
        }),
        withTiming(1, {
          duration: 180,
          easing: Easing.out(Easing.quad),
          reduceMotion: RM_GAME,
        }),
      );
    } else {
      if (shakeAnimRan.current) return;
      shakeAnimRan.current = true;
      shakeX.value = withSequence(
        withTiming(8, { duration: 45, reduceMotion: RM_GAME }),
        withTiming(-8, { duration: 45, reduceMotion: RM_GAME }),
        withTiming(8, { duration: 45, reduceMotion: RM_GAME }),
        withTiming(-8, { duration: 45, reduceMotion: RM_GAME }),
        withTiming(8, { duration: 45, reduceMotion: RM_GAME }),
        withTiming(-8, { duration: 45, reduceMotion: RM_GAME }),
        withTiming(8, { duration: 45, reduceMotion: RM_GAME }),
        withTiming(-8, { duration: 45, reduceMotion: RM_GAME }),
        withTiming(0, { duration: 50, reduceMotion: RM_GAME }),
      );
    }
  }, [adFlowComplete, victory, titleScale, shakeX]);

  useEffect(() => {
    if (!adFlowComplete) return;
    if (fxStartedRef.current) return;
    fxStartedRef.current = true;
    if (victory) {
      void bgmPlay('result_win');
      void trigger('success');
    } else {
      void bgmPlay('result_lose');
      void trigger('error');
    }
  }, [adFlowComplete, victory]);

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleScale.value }],
  }));

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const onRetry = useCallback(() => {
    if (!Number.isFinite(id)) return;
    router.replace({
      pathname: '/game/npc',
      params: { npcId: String(id) },
    } as Href);
  }, [router, id]);

  const onNpcSelect = useCallback(() => {
    router.dismissTo('/npc-select');
  }, [router]);

  const showFx = adFlowComplete;

  return (
    <PhoneStageShell>
      <SceneBackground
        source={bg}
        style={{ width: winW, height: winH }}
        contentWidth={winW}
        contentHeight={winH}
        dimColor="rgba(20, 12, 8, 0.5)"
      >
        {!adFlowComplete ? (
          <View style={styles.adLoading} pointerEvents="auto">
            <ActivityIndicator size="large" color={colors.cream} />
            <Text style={styles.adLoadingText}>로딩 중…</Text>
          </View>
        ) : null}

        {showFx && victory ? (
          <GoldenParticles winW={winW} winH={winH} seed={completionStamp ?? 'win'} />
        ) : null}

        {showFx && !victory ? (
          <DustRise winW={winW} seed={completionStamp ?? 'lose'} />
        ) : null}

        <Animated.View
          style={[
            styles.shakeWrap,
            { width: winW, height: winH },
            !victory && showFx ? shakeStyle : undefined,
          ]}
        >
          <View style={[styles.content, !adFlowComplete && styles.contentHidden]}>
            {victory ? (
              <Animated.Text style={[styles.youWin, titleAnimatedStyle]}>YOU WIN</Animated.Text>
            ) : (
              <Animated.Text entering={FadeIn.duration(420)} style={styles.youLose}>
                YOU LOSE
              </Animated.Text>
            )}

            {!victory && lossReason ? (
              <Text style={styles.lossReason}>{lossReasonLabel(lossReason)}</Text>
            ) : null}

            {npc ? (
              <Text style={styles.sub}>
                vs {npc.title} {npc.name}
              </Text>
            ) : null}

            <Text style={styles.score}>
              점수 {playerWins ?? '0'} — {npcWins ?? '0'}
            </Text>

            <View style={styles.reactionRow}>
              <View style={styles.reactionCol}>
                <Text style={styles.reactionLabel}>나 (ms)</Text>
                <Text
                  style={[
                    styles.reactionValue,
                    faster === 'player' && styles.reactionValueWin,
                  ]}
                >
                  {playerMs != null ? formatReactionMs(playerMs) : '—'}
                </Text>
              </View>
              <Text style={styles.reactionVs}>vs</Text>
              <View style={styles.reactionCol}>
                <Text style={styles.reactionLabel}>NPC (ms)</Text>
                <Text
                  style={[
                    styles.reactionValue,
                    faster === 'npc' && styles.reactionValueWin,
                  ]}
                >
                  {npcMs != null ? formatReactionMs(npcMs) : '—'}
                </Text>
              </View>
            </View>

            <View style={styles.btnRow}>
              <Pressable
                onPress={onRetry}
                style={({ pressed }) => [styles.btnSecondary, pressed && styles.btnPressed]}
              >
                <Text style={styles.btnSecondaryText}>다시 도전</Text>
              </Pressable>
              <Pressable
                onPress={onNpcSelect}
                style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
              >
                <Text style={styles.btnText}>NPC 선택으로</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </SceneBackground>
    </PhoneStageShell>
  );
}

const GOLD = '#E8C547';
const LOSE_TITLE = '#4A1515';

const styles = StyleSheet.create({
  adLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
    backgroundColor: 'rgba(20, 12, 8, 0.35)',
  },
  adLoadingText: {
    marginTop: 12,
    color: colors.sand,
    fontSize: 14,
    fontWeight: '600',
  },
  shakeWrap: {
    zIndex: 5,
  },
  content: {
    flex: 1,
    padding: 28,
    justifyContent: 'center',
    gap: 12,
    zIndex: 6,
  },
  contentHidden: {
    opacity: 0,
  },
  starGlyph: {
    position: 'absolute',
    top: 0,
    fontSize: 22,
    color: GOLD,
    textShadowColor: 'rgba(255, 220, 120, 0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  dustDot: {
    position: 'absolute',
    backgroundColor: 'rgba(120, 118, 115, 0.75)',
  },
  youWin: {
    fontSize: 40,
    fontWeight: '900',
    color: GOLD,
    letterSpacing: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  youLose: {
    fontSize: 38,
    fontWeight: '900',
    color: LOSE_TITLE,
    letterSpacing: 3,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  lossReason: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.sand,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.95,
  },
  sub: {
    fontSize: 17,
    color: colors.cream,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  score: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.sand,
    marginTop: 4,
    textAlign: 'center',
  },
  reactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(20, 12, 8, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.35)',
  },
  reactionCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  reactionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.sand,
    letterSpacing: 0.5,
  },
  reactionValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.cream,
  },
  reactionValueWin: {
    color: GOLD,
    fontWeight: '900',
    fontSize: 24,
  },
  reactionVs: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ochre,
    opacity: 0.85,
  },
  btnRow: {
    marginTop: 24,
    gap: 12,
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.ochre,
  },
  btnSecondary: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(45, 28, 14, 0.92)',
    borderWidth: 2,
    borderColor: colors.sand,
  },
  btnPressed: {
    opacity: 0.9,
  },
  btnText: {
    textAlign: 'center',
    fontWeight: '800',
    color: colors.darkBrown,
    fontSize: 16,
  },
  btnSecondaryText: {
    textAlign: 'center',
    fontWeight: '800',
    color: colors.cream,
    fontSize: 16,
  },
});
