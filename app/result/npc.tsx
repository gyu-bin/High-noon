import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import { useTranslation } from 'react-i18next';

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
import { getNpcDisplayName } from '@/utils/npcLabels';
import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { bgmPlay } from '@/utils/audioService';
import { trigger } from '@/utils/hapticService';
import {
  firstSearchParam,
  peekNpcMatchResult,
} from '@/utils/npcMatchResult';

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

function getLossReasonKey(reason: LossReason): string | null {
  switch (reason) {
    case 'early':
      return 'loss.early';
    case 'timeout':
      return 'loss.timeout';
    case 'slower':
      return 'loss.slower';
    default:
      return null;
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
  const { t } = useTranslation();
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
    npcId?: string | string[];
    won?: string | string[];
    playerWins?: string | string[];
    npcWins?: string | string[];
    completionStamp?: string | string[];
    playerMs?: string | string[];
    npcMs?: string | string[];
    lossReason?: string | string[];
    dayNight?: string | string[];
  }>();

  const remembered = peekNpcMatchResult();
  const npcIdStr = firstSearchParam(npcId) ?? remembered?.npcId;
  const wonStr =
    firstSearchParam(won) ??
    (remembered != null ? (remembered.won ? '1' : '0') : undefined);
  const playerWinsStr =
    firstSearchParam(playerWins) ??
    (remembered != null ? String(remembered.playerWins) : undefined);
  const npcWinsStr =
    firstSearchParam(npcWins) ??
    (remembered != null ? String(remembered.npcWins) : undefined);
  const completionStampStr =
    firstSearchParam(completionStamp) ?? remembered?.completionStamp;
  const playerMsStr = firstSearchParam(playerMsParam) ?? remembered?.playerMs;
  const npcMsStr = firstSearchParam(npcMsParam) ?? remembered?.npcMs;
  const lossReasonStr = firstSearchParam(lossReasonParam) ?? remembered?.lossReason ?? '';
  const dayNightStr = firstSearchParam(dayNightParam) ?? remembered?.dayNight;

  const id = Number(npcIdStr);
  const npc = Number.isFinite(id) ? getNpcById(id) : undefined;
  const outcomeKnown = wonStr === '1' || wonStr === '0';
  const victory = wonStr === '1';
  const dayNight = dayNightStr === 'night' ? 'night' : 'day';
  const theme = victory ? OUTCOME_VICTORY : OUTCOME_DEFEAT;

  const playerMsRaw =
    playerMsStr != null && playerMsStr !== '' ? Number(playerMsStr) : NaN;
  const npcMsRaw = npcMsStr != null && npcMsStr !== '' ? Number(npcMsStr) : NaN;
  const playerMs = Number.isFinite(playerMsRaw) ? playerMsRaw : null;
  const npcMs = Number.isFinite(npcMsRaw) ? npcMsRaw : null;
  const lossReason = lossReasonStr as LossReason;
  const faster = whoFaster(playerMs, npcMs);

  const [adFlowComplete] = useState(true);

  const titleScale = useSharedValue(victory ? 0.85 : 1);
  const fxStartedRef = useRef(false);

  useEffect(() => {
    if (!adFlowComplete || !outcomeKnown || !victory) return;
    titleScale.value = 0.85;
    titleScale.value = withSequence(
      withTiming(1.08, {
        duration: 340,
        easing: Easing.out(Easing.back(1.3)),
        reduceMotion: RM_GAME,
      }),
      withTiming(1, { duration: 200, easing: Easing.out(Easing.quad), reduceMotion: RM_GAME }),
    );
  }, [adFlowComplete, outcomeKnown, victory, titleScale]);

  useEffect(() => {
    if (!adFlowComplete || !outcomeKnown) return;
    if (fxStartedRef.current) return;
    fxStartedRef.current = true;
    if (victory) {
      void bgmPlay('result_win');
      void trigger('success');
    } else {
      void bgmPlay('result_lose');
      void trigger('error');
    }
  }, [adFlowComplete, outcomeKnown, victory]);

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
        {showContent && outcomeKnown && victory ? (
          <VictorySparkles width={winW} seed={completionStampStr ?? 'win'} />
        ) : null}

        <View style={[styles.content, !showContent && styles.contentHidden]}>
          {outcomeKnown ? (
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
                {t('result.victory')}
              </Animated.Text>
            ) : (
              <Animated.Text
                entering={FadeInDown.duration(380)}
                style={[styles.title, { fontFamily: FONT_RYE, color: theme.title }]}
              >
                {t('result.defeat')}
              </Animated.Text>
            )}

            {!victory && lossReason ? (
              <Text style={styles.lossReason}>{t(getLossReasonKey(lossReason) ?? '')}</Text>
            ) : victory ? (
              <Text style={styles.winSubtitle}>{t('result.wonDuel')}</Text>
            ) : null}

            {npc ? (
              <View style={styles.opponentRow}>
                <Text style={styles.opponentLabel}>{t('result.opponent')}</Text>
                <Text style={styles.opponentName}>
                  {getNpcDisplayName(t, npc.id)}
                </Text>
              </View>
            ) : null}

            <View style={styles.scorePill}>
              <Text style={styles.scoreLabel}>{t('result.finalScore')}</Text>
              <Text style={[styles.scoreValue, { fontFamily: FONT_RYE }]}>
                {playerWinsStr ?? '0'} — {npcWinsStr ?? '0'}
              </Text>
            </View>

            <ReactionStatsCard playerMs={playerMs} npcMs={npcMs} faster={faster} />

            <View style={styles.btnCol}>
              <WoodButton title={t('result.retry')} onPress={onRetry} style={styles.btn} />
              <WoodButton
                title={t('result.toOpponentSelect')}
                onPress={onNpcSelect}
                style={styles.btnSecondary}
                textStyle={styles.btnSecondaryText}
              />
            </View>
          </Animated.View>
          ) : null}
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
