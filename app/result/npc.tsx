import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { OutcomeBackdrop } from '@/components/result/OutcomeBackdrop';
import { ReactionStatsCard } from '@/components/result/ReactionStatsCard';
import { PhoneStageShell } from '@/components/layout/PhoneStageShell';
import { WoodButton } from '@/components/ui/WoodButton';
import {
  OUTCOME_DEFEAT,
  OUTCOME_PANEL,
  OUTCOME_VICTORY,
  outcomeTextShadow,
} from '@/constants/outcomeTheme';
import { RM_GAME } from '@/constants/reanimatedGame';
import { colors } from '@/constants/theme';
import { FONT_RYE } from '@/constants/fonts';
import { getNpcById } from '@/constants/npcs';
import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { bgmPlay } from '@/utils/audioService';
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

function Sparkle({
  left,
  delay,
  top,
}: {
  left: number;
  delay: number;
  top: number;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.6);

  useEffect(() => {
    opacity.value = 0;
    scale.value = 0.6;
    opacity.value = withSequence(
      withTiming(0, { duration: delay, reduceMotion: RM_GAME }),
      withTiming(1, { duration: 280, easing: Easing.out(Easing.quad), reduceMotion: RM_GAME }),
      withTiming(0, { duration: 700, easing: Easing.in(Easing.quad), reduceMotion: RM_GAME }),
    );
    scale.value = withSequence(
      withTiming(0.6, { duration: delay, reduceMotion: RM_GAME }),
      withTiming(1.1, { duration: 400, easing: Easing.out(Easing.back(1.2)), reduceMotion: RM_GAME }),
      withTiming(0.8, { duration: 580, reduceMotion: RM_GAME }),
    );
  }, [delay, opacity, scale]);

  const anim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.Text style={[styles.sparkle, { left, top }, anim]} pointerEvents="none">
      ✦
    </Animated.Text>
  );
}

function VictorySparkles({ width, seed }: { width: number; seed: string }) {
  const h = hashSeed(seed);
  const items = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const t = h * (i + 5) * 7919;
      return {
        id: i,
        left: 12 + (t % Math.max(1, width - 36)),
        top: 48 + ((t >> 4) % 120),
        delay: (t % 500) + i * 80,
      };
    });
  }, [h, width]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {items.map((s) => (
        <Sparkle key={s.id} left={s.left} top={s.top} delay={s.delay} />
      ))}
    </View>
  );
}

