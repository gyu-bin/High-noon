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
import { Ionicons } from '@expo/vector-icons';
import { FONT_RYE } from '@/constants/fonts';
import { getNpcVisualMeta } from '@/constants/npcVisual';
import { getNpcById, NPCS } from '@/constants/npcs';
import { uiV3Colors } from '@/constants/theme';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { selectPaleRiderUnlocked, useProgressStore } from '@/store/progressStore';
import type { NpcDefinition } from '@/types/npc';
import { getNpcDisplayName } from '@/utils/npcLabels';

const MASTER_LEGEND_GATE_ID = 18;

function CarouselArrow({
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
      <Ionicons name={side === 'left' ? 'chevron-back' : 'chevron-forward'} size={19} color={uiV3Colors.gold} />
    </Pressable>
  );
}

export default function NpcSelectScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const posterHeight = Math.max(448, Math.min(466, height * 0.484));
  const english = i18n.getFixedT('en');
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
    ? t(`npcs.specialAbility.${npc.specialAbility}.desc`).split(/[.!?。]/u)[0]
    : undefined;

  useScreenBgm('menu');
  const select = useCallback(() => {
    if (locked) return;
    router.push({ pathname: '/game/npc', params: { npcId: String(npc.id) } });
  }, [locked, npc.id, router]);
  const back = useCallback(() => router.replace('/menu'), [router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <MetaScreenShell showDust={false} ambience="poster">
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 18 },
            landscape && styles.contentLandscape,
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topbar}>
            <MenuBackButton onPress={back} variant="header" style={styles.back} />
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
            <CarouselArrow npc={previous} hidden={isLocked(previous)} side="left" onPress={() => moveNpc(-1)} />
            <NpcWantedCard
              npc={npc}
              locked={locked}
              masked={maskedLegend}
              name={getNpcDisplayName(t, npc.id)}
              englishName={getNpcDisplayName(english, npc.id)}
              tier={english(`npcs.tier.${npc.tier}`)}
              typeLabel={special ? 'SPECIAL DUEL' : npc.bossFlag ? 'BOSS' : (getNpcVisualMeta(npc.id)?.zone.toUpperCase() ?? '')}
              posterHeight={posterHeight}
              abilityName={abilityName}
              abilityHint={abilityHint}
              duelLabel={t('meta.npc.duel')}
              lockedLabel={t('meta.npc.locked')}
              bossLabel={t('meta.npc.boss')}
              onDuel={select}
              style={[styles.featuredCard, landscape && styles.featuredCardLandscape]}
            />
            <CarouselArrow npc={next} hidden={isLocked(next)} side="right" onPress={() => moveNpc(1)} />
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
  content: { flexGrow: 1, paddingHorizontal: 16, gap: 12 },
  contentLandscape: { paddingHorizontal: 34 },
  topbar: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  back: { position: 'absolute', left: 0, zIndex: 1 },
  heading: { flex: 1, alignItems: 'center' },
  eyebrow: { color: uiV3Colors.gold, fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  title: { color: uiV3Colors.cream, fontFamily: FONT_RYE, fontSize: 22, letterSpacing: 1.2, marginTop: 2 },
  counter: { position: 'absolute', right: 0, bottom: 0, minWidth: 58, color: uiV3Colors.cream, fontSize: 10, fontWeight: '800', textAlign: 'right', opacity: 0.75 },
  posterStage: { flex: 1, minHeight: 448, paddingTop: 24, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: -16 },
  posterStageLandscape: { minHeight: 424, marginHorizontal: 0 },
  featuredCard: { width: '79%', maxWidth: 360 },
  featuredCardLandscape: { width: '60%', maxWidth: 360 },
  peek: { position: 'absolute', top: '50%', marginTop: -16, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: 0.48 },
  peekLeft: { left: 3 },
  peekRight: { right: 3 },
  peekPressed: { opacity: 1 },
  dots: { height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  swipeHint: { color: uiV3Colors.cream, opacity: 0.42, fontSize: 8, fontWeight: '700', letterSpacing: 2 },
});
