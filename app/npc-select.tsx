import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { NpcPortrait } from '@/components/npc/NpcPortrait';
import { MenuBackButton } from '@/components/ui/MenuBackButton';
import { DEV_UNLOCK_ALL_NPCS } from '@/constants/devFlags';
import { CAPTURE_ROUTES_ENABLED } from '@/constants/captureRoutes';
import { Ionicons } from '@expo/vector-icons';
import { FONT_RYE } from '@/constants/fonts';
import { getNpcVisualMeta } from '@/constants/npcVisual';
import { getNpcById, NPCS } from '@/constants/npcs';
import { uiV3Colors } from '@/constants/theme';
import { V3_PALE_LOCKED_SILHOUETTE } from '@/constants/v3UiAssets';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { selectPaleRiderUnlocked, useProgressStore } from '@/store/progressStore';
import type { NpcDefinition } from '@/types/npc';
import { getNpcDisplayName } from '@/utils/npcLabels';
import { boundedNpcIndex, centeredNpcIndices } from '@/utils/npcCarousel';

const MASTER_LEGEND_GATE_ID = 18;

function CarouselArrow({
  npc,
  hidden,
  disabled,
  side,
  onPress,
}: {
  npc?: NpcDefinition;
  hidden: boolean;
  disabled: boolean;
  side: 'left' | 'right';
  onPress: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={npc == null ? t('meta.npc.navigator') : hidden ? t('meta.npc.locked') : getNpcDisplayName(t, npc.id)}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.peek, side === 'left' ? styles.peekLeft : styles.peekRight, disabled && styles.peekDisabled, pressed && styles.peekPressed]}
    >
      <Ionicons name={side === 'left' ? 'chevron-back' : 'chevron-forward'} size={19} color={uiV3Colors.gold} />
    </Pressable>
  );
}

