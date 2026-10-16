import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { OutcomeBackdrop } from '@/components/result/OutcomeBackdrop';
import { ReactionStatsCard } from '@/components/result/ReactionStatsCard';
import { DuelResultFaceoff } from '@/components/result/DuelResultFaceoff';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhoneStageShell } from '@/components/layout/PhoneStageShell';
import { WoodButton } from '@/components/ui/WoodButton';
import {
  OUTCOME_DEFEAT,
  OUTCOME_VICTORY,
  outcomeTextShadow,
} from '@/constants/outcomeTheme';
import { RM_GAME } from '@/constants/reanimatedGame';
import { colors } from '@/constants/theme';
import { FONT_RYE, FONT_WESTERN_SERIF } from '@/constants/fonts';
import { getNpcById } from '@/constants/npcs';
import { getNpcDisplayName } from '@/utils/npcLabels';
import { DUEL_BACKGROUND_IDS, type DuelBackgroundId } from '@/utils/duelBackgroundSelection';
import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { useProgressStore } from '@/store/progressStore';
import { useSettingsStore } from '@/store/settingsStore';
import { bgmPlay } from '@/utils/audioService';
import { trigger } from '@/utils/hapticService';
import {
  firstSearchParam,
  peekNpcMatchResult,
} from '@/utils/npcMatchResult';

type LossReason = 'early' | 'timeout' | 'slower' | '';

