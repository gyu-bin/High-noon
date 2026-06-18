import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PlayerCharacterSprite } from '@/components/game/CharacterSprites';
import type { PlayerCharacter } from '@/constants/characters';
import { colors } from '@/constants/theme';

const PORTRAIT_W = 96;
const PORTRAIT_H = 108;

type Props = {
  character: PlayerCharacter;
  unlocked: boolean;
  selected: boolean;
  onPress: () => void;
};

export function CharacterSelectCard({ character, unlocked, selected, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !unlocked, selected }}
      onPress={onPress}
      style={[
        styles.card,
        !unlocked && styles.cardLocked,
        selected && unlocked && styles.cardSelected,
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardId}>0{character.id}</Text>
        {unlocked ? null : (
          <Ionicons name="lock-closed" size={18} color={colors.sand} />
        )}
      </View>

      <View style={styles.portrait}>
        <View style={styles.portraitFloor} />
        <PlayerCharacterSprite
          characterId={character.id}
          width={PORTRAIT_W}
          height={PORTRAIT_H}
          pose="idle"
        />
      </View>

      <Text style={styles.cardName} numberOfLines={2}>
        {character.name}
      </Text>
      {character.abilityName ? (
        <Text style={styles.abilityTag}>「{character.abilityName}」</Text>
      ) : (
        <Text style={styles.abilityNone}>능력 없음</Text>
      )}
      {!unlocked ? (
        <Text style={styles.lockHint}>{character.unlockCondition}</Text>
      ) : null}
      {selected && unlocked ? (
        <Text style={styles.selectedBadge}>선택됨</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '47%',
    minWidth: 150,
    flexGrow: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#3D2414',
    borderWidth: 2,
    borderColor: colors.sand,
  },
  cardLocked: {
    opacity: 0.52,
    borderColor: 'rgba(212, 165, 112, 0.35)',
  },
  cardSelected: {
    borderColor: colors.ochre,
    backgroundColor: 'rgba(200, 134, 10, 0.14)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardId: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.sand,
    letterSpacing: 2,
  },
  portrait: {
    marginTop: 8,
    height: 118,
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.22)',
    overflow: 'hidden',
  },
  portraitFloor: {
    position: 'absolute',
    bottom: 10,
    width: 72,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  cardName: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '800',
    color: colors.cream,
  },
  abilityTag: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: colors.ochre,
  },
  abilityNone: {
    marginTop: 4,
    fontSize: 12,
    color: colors.sand,
    opacity: 0.75,
  },
  lockHint: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 15,
    color: colors.sand,
    opacity: 0.85,
  },
  selectedBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.ochre,
    color: colors.darkBrown,
    fontWeight: '800',
    fontSize: 11,
  },
});
