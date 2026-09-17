import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import type { PlayerCharacter } from '@/constants/characters';
import { FONT_RYE, FONT_WESTERN_SERIF, usesCjkFont } from '@/constants/fonts';
import { uiV3Colors } from '@/constants/theme';
import { V3_PLAYER_IDENTITIES } from '@/constants/v3UiAssets';

export function CharacterSelector({
  character,
  unlocked,
  selected,
  onPrevious,
  onNext,
  onSelect,
  onLongPress,
  name,
  ability,
  unlockHint,
  selectLabel,
  previousLabel,
  nextLabel,
}: {
  character: PlayerCharacter;
  unlocked: boolean;
  selected: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSelect: () => void;
  onLongPress: () => void;
  name: string;
  ability?: string;
  unlockHint: string;
  selectLabel: string;
  previousLabel: string;
  nextLabel: string;
}) {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const artSize = Math.min(landscape ? height * 0.62 : width * 0.78, 340);
  return (
    <View style={[styles.root, landscape && styles.rootLandscape]}>
      <View style={[styles.artStage, landscape && styles.artStageLandscape]}>
        {unlocked ? (
          <Image source={V3_PLAYER_IDENTITIES[character.id]} contentFit="contain" transition={0} style={{ width: artSize, height: artSize }} />
        ) : (
          <View accessibilityLabel={unlockHint} style={[styles.lockedSilhouette, { width: artSize * 0.58, height: artSize * 0.7 }]}>
            <Text style={styles.question}>?</Text>
            <Ionicons name="lock-closed" size={26} color={uiV3Colors.dustGray} />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <View style={styles.pager}>
          <Pressable accessibilityRole="button" accessibilityLabel={previousLabel} hitSlop={12} onPress={onPrevious} style={styles.arrow}><Ionicons name="chevron-back" size={25} color={uiV3Colors.cream} /></Pressable>
          <Text style={styles.id}>0{character.id}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={nextLabel} hitSlop={12} onPress={onNext} style={styles.arrow}><Ionicons name="chevron-forward" size={25} color={uiV3Colors.cream} /></Pressable>
        </View>
        <Text style={[styles.name, unlocked && usesCjkFont(name) && styles.nameCjk]}>{unlocked ? name : '???'}</Text>
        <Text style={styles.ability}>{unlocked ? (ability || unlockHint) : unlockHint}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={unlocked ? selectLabel : unlockHint}
          accessibilityState={{ disabled: !unlocked, selected }}
          disabled={!unlocked}
          onPress={onSelect}
          onLongPress={onLongPress}
          style={({ pressed }) => [styles.select, selected && styles.selectSelected, !unlocked && styles.selectLocked, pressed && unlocked && styles.selectPressed]}
        >
          <Text style={styles.selectLabel}>{unlocked ? (selected ? `${selectLabel}  ✓` : selectLabel) : unlockHint}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  rootLandscape: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 28 },
  artStage: { alignItems: 'center', justifyContent: 'flex-end', minHeight: 280, width: '100%', overflow: 'hidden' },
  artStageLandscape: { flex: 1, minHeight: 0 },
  halo: { position: 'absolute', width: 190, height: 190, borderRadius: 999, backgroundColor: uiV3Colors.gold, opacity: 0.17, borderWidth: 1, borderColor: uiV3Colors.ochre },
  lockedSilhouette: { alignItems: 'center', justifyContent: 'center', borderBottomWidth: 8, borderBottomColor: uiV3Colors.voidBlack, backgroundColor: uiV3Colors.background, borderRadius: 70, opacity: 0.88 },
  question: { color: uiV3Colors.dustGray, fontFamily: FONT_RYE, fontSize: 70, lineHeight: 75 },
  info: { width: '100%', maxWidth: 390, alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(200, 134, 10, 0.45)', backgroundColor: 'rgba(20, 8, 4, 0.68)' },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  arrow: { width: 42, height: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: uiV3Colors.dustGray, borderRadius: 8, backgroundColor: uiV3Colors.background },
  id: { color: uiV3Colors.gold, fontWeight: '800', letterSpacing: 3, minWidth: 44, textAlign: 'center' },
  name: { color: uiV3Colors.cream, fontFamily: FONT_RYE, fontSize: 25, textAlign: 'center' },
  nameCjk: { fontFamily: FONT_WESTERN_SERIF, fontSize: 23, fontWeight: '700', letterSpacing: 1.1 },
  ability: { color: uiV3Colors.ochre, fontSize: 13, fontWeight: '700', textAlign: 'center', minHeight: 20 },
  stats: { width: '100%', gap: 5, paddingHorizontal: 8, marginVertical: 2 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statLabel: { width: 48, color: uiV3Colors.cream, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  statTrack: { flex: 1, height: 6, backgroundColor: 'rgba(245, 230, 200, 0.18)', overflow: 'hidden' },
  statFill: { height: '100%', backgroundColor: uiV3Colors.gold },
  select: { width: '100%', minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1.5, borderColor: uiV3Colors.gold, backgroundColor: uiV3Colors.westernRed, marginTop: 4 },
  selectSelected: { backgroundColor: uiV3Colors.darkBrown, borderColor: uiV3Colors.ochre },
  selectLocked: { backgroundColor: uiV3Colors.background, borderColor: uiV3Colors.dustGray },
  selectPressed: { transform: [{ translateY: 2 }] },
  selectLabel: { color: uiV3Colors.cream, fontFamily: FONT_RYE, fontSize: 16, textAlign: 'center', paddingHorizontal: 10 },
});
