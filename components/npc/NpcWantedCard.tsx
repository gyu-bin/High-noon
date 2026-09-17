import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';

import { FONT_RYE, FONT_WESTERN_SERIF, usesCjkFont } from '@/constants/fonts';
import { uiV3Colors } from '@/constants/theme';
import { V3_PALE_LOCKED_SILHOUETTE } from '@/constants/v3UiAssets';
import { NpcPortrait } from '@/components/npc/NpcPortrait';
import type { NpcDefinition } from '@/types/npc';

const wantedPaper = require('@/high_noon_terra_asset_pack/output/ui/textures/wanted_paper.png');

export function NpcWantedCard({
  npc,
  locked,
  masked,
  name,
  tier,
  abilityName,
  abilityHint,
  duelLabel,
  wantedLabel,
  specialLabel,
  lockedLabel,
  bossLabel,
  onDuel,
  style,
}: {
  npc: NpcDefinition;
  locked: boolean;
  masked: boolean;
  name: string;
  tier: string;
  abilityName?: string;
  abilityHint?: string;
  duelLabel: string;
  wantedLabel: string;
  specialLabel: string;
  lockedLabel: string;
  bossLabel: string;
  onDuel: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const artSize = Math.min(landscape ? height * 0.5 : width * 0.52, 270);
  const hidden = locked || masked;
  const isPale = npc.id === 22;
  return (
    <View style={[styles.card, landscape && styles.cardLandscape, style]}>
      <Image source={wantedPaper} contentFit="cover" style={styles.paper} />
      <View style={styles.wash} />
      <View style={styles.topline}>
        <Text style={styles.wanted}>{wantedLabel}</Text>
        {npc.bossFlag ? <Ionicons name="skull-outline" color={uiV3Colors.westernRed} size={19} accessibilityLabel={bossLabel} /> : null}
      </View>
      {npc.specialAbility !== 'none' && !hidden ? <Text style={styles.special}>{specialLabel}</Text> : null}
      <View style={styles.artWrap}>
        {hidden ? (
          isPale ? <Image source={V3_PALE_LOCKED_SILHOUETTE} contentFit="contain" style={{ width: artSize, height: artSize }} /> : <View style={[styles.genericLocked, { width: artSize * 0.62, height: artSize * 0.72 }]}><Text style={styles.genericQuestion}>?</Text></View>
        ) : (
          <NpcPortrait id={npc.id} size={artSize} />
        )}
        {hidden ? <View style={styles.lockBadge}><Ionicons name="lock-closed" size={16} color={uiV3Colors.cream} /></View> : null}
      </View>
      <Text style={[styles.name, !hidden && usesCjkFont(name) && styles.nameCjk]}>{hidden ? '???' : name}</Text>
      <View style={styles.tier}><Text style={styles.tierText}>{hidden ? '???' : tier}</Text></View>
      {!hidden && abilityName ? <Text style={styles.ability}>{abilityName}</Text> : null}
      <Text style={styles.hint} numberOfLines={2}>{hidden ? '???' : abilityHint}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={hidden ? lockedLabel : duelLabel} accessibilityState={{ disabled: hidden }} disabled={hidden} onPress={onDuel} style={({ pressed }) => [styles.duel, hidden && styles.duelLocked, pressed && !hidden && styles.duelPressed]}>
        <Text style={styles.duelLabel}>{hidden ? lockedLabel : duelLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', maxWidth: 460, minHeight: 420, alignSelf: 'center', overflow: 'hidden', borderRadius: 4, borderWidth: 2, borderColor: uiV3Colors.ochre, padding: 16, justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.48, shadowRadius: 10, elevation: 8 },
  cardLandscape: { minHeight: 0, flex: 1, maxWidth: 620, paddingVertical: 14 },
  paper: { ...StyleSheet.absoluteFillObject, opacity: 0.98 },
  wash: { ...StyleSheet.absoluteFillObject, backgroundColor: uiV3Colors.cream, opacity: 0.08 },
  topline: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  wanted: { color: uiV3Colors.westernRed, fontFamily: FONT_RYE, fontSize: 30, letterSpacing: 2 },
  special: { color: uiV3Colors.darkBrown, fontSize: 10, textAlign: 'center', fontWeight: '900', letterSpacing: 2, marginTop: 2 },
  artWrap: { alignItems: 'center', justifyContent: 'center', minHeight: 205, marginVertical: 2 },
  genericLocked: { alignItems: 'center', justifyContent: 'center', backgroundColor: uiV3Colors.voidBlack, borderRadius: 90, borderBottomWidth: 8, borderBottomColor: uiV3Colors.darkBrown },
  genericQuestion: { color: uiV3Colors.dustGray, fontFamily: FONT_RYE, fontSize: 72 },
  lockBadge: { position: 'absolute', right: '22%', bottom: 12, padding: 7, borderRadius: 20, backgroundColor: uiV3Colors.voidBlack, borderWidth: 1, borderColor: uiV3Colors.hiddenRed },
  name: { color: uiV3Colors.darkBrown, fontFamily: FONT_RYE, fontSize: 26, textAlign: 'center' },
  nameCjk: { fontFamily: FONT_WESTERN_SERIF, fontSize: 24, fontWeight: '700', letterSpacing: 1.2, textShadowColor: 'rgba(92,45,19,0.18)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  tier: { alignSelf: 'center', backgroundColor: uiV3Colors.darkBrown, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6 },
  tierText: { color: uiV3Colors.cream, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  ability: { color: uiV3Colors.westernRed, fontSize: 12, fontWeight: '900', letterSpacing: 1.4, textAlign: 'center', marginTop: 9 },
  hint: { color: uiV3Colors.darkBrown, fontSize: 12, lineHeight: 17, fontWeight: '600', textAlign: 'center', minHeight: 34, marginTop: 5 },
  duel: { marginTop: 10, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 3, backgroundColor: '#382315', borderWidth: 1.5, borderColor: uiV3Colors.gold },
  duelLocked: { backgroundColor: uiV3Colors.darkBrown, borderColor: uiV3Colors.dustGray, opacity: 0.75 },
  duelPressed: { transform: [{ translateY: 2 }] },
  duelLabel: { color: uiV3Colors.cream, fontFamily: FONT_RYE, fontSize: 16 },
});