function getLossReasonKey(reason: LossReason, npcMs: number | null): string | null {
  switch (reason) {
    case 'early':
      return 'loss.early';
    case 'timeout':
      // A 'timeout' with an NPC shot means the NPC fired before the player tapped.
      return npcMs != null ? 'loss.shotFirst' : 'loss.timeout';
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
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const heroHeight = Math.max(180, Math.min(320, winH * 0.33));
  const {
    npcId,
    won,
    playerWins,
    npcWins,
    playerMs: playerMsParam,
    npcMs: npcMsParam,
    lossReason: lossReasonParam,
    dayNight: dayNightParam,
    backgroundId: backgroundIdParam,
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
    backgroundId?: string | string[];
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
  const playerMsStr = firstSearchParam(playerMsParam) ?? remembered?.playerMs;
  const npcMsStr = firstSearchParam(npcMsParam) ?? remembered?.npcMs;
  const lossReasonStr = firstSearchParam(lossReasonParam) ?? remembered?.lossReason ?? '';
  const dayNightStr = firstSearchParam(dayNightParam) ?? remembered?.dayNight;
  const backgroundIdStr = firstSearchParam(backgroundIdParam) ?? remembered?.backgroundId;

  const id = Number(npcIdStr);
  const npc = Number.isFinite(id) ? getNpcById(id) : undefined;
  const outcomeKnown = wonStr === '1' || wonStr === '0';
  const victory = wonStr === '1';
  const dayNight = dayNightStr === 'night' ? 'night' : 'day';
  const backgroundId = DUEL_BACKGROUND_IDS.includes(backgroundIdStr as DuelBackgroundId)
    ? backgroundIdStr as DuelBackgroundId
    : undefined;
  const theme = victory ? OUTCOME_VICTORY : OUTCOME_DEFEAT;
  const highestUnlocked = useProgressStore((s) => s.highestUnlockedNpcId);
  const selectedCharacterId = useSettingsStore((s) => s.selectedCharacterId);

  const nextNpc = useMemo(() => {
    if (!victory || !Number.isFinite(id)) return null;
    const nextId = id + 1;
    const candidate = getNpcById(nextId);
    if (!candidate || nextId > highestUnlocked) return null;
    return candidate;
  }, [highestUnlocked, id, victory]);

  const playerMsRaw =
    playerMsStr != null && playerMsStr !== '' ? Number(playerMsStr) : NaN;
  const npcMsRaw = npcMsStr != null && npcMsStr !== '' ? Number(npcMsStr) : NaN;
  const playerMs = lossReasonStr === 'early' || lossReasonStr === 'timeout'
    ? null
    : Number.isFinite(playerMsRaw) && playerMsRaw >= 0 ? playerMsRaw : null;
  const npcMs = Number.isFinite(npcMsRaw) && npcMsRaw >= 0 ? npcMsRaw : null;
  const lossReason = lossReasonStr as LossReason;
  const faster = lossReason === 'early' || lossReason === 'timeout' ? 'unknown' : whoFaster(playerMs, npcMs);


  const titleScale = useSharedValue(victory && !reducedMotion ? 0.85 : 1);
  const fxStartedRef = useRef(false);

  useEffect(() => {
    if (reducedMotion) { titleScale.value = 1; return; }
    if (!outcomeKnown || !victory) return;
    titleScale.value = 0.85;
    titleScale.value = withSequence(
      withTiming(1.08, {
        duration: 340,
        easing: Easing.out(Easing.back(1.3)),
        reduceMotion: RM_GAME,
      }),
      withTiming(1, { duration: 200, easing: Easing.out(Easing.quad), reduceMotion: RM_GAME }),
    );
  }, [outcomeKnown, victory, titleScale, reducedMotion]);

  useEffect(() => {
    if (!outcomeKnown) return;
    if (fxStartedRef.current) return;
    fxStartedRef.current = true;
    if (victory) {
      void bgmPlay('result_win');
      void trigger('success');
    } else {
      void bgmPlay('result_lose');
      void trigger('error');
    }
  }, [outcomeKnown, victory]);

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

  const onNextNpc = useCallback(() => {
    if (!nextNpc) return;
    router.replace({
      pathname: '/game/npc',
      params: { npcId: String(nextNpc.id) },
    } as Href);
  }, [nextNpc, router]);

  const onNpcSelect = useCallback(() => {
    // The result replaced the duel above NPC select: pop back to it.
    router.dismissTo('/npc-select');
  }, [router]);


  return (
    <PhoneStageShell edgeToEdge>
      <OutcomeBackdrop variant={dayNight} backgroundId={backgroundId} width={winW} height={winH}>
        <LinearGradient pointerEvents="none" colors={['rgba(12,7,5,.25)', 'rgba(12,7,5,.12)', 'rgba(12,7,5,.94)']} style={StyleSheet.absoluteFill} />
        {outcomeKnown ? <ScrollView showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: Math.max(18, insets.bottom) }]}>
          <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(180)} style={styles.header}>
            <Text style={styles.eyebrow}>— DUEL RESULT —</Text>
            <Animated.Text accessibilityRole="header" style={[styles.title, { color: theme.title }, titleAnimatedStyle]}>
              {victory ? 'YOU WIN' : 'DEFEAT'}
            </Animated.Text>
            <Text style={styles.subtitle}>{victory ? t('result.wonDuel') : t(getLossReasonKey(lossReason, npcMs) ?? 'result.lostDuel')}</Text>
          </Animated.View>
          <View style={styles.hero}>
            <DuelResultFaceoff playerId={selectedCharacterId} npcId={npc?.id ?? 1}
              playerWon={victory} width={Math.min(winW - 44, 430)} height={heroHeight} />
          </View>
          <View style={styles.details}>
            <View style={styles.scoreboard}>
              <Text style={styles.scoreLabel}>{t('result.finalScore')}</Text>
              <View style={styles.scoreRow}>
                <View style={styles.scoreSide}><Text numberOfLines={1} style={styles.name}>{t('result.me')}</Text><Text style={[styles.scoreValue, victory && styles.gold]}>{playerWinsStr ?? '0'}</Text></View>
                <Text style={styles.scoreDash}>—</Text>
                <View style={styles.scoreSide}><Text numberOfLines={1} style={styles.name}>{npc ? getNpcDisplayName(t, npc.id) : 'NPC'}</Text><Text style={[styles.scoreValue, !victory && styles.gold]}>{npcWinsStr ?? '0'}</Text></View>
              </View>
            </View>
            <ReactionStatsCard playerMs={playerMs} npcMs={npcMs} faster={faster} />
            <View style={styles.btnCol}>
              <WoodButton title={nextNpc ? t('result.nextNpc', { name: getNpcDisplayName(t, nextNpc.id) }) : t('result.retry')}
                onPress={nextNpc ? onNextNpc : onRetry} style={styles.btn} />
              <WoodButton title={t('result.toOpponentSelect')} onPress={onNpcSelect}
                style={styles.btnSecondary} textStyle={styles.btnSecondaryText} />
            </View>
          </View>
        </ScrollView> : null}
      </OutcomeBackdrop>
    </PhoneStageShell>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  header: { alignItems: 'center', gap: 6, width: '100%' },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 3, color: '#D7B57B' },
  title: { fontFamily: FONT_RYE, fontSize: 42, letterSpacing: 2, textAlign: 'center', ...outcomeTextShadow },
  subtitle: { fontFamily: FONT_WESTERN_SERIF, color: colors.cream, fontSize: 14, textAlign: 'center', ...outcomeTextShadow },
  hero: { alignItems: 'center', marginTop: 8, marginBottom: 14 },
  details: { width: '100%', maxWidth: 430, gap: 10 },
  scoreboard: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(212,165,116,.34)', paddingVertical: 9, backgroundColor: 'rgba(17,9,5,.72)' },
  scoreLabel: { color: colors.sand, textAlign: 'center', fontSize: 10, fontWeight: '700', letterSpacing: 1.6 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  scoreSide: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 8 },
  name: { color: colors.cream, fontSize: 11, fontWeight: '700' },
  scoreValue: { fontFamily: FONT_RYE, fontSize: 30, color: '#BAA48C' },
  scoreDash: { color: '#876746', fontSize: 22 },
  gold: { color: OUTCOME_VICTORY.title },
  btnCol: { gap: 8, marginTop: 2 },
  btn: { paddingVertical: 12 },
  btnSecondary: { paddingVertical: 11, backgroundColor: 'rgba(28,16,8,.85)', borderColor: 'rgba(212,165,116,.4)' },
  btnSecondaryText: { color: colors.cream, fontSize: 14 },
});
