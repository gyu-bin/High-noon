import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import { NpcWantedCard } from '@/components/npc/NpcWantedCard';
import { MenuBackButton } from '@/components/ui/MenuBackButton';
import { DEV_UNLOCK_ALL_NPCS } from '@/constants/devFlags';
import { FONT_RYE, FONT_WESTERN_SERIF, usesCjkFont } from '@/constants/fonts';
import { getNpcById, NPCS } from '@/constants/npcs';
import { uiV3Colors } from '@/constants/theme';
import { NpcPortrait } from '@/components/npc/NpcPortrait';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { selectPaleRiderUnlocked, useProgressStore } from '@/store/progressStore';
import type { NpcDefinition } from '@/types/npc';
import { formatReactionMs } from '@/utils/formatReactionMs';
import { getNpcDisplayName, getNpcTierLabel } from '@/utils/npcLabels';

const MASTER_LEGEND_GATE_ID = 18;
const wantedPaper = require('@/high_noon_terra_asset_pack/output/ui/textures/wanted_paper.png');

function PosterPeek({
  npc,
  hidden,
  side,
  onPress,
}: {
  npc: NpcDefinition;
  hidden: boolean;
  side: 'left' | 'right';
  onPress: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hidden ? t('meta.npc.locked') : getNpcDisplayName(t, npc.id)}
      onPress={onPress}
      style={({ pressed }) => [styles.peek, side === 'left' ? styles.peekLeft : styles.peekRight, pressed && styles.peekPressed]}
    >
      <Image source={wantedPaper} contentFit="cover" style={StyleSheet.absoluteFillObject} />
      <View style={styles.peekWash} />
      <Text style={styles.peekWanted}>WANTED</Text>
      {hidden ? (
        <View style={styles.peekQuestionWrap}><Text style={styles.peekQuestion}>?</Text></View>
      ) : (
        <NpcPortrait id={npc.id} size={110} />
      )}
      <Text numberOfLines={2} style={[styles.peekName, !hidden && usesCjkFont(getNpcDisplayName(t, npc.id)) && styles.peekNameCjk]}>{hidden ? '???' : getNpcDisplayName(t, npc.id)}</Text>
    </Pressable>
  );
}

