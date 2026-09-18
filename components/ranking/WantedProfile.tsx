import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RankingPortrait } from '@/components/ranking/RankingPortrait';
import { WesternPanel } from '@/components/ui/western/WesternPrimitives';
import { FONT_RYE, FONT_WESTERN_SERIF } from '@/constants/fonts';
import type { PvpProfile } from '@/types/pvp';

const wantedPaper = require('@/high_noon_terra_asset_pack/output/ui/textures/wanted_paper.png');

type Props = {
  profile: PvpProfile;
  characterId: number;
  worldRank: number | null;
  tierLabel: string;
  labels: {
    alias: string;
    rank: string;
    rating: string;
    record: string;
    world: string;
    motto: string;
    reroll: string;
  };
  nameDim?: boolean;
  rerolling?: boolean;
  onOpen: () => void;
  onReroll: () => void;
};

export function WantedProfile({
  profile,
  characterId,
  worldRank,
  tierLabel,
  labels,
  nameDim = false,
  rerolling = false,
  onOpen,
  onReroll,
}: Props) {
  return (
    <WesternPanel variant="plain" style={styles.shell}>
      <Image source={wantedPaper} contentFit="cover" style={styles.paper} />
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.eyebrow}>MY</Text>
          <Text style={styles.title}>WANTED</Text>
        </View>
        <Text style={styles.quote}>A DUEL{`\n`}DEFINES{`\n`}A MAN.</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={profile.display_name}
        onPress={onOpen}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <View style={styles.artWrap}>
          <RankingPortrait width={138} height={184} characterId={characterId} />
        </View>
        <View style={styles.details}>
          <Text style={styles.statLabel}>{labels.alias}</Text>
          <View style={styles.aliasRow}>
            <Text
              numberOfLines={2}
              style={[styles.alias, nameDim && styles.aliasDim]}
            >
              {profile.display_name}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={labels.reroll}
              disabled={rerolling}
              onPress={(event) => {
                event.stopPropagation();
                onReroll();
              }}
              hitSlop={10}
              style={({ pressed }) => [styles.reroll, pressed && styles.pressed]}
            >
              <Ionicons
                name="refresh"
                size={17}
                color={rerolling ? '#7B6146' : '#4A2B1C'}
              />
            </Pressable>
          </View>
          <View style={styles.rule} />
          <StatRow label={labels.rank} value={tierLabel.toUpperCase()} />
          <StatRow label={labels.rating} value={`${profile.rating}`} />
          <StatRow
            label={labels.record}
            value={`${profile.wins}W  ${profile.losses}L`}
          />
          <StatRow
            label={labels.world}
            value={worldRank == null ? '—' : `#${worldRank}`}
          />
        </View>
      </Pressable>

      <View style={styles.footerRule} />
      <Text style={styles.motto}>{labels.motto}</Text>
    </WesternPanel>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderColor: '#B68043',
    backgroundColor: '#C79A61',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.42,
    shadowRadius: 7,
    elevation: 6,
  },
  paper: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.88,
  },
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  eyebrow: {
    color: '#32180F',
    fontFamily: FONT_RYE,
    fontSize: 10,
    letterSpacing: 1.6,
    marginBottom: -4,
  },
  title: {
    color: '#32180F',
    fontFamily: FONT_RYE,
    fontSize: 27,
    letterSpacing: 2,
  },
  quote: {
    color: '#4D2A19',
    fontFamily: FONT_RYE,
    fontSize: 8,
    lineHeight: 12,
    letterSpacing: 1.1,
    textAlign: 'center',
    opacity: 0.86,
  },
  body: {
    minHeight: 188,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  artWrap: {
    width: 142,
    height: 184,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginLeft: -12,
    marginBottom: -2,
  },
  details: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingLeft: 4,
    gap: 4,
  },
  aliasRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  alias: {
    flex: 1,
    color: '#2D160E',
    fontFamily: FONT_RYE,
    fontSize: 19,
    lineHeight: 23,
    letterSpacing: 0.5,
  },
  aliasDim: { opacity: 0.45 },
  reroll: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rule: { height: 1, backgroundColor: 'rgba(65,31,17,0.34)' },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  statLabel: {
    color: '#5B3521',
    fontFamily: FONT_WESTERN_SERIF,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  statValue: {
    color: '#2B150D',
    fontFamily: FONT_RYE,
    fontSize: 14,
    textAlign: 'right',
  },
  footerRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(65,31,17,0.3)',
    marginTop: 3,
  },
  motto: {
    color: '#58321F',
    fontFamily: FONT_RYE,
    fontSize: 8,
    letterSpacing: 1.2,
    textAlign: 'center',
    marginTop: 7,
  },
  pressed: { opacity: 0.78 },
});