export default function NpcSelectScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ captureNpc?: string }>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const posterHeight = Math.max(420, Math.min(452, height * 0.48));
  const english = i18n.getFixedT('en');
  const highestUnlocked = useProgressStore((s) => s.highestUnlockedNpcId);
  const npcById = useProgressStore((s) => s.npcById);
  const paleUnlocked = useProgressStore(() => selectPaleRiderUnlocked());
  const masterLegendGateCleared = npcById[MASTER_LEGEND_GATE_ID]?.cleared ?? false;
  const [focusedId, setFocusedId] = useState(() => {
    const requestedId = CAPTURE_ROUTES_ENABLED ? Number(params.captureNpc) : NaN;
    return Number.isInteger(requestedId) && getNpcById(requestedId) ? requestedId : 1;
  });
  useEffect(() => {
    if (!CAPTURE_ROUTES_ENABLED) return;
    const requestedId = Number(params.captureNpc);
    if (Number.isInteger(requestedId) && getNpcById(requestedId)) setFocusedId(requestedId);
  }, [params.captureNpc]);
  const npc = useMemo(() => getNpcById(focusedId) ?? NPCS[0]!, [focusedId]);
  const index = NPCS.findIndex((entry) => entry.id === npc.id);
  const previous = index > 0 ? NPCS[index - 1] : undefined;
  const next = index < NPCS.length - 1 ? NPCS[index + 1] : undefined;
  const dragX = useRef(new RNAnimated.Value(0)).current;

  const moveNpc = useCallback((direction: -1 | 1) => {
    setFocusedId((currentId) => {
      const currentIndex = Math.max(0, NPCS.findIndex((entry) => entry.id === currentId));
      return NPCS[boundedNpcIndex(currentIndex, direction, NPCS.length)]!.id;
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
      const direction = gesture.dx < 0 ? 1 : -1;
      const canMove = direction < 0 ? index > 0 : index < NPCS.length - 1;
      if (!canMove) {
        RNAnimated.spring(dragX, { toValue: 0, useNativeDriver: true }).start();
        return;
      }
      RNAnimated.timing(dragX, {
        toValue: gesture.dx < 0 ? -width * 0.18 : width * 0.18,
        duration: 110,
        useNativeDriver: true,
      }).start(() => {
        moveNpc(direction);
        dragX.setValue(0);
      });
    },
    onPanResponderTerminate: () => {
      RNAnimated.spring(dragX, { toValue: 0, useNativeDriver: true }).start();
    },
  }), [dragX, index, moveNpc, width]);

  const isMasked = useCallback((entry: NpcDefinition) => (
    entry.id >= 19 && entry.id <= 21 && !DEV_UNLOCK_ALL_NPCS && !masterLegendGateCleared
  ), [masterLegendGateCleared]);
  const isLocked = useCallback((entry: NpcDefinition) => (
    !DEV_UNLOCK_ALL_NPCS && (entry.id === 22 ? !paleUnlocked : entry.id > highestUnlocked || isMasked(entry))
  ), [highestUnlocked, isMasked, paleUnlocked]);
  const carouselNpcs = useMemo(() => (
    centeredNpcIndices(index, NPCS.length).map((npcIndex, slot) => ({
      offset: slot - 2,
      npc: npcIndex == null ? null : NPCS[npcIndex]!,
    }))
  ), [index]);

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
  const back = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/menu');
  }, [router]);

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
              <Text style={styles.eyebrow}>{t('meta.npc.subtitle')}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.title}>{t('meta.npc.title')}</Text>
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
            <CarouselArrow npc={previous} hidden={previous ? isLocked(previous) : false} disabled={!previous} side="left" onPress={() => moveNpc(-1)} />
            <NpcWantedCard
              npc={npc}
              locked={locked}
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
            <CarouselArrow npc={next} hidden={next ? isLocked(next) : false} disabled={!next} side="right" onPress={() => moveNpc(1)} />
          </RNAnimated.View>

          <View accessibilityRole="tablist" accessibilityLabel={t('meta.npc.navigator')} style={styles.carousel}>
            {carouselNpcs.map(({ npc: item, offset }) => {
              if (item == null) return <View key={`empty:${offset}`} style={styles.thumbPlaceholder} />;
              const itemLocked = isLocked(item);
              const selected = offset === 0;
              return (
                <Pressable
                  key={`${item.id}:${offset}`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  accessibilityLabel={itemLocked ? t('meta.npc.locked') : getNpcDisplayName(t, item.id)}
                  onPress={() => setFocusedId(item.id)}
                  style={({ pressed }) => [
                    styles.thumb,
                    selected && styles.thumbSelected,
                    pressed && styles.thumbPressed,
                  ]}
                >
                  {itemLocked && item.id === 22
                    ? <Image source={V3_PALE_LOCKED_SILHOUETTE} contentFit="contain" style={styles.thumbArt} />
                    : <NpcPortrait id={item.id} size={selected ? 62 : 48} />}
                  {itemLocked ? <View pointerEvents="none" style={styles.thumbLockBadge}><Ionicons name="lock-closed" color={uiV3Colors.cream} size={9} /></View> : null}
                  <Text style={[styles.thumbNumber, selected && styles.thumbNumberSelected]}>
                    {String(item.id).padStart(2, '0')}
                  </Text>
                </Pressable>
              );
            })}
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
  posterStage: { flex: 1, minHeight: 420, paddingTop: 12, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: -16 },
  posterStageLandscape: { minHeight: 424, marginHorizontal: 0 },
  featuredCard: { width: '79%', maxWidth: 360 },
  featuredCardLandscape: { width: '60%', maxWidth: 360 },
  peek: { position: 'absolute', top: '50%', marginTop: -16, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: 0.48 },
  peekLeft: { left: 3 },
  peekRight: { right: 3 },
  peekDisabled: { opacity: 0.12 },
  peekPressed: { opacity: 1 },
  carousel: { height: 78, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 6 },
  thumb: { width: 52, height: 62, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end', borderWidth: 1, borderColor: 'rgba(201,166,107,0.28)', backgroundColor: 'rgba(18,10,6,0.72)', opacity: 0.68 },
  thumbSelected: { width: 64, height: 76, borderWidth: 2, borderColor: uiV3Colors.gold, backgroundColor: 'rgba(45,25,12,0.92)', opacity: 1 },
  thumbPlaceholder: { width: 52, height: 62 },
  thumbPressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },
  thumbArt: { position: 'absolute', top: 1, width: '100%', height: '84%' },
  thumbLockBadge: { position: 'absolute', top: 3, right: 3, width: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(30,16,8,0.82)', borderWidth: 1, borderColor: 'rgba(201,166,107,0.62)' },
  thumbNumber: { width: '100%', paddingVertical: 2, color: uiV3Colors.cream, backgroundColor: 'rgba(8,4,2,0.72)', fontSize: 8, fontWeight: '800', textAlign: 'center', letterSpacing: 1 },
  thumbNumberSelected: { color: uiV3Colors.gold },
});