export default function NpcSelectScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const highestUnlocked = useProgressStore((s) => s.highestUnlockedNpcId);
  const npcById = useProgressStore((s) => s.npcById);
  const paleUnlocked = useProgressStore(() => selectPaleRiderUnlocked());
  const masterLegendGateCleared = npcById[MASTER_LEGEND_GATE_ID]?.cleared ?? false;
  const [focusedId, setFocusedId] = useState(1);
  const npc = useMemo(() => getNpcById(focusedId) ?? NPCS[0]!, [focusedId]);
  const index = NPCS.findIndex((entry) => entry.id === npc.id);
  const previous = NPCS[(index - 1 + NPCS.length) % NPCS.length]!;
  const next = NPCS[(index + 1) % NPCS.length]!;
  const dragX = useRef(new RNAnimated.Value(0)).current;

  const moveNpc = useCallback((direction: -1 | 1) => {
    setFocusedId((currentId) => {
      const currentIndex = Math.max(0, NPCS.findIndex((entry) => entry.id === currentId));
      return NPCS[(currentIndex + direction + NPCS.length) % NPCS.length]!.id;
    });
  }, []);

  const swipeResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => (
      Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.25
    ),
    onPanResponderMove: (_, gesture) => dragX.setValue(gesture.dx * 0.55),
    onPanResponderRelease: (_, gesture) => {
      const shouldMove = Math.abs(gesture.dx) > 42 || Math.abs(gesture.vx) > 0.45;
      if (!shouldMove) {
        RNAnimated.spring(dragX, { toValue: 0, useNativeDriver: true }).start();
        return;
      }
      RNAnimated.timing(dragX, {
        toValue: gesture.dx < 0 ? -width * 0.18 : width * 0.18,
        duration: 110,
        useNativeDriver: true,
      }).start(() => {
        moveNpc(gesture.dx < 0 ? 1 : -1);
        dragX.setValue(0);
      });
    },
    onPanResponderTerminate: () => {
      RNAnimated.spring(dragX, { toValue: 0, useNativeDriver: true }).start();
    },
  }), [dragX, moveNpc, width]);

  const isMasked = useCallback((entry: NpcDefinition) => (
    entry.id >= 19 && entry.id <= 21 && !DEV_UNLOCK_ALL_NPCS && !masterLegendGateCleared
  ), [masterLegendGateCleared]);
  const isLocked = useCallback((entry: NpcDefinition) => (
    !DEV_UNLOCK_ALL_NPCS && (entry.id === 22 ? !paleUnlocked : entry.id > highestUnlocked || isMasked(entry))
  ), [highestUnlocked, isMasked, paleUnlocked]);

  const maskedLegend = isMasked(npc);
  const locked = isLocked(npc);
  const special = npc.specialAbility !== 'none';
  const abilityName = special ? t(`npcs.specialAbility.${npc.specialAbility}.name`) : undefined;
  const abilityHint = special
    ? t(`npcs.specialAbility.${npc.specialAbility}.desc`)
    : t('meta.npc.reaction', { ms: formatReactionMs(npc.reactionMs) });

  useScreenBgm('menu');
  const select = useCallback(() => {
    if (locked) return;
    router.push({ pathname: '/game/npc', params: { npcId: String(npc.id) } });
  }, [locked, npc.id, router]);
  const back = useCallback(() => router.replace('/menu'), [router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <MetaScreenShell showDust={false}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 18 },
            landscape && styles.contentLandscape,
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topbar}>
            <MenuBackButton onPress={back} variant="overlay" />
            <View style={styles.heading}>
              <Text style={styles.eyebrow}>CHOOSE YOUR</Text>
              <Text style={styles.title}>OPPONENT</Text>
            </View>
            <Text style={styles.counter}>{String(npc.id).padStart(2, '0')} / {NPCS.length}</Text>
          </View>

          <RNAnimated.View
            {...swipeResponder.panHandlers}
            style={[
              styles.posterStage,
              landscape && styles.posterStageLandscape,
              { transform: [{ translateX: dragX }] },
            ]}
          >
            <PosterPeek npc={previous} hidden={isLocked(previous)} side="left" onPress={() => moveNpc(-1)} />
            <NpcWantedCard
              npc={npc}
              locked={locked}
              masked={maskedLegend}
              name={getNpcDisplayName(t, npc.id)}
              tier={getNpcTierLabel(t, npc.tier)}
              abilityName={abilityName}
              abilityHint={abilityHint}
              duelLabel={t('meta.npc.duel')}
              wantedLabel={t('meta.npc.wanted')}
              specialLabel={t('meta.npc.special')}
              lockedLabel={t('meta.npc.locked')}
              bossLabel={t('meta.npc.boss')}
              onDuel={select}
              style={[styles.featuredCard, landscape && styles.featuredCardLandscape]}
            />
            <PosterPeek npc={next} hidden={isLocked(next)} side="right" onPress={() => moveNpc(1)} />
          </RNAnimated.View>

          <View style={styles.dots}>
            <Text style={styles.swipeHint}>SWIPE TO BROWSE</Text>
          </View>
        </ScrollView>
      </MetaScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 12, gap: 14 },
  contentLandscape: { paddingHorizontal: 34 },
  topbar: { minHeight: 78, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  heading: { flex: 1, alignItems: 'center' },
  eyebrow: { color: uiV3Colors.gold, fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  title: { color: uiV3Colors.cream, fontFamily: FONT_RYE, fontSize: 25, letterSpacing: 1.2, marginTop: 2 },
  counter: { minWidth: 58, color: uiV3Colors.cream, fontSize: 10, fontWeight: '800', textAlign: 'right', opacity: 0.75 },
  posterStage: { flex: 1, minHeight: 530, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden', marginHorizontal: -12 },
  posterStageLandscape: { minHeight: 410, marginHorizontal: 0, gap: 14 },
  featuredCard: { width: '68%', minHeight: 500, maxWidth: 330 },
  featuredCardLandscape: { width: '42%', minHeight: 390, maxWidth: 390 },
  peek: { width: '22%', minWidth: 72, maxWidth: 180, height: 330, overflow: 'hidden', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 5, borderWidth: 1, borderColor: 'rgba(200, 134, 10, 0.72)', opacity: 0.7, transform: [{ scale: 0.9 }] },
  peekLeft: { marginLeft: -16 },
  peekRight: { marginRight: -16 },
  peekPressed: { opacity: 1, transform: [{ scale: 0.94 }] },
  peekWash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(245, 230, 200, 0.08)' },
  peekWanted: { color: uiV3Colors.westernRed, fontFamily: FONT_RYE, fontSize: 11, letterSpacing: 1 },
  peekArt: { width: '145%', height: 205 },
  peekQuestionWrap: { height: 205, justifyContent: 'center' },
  peekQuestion: { color: uiV3Colors.darkBrown, fontFamily: FONT_RYE, fontSize: 54 },
  peekName: { color: uiV3Colors.darkBrown, fontFamily: FONT_RYE, fontSize: 10, textAlign: 'center' },
  peekNameCjk: { fontFamily: FONT_WESTERN_SERIF, fontSize: 9, fontWeight: '700', letterSpacing: 0.2 },
  dots: { height: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  swipeHint: { color: uiV3Colors.dustGray, fontSize: 9, fontWeight: '800', letterSpacing: 1.6 },
});