function lossReasonLabel(reason: LossReason): string {
  switch (reason) {
    case 'early':
      return '뱅 신호 전에 발사했습니다';
    case 'timeout':
      return '제한 시간 안에 쏘지 못했습니다';
    case 'slower':
      return '상대보다 늦게 반응했습니다';
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
  useScreenBgm(null, true);
  const { windowWidth: winW, windowHeight: winH } = usePhoneStageMetrics();
  const {
    npcId,
    won,
    playerWins,
    npcWins,
    completionStamp,
    playerMs: playerMsParam,
    npcMs: npcMsParam,
    lossReason: lossReasonParam,
    dayNight: dayNightParam,
  } = useLocalSearchParams<{
    npcId?: string;
    won?: string;
    playerWins?: string;
    npcWins?: string;
    completionStamp?: string;
    playerMs?: string;
    npcMs?: string;
    lossReason?: string;
    dayNight?: string;
  }>();

  const id = Number(npcId);
  const npc = getNpcById(id);
  const victory = won === '1';
  const dayNight = dayNightParam === 'night' ? 'night' : 'day';
  const theme = victory ? OUTCOME_VICTORY : OUTCOME_DEFEAT;

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

  const titleScale = useSharedValue(victory ? 0.85 : 1);
  const fxStartedRef = useRef(false);

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
        if (!cancelled) setAdFlowComplete(true);
      });
      return () => {
        cancelled = true;
      };
    }, [won, resultSessionKey]),
  );

  useEffect(() => {
    if (!adFlowComplete || !victory) return;
    titleScale.value = 0.85;
    titleScale.value = withSequence(
      withTiming(1.08, {
        duration: 340,
        easing: Easing.out(Easing.back(1.3)),
        reduceMotion: RM_GAME,
      }),
      withTiming(1, { duration: 200, easing: Easing.out(Easing.quad), reduceMotion: RM_GAME }),
    );
  }, [adFlowComplete, victory, titleScale]);

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

  const showContent = adFlowComplete;

  return (
    <PhoneStageShell edgeToEdge>
      <OutcomeBackdrop variant={dayNight} width={winW} height={winH}>
        {!adFlowComplete ? (
          <View style={styles.adLoading} pointerEvents="auto">
            <ActivityIndicator size="large" color={colors.cream} />
            <Text style={styles.adLoadingText}>잠시만요…</Text>
          </View>
        ) : null}

        {showContent && victory ? (
          <VictorySparkles width={winW} seed={completionStamp ?? 'win'} />
        ) : null}

        <View style={[styles.content, !showContent && styles.contentHidden]}>
          <Animated.View
            entering={FadeInDown.duration(420).springify().damping(18)}
            style={[styles.panel, { borderColor: theme.badgeBorder }]}
          >
            <View style={[styles.accentBar, { backgroundColor: theme.accent }]} />

            {victory ? (
              <Animated.Text
                style={[
                  styles.title,
                  { fontFamily: FONT_RYE, color: theme.title },
                  titleAnimatedStyle,
                ]}
              >
                승리
              </Animated.Text>
            ) : (
              <Animated.Text
                entering={FadeInDown.duration(380)}
                style={[styles.title, { fontFamily: FONT_RYE, color: theme.title }]}
              >
                패배
              </Animated.Text>
            )}

            {!victory && lossReason ? (
              <Text style={styles.lossReason}>{lossReasonLabel(lossReason)}</Text>
            ) : victory ? (
              <Text style={styles.winSubtitle}>결투에서 이겼습니다</Text>
            ) : null}

            {npc ? (
              <View style={styles.opponentRow}>
                <Text style={styles.opponentLabel}>상대</Text>
                <Text style={styles.opponentName}>
                  {npc.title} {npc.name}
                </Text>
              </View>
            ) : null}

            <View style={styles.scorePill}>
              <Text style={styles.scoreLabel}>최종 스코어</Text>
              <Text style={[styles.scoreValue, { fontFamily: FONT_RYE }]}>
                {playerWins ?? '0'} — {npcWins ?? '0'}
              </Text>
            </View>

            <ReactionStatsCard playerMs={playerMs} npcMs={npcMs} faster={faster} />

            <View style={styles.btnCol}>
              <WoodButton title="다시 도전" onPress={onRetry} style={styles.btn} />
              <WoodButton
                title="대결상대 선택으로"
                onPress={onNpcSelect}
                style={styles.btnSecondary}
                textStyle={styles.btnSecondaryText}
              />
            </View>
          </Animated.View>
        </View>
      </OutcomeBackdrop>
    </PhoneStageShell>
  );
}

const styles = StyleSheet.create({
  adLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
    backgroundColor: 'rgba(8, 4, 2, 0.45)',
  },
  adLoadingText: {
    marginTop: 12,
    color: colors.sand,
    fontSize: 14,
    fontWeight: '600',
    ...outcomeTextShadow,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 28,
    zIndex: 6,
  },
  contentHidden: {
    opacity: 0,
  },
  sparkle: {
    position: 'absolute',
    fontSize: 18,
    color: OUTCOME_VICTORY.title,
    textShadowColor: 'rgba(255, 220, 120, 0.85)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  panel: {
    borderRadius: OUTCOME_PANEL.borderRadius,
    backgroundColor: OUTCOME_PANEL.background,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 22,
    gap: 14,
    overflow: 'hidden',
  },
  accentBar: {
    height: 3,
    marginHorizontal: -20,
    marginBottom: 4,
  },
  title: {
    fontSize: 44,
    textAlign: 'center',
    letterSpacing: 3,
    marginTop: 8,
    ...outcomeTextShadow,
  },
  winSubtitle: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: colors.sand,
    letterSpacing: 0.4,
    ...outcomeTextShadow,
  },
  lossReason: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#E8C4C4',
    lineHeight: 21,
    ...outcomeTextShadow,
  },
  opponentRow: {
    alignItems: 'center',
    gap: 4,
  },
  opponentLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.sand,
    letterSpacing: 1.4,
    opacity: 0.85,
  },
  opponentName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.cream,
    textAlign: 'center',
    ...outcomeTextShadow,
  },
  scorePill: {
    alignSelf: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.3)',
    gap: 2,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.sand,
    letterSpacing: 1.2,
  },
  scoreValue: {
    fontSize: 24,
    color: colors.gold,
    letterSpacing: 2,
    ...outcomeTextShadow,
  },
  btnCol: {
    marginTop: 4,
    gap: 10,
  },
  btn: {
    paddingVertical: 14,
  },
  btnSecondary: {
    paddingVertical: 14,
    backgroundColor: 'rgba(28, 16, 8, 0.95)',
    borderColor: 'rgba(212, 165, 116, 0.45)',
  },
  btnSecondaryText: {
    color: colors.cream,
    fontSize: 16,
  },
});
