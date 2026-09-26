import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PixelRatio, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { FONT_RYE, FONT_WESTERN_SERIF, usesCjkFont } from '@/constants/fonts';
import { V3_PALE_LOCKED_SILHOUETTE } from '@/constants/v3UiAssets';
import { WesternButton } from '@/components/ui/western/WesternPrimitives';
import { NpcPortrait } from '@/components/npc/NpcPortrait';
import type { NpcDefinition } from '@/types/npc';
import { formatReactionMs } from '@/utils/formatReactionMs';

const wantedPaper = require('@/assets/images/ui/western/ui_wanted_paper.png');

export function NpcWantedCard({
  npc, locked, masked, name, englishName, tier, typeLabel, abilityName, abilityHint,
  duelLabel, lockedLabel, bossLabel, posterHeight, onDuel, style,
}: {
  npc: NpcDefinition;
  locked: boolean;
  masked: boolean;
  name: string;
  englishName?: string;
  tier: string;
  typeLabel: string;
  abilityName?: string;
  abilityHint?: string;
  duelLabel: string;
  lockedLabel: string;
  bossLabel: string;
  posterHeight: number;
  onDuel: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  // A 256pt canvas is 1.50x the previous 512px / 3pt canvas on iPhone.
  // Reserve the same hero area for normal, boss and special identities.
  const artSize = PixelRatio.roundToNearestPixel(Math.min(256, posterHeight - 192));
  const artSlot = Math.min(270, posterHeight - 190);
  const hidden = locked || masked;
  const isPale = npc.id === 22;
  return (
    <View style={[styles.frame, { height: posterHeight }, style]}>
      <View style={styles.card}>
        <Image source={wantedPaper} contentFit="cover" style={styles.paper} />
        <View pointerEvents="none" style={styles.wash} />
        <LinearGradient pointerEvents="none" colors={['rgba(83,42,16,0.18)', 'transparent', 'rgba(83,42,16,0.22)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={styles.paperEdge} />

        <View style={styles.header}>
          <Text style={styles.wanted}>WANTED</Text>
          <View style={styles.ornament}><View style={styles.rule} /><Text style={styles.diamond}>◆</Text><View style={styles.rule} /></View>
        </View>

        <View style={[styles.artWrap, { height: artSlot }]}>
          {hidden ? (
            isPale ? <Image source={V3_PALE_LOCKED_SILHOUETTE} contentFit="contain" style={{ width: artSize, height: artSize, maxWidth: '100%' }} /> : <View style={[styles.genericLocked, { width: artSize * 0.62, height: artSize * 0.84 }]}><Text style={styles.genericQuestion}>?</Text></View>
          ) : <NpcPortrait id={npc.id} size={artSize} />}
        </View>

        <View style={styles.identity}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.name, !hidden && usesCjkFont(name) && styles.nameCjk]}>{hidden ? '???' : name}</Text>
          {!hidden && englishName && englishName.toLowerCase() !== name.toLowerCase() ? <Text numberOfLines={1} style={styles.englishName}>{englishName.toUpperCase()}</Text> : null}
        </View>

        <View style={styles.classification}>
          {!hidden && npc.bossFlag ? <Ionicons name="skull-outline" color="#704127" size={11} accessibilityLabel={bossLabel} /> : <Text style={styles.tierAccent}>◆</Text>}
          <Text style={styles.tierText}>{hidden ? '???' : `${tier} · ${typeLabel}`}</Text>
        </View>

        <View style={styles.details}>
          <Text style={styles.reactionLabel}>REACTION</Text>
          <Text style={styles.reaction}>{hidden ? '—' : formatReactionMs(npc.reactionMs)}{!hidden ? <Text style={styles.unit}> ms</Text> : null}</Text>
        </View>

        <View style={styles.description}>
          {!hidden && abilityName ? <Text numberOfLines={1} style={styles.hint}><Text style={styles.ability}>{abilityName}</Text>{abilityHint ? ` · ${abilityHint}` : ''}</Text> : null}
        </View>

        <WesternButton title={hidden ? lockedLabel : duelLabel} disabled={hidden}
          onPress={onDuel} style={styles.duel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignSelf: 'center', shadowColor: '#170B04', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.55, shadowRadius: 14, elevation: 8 },
  card: { flex: 1, overflow: 'hidden', borderRadius: 2, borderWidth: 1, borderColor: '#73502F', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#BB945F', alignItems: 'center', justifyContent: 'space-between' },
  paper: { ...StyleSheet.absoluteFillObject, opacity: 0.74 },
  wash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(98,55,22,0.13)' },
  paperEdge: { ...StyleSheet.absoluteFillObject, borderWidth: 4, borderColor: 'rgba(83,42,16,0.16)' },
  header: { alignItems: 'center', gap: 2 },
  wanted: { color: '#6A291C', fontFamily: FONT_RYE, fontSize: 19, lineHeight: 23, letterSpacing: 2.5 },
  ornament: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 94 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: '#694224', flex: 1, opacity: 0.6 },
  diamond: { color: '#694224', fontSize: 5, lineHeight: 4 },
  artWrap: { alignItems: 'center', justifyContent: 'center', width: '100%' },
  genericLocked: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#221811', borderRadius: 70 },
  genericQuestion: { color: '#937755', fontFamily: FONT_RYE, fontSize: 48 },
  identity: { alignItems: 'center', width: '100%', gap: 2 },
  name: { color: '#302015', fontFamily: FONT_RYE, fontSize: 21, lineHeight: 28, textAlign: 'center' },
  nameCjk: { fontFamily: FONT_WESTERN_SERIF, fontSize: 23, fontWeight: '700', letterSpacing: 0.4 },
  englishName: { color: '#63442C', fontSize: 8, lineHeight: 10, fontWeight: '700', letterSpacing: 1.6, textAlign: 'center' },
  classification: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 13 },
  tierAccent: { color: '#89612F', fontSize: 8 },
  tierText: { color: '#644027', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  details: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  reactionLabel: { color: '#725135', fontSize: 7, lineHeight: 10, letterSpacing: 1.7, fontWeight: '700' },
  reaction: { color: '#422B1A', fontSize: 17, lineHeight: 21, fontWeight: '700', fontVariant: ['tabular-nums'] },
  unit: { fontSize: 10, fontWeight: '500' },
  description: { alignItems: 'center', justifyContent: 'center', minHeight: 14, marginVertical: 1, width: '100%' },
  ability: { color: '#6A291C', fontFamily: FONT_WESTERN_SERIF, fontSize: 10, lineHeight: 14 },
  hint: { color: '#67472E', fontSize: 9, lineHeight: 13, textAlign: 'center' },
  duel: { alignSelf: 'center', width: '78%', minHeight: 40, marginTop: 2 },
});
