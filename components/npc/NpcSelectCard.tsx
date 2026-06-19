import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { NpcCharacterSprite } from '@/components/game/CharacterSprites';
import { BOSS_CARD_BORDER, TIER_BADGE } from '@/constants/npcVisual';
import { colors } from '@/constants/theme';
import type { NpcDefinition } from '@/types/npc';
import { formatReactionMs } from '@/utils/formatReactionMs';
import { npcDisplayName } from '@/utils/npcDisplayName';

type Props = {
  npc: NpcDefinition;
  locked: boolean;
  cleared: boolean;
  bestMs: number | null;
  onPress?: () => void;
  revealDelayMs?: number;
};

export function NpcSelectCard({
  npc,
  locked,
  cleared,
  bestMs,
  onPress,
  revealDelayMs,
}: Props) {
  const boss = npc.bossFlag;
  const badge = TIER_BADGE[npc.tier];
  const spriteOpacity = locked ? 0.35 : cleared ? 1 : 0.8;

  const inner = (
    <View
      style={[
        styles.card,
        boss && styles.cardBoss,
        locked && styles.cardLocked,
      ]}
    >
      <View style={[styles.spriteWrap, { opacity: spriteOpacity }]}>
        <NpcCharacterSprite
          npcId={npc.id}
          width={64}
          height={72}
          pose="idle"
        />
        {boss ? (
          <Ionicons
            name="star"
            size={14}
            color={BOSS_CARD_BORDER}
            style={styles.bossStar}
          />
        ) : null}
      </View>

      <Text style={[styles.name, locked && styles.nameLocked]} numberOfLines={2}>
        {npcDisplayName(npc)}
      </Text>

      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
        <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
      </View>

      {cleared && bestMs != null ? (
        <Text style={styles.best}>✓ {formatReactionMs(bestMs)} ms</Text>
      ) : null}

      {locked ? (
        <Ionicons name="lock-closed" size={20} color={colors.sand} style={styles.lock} />
      ) : cleared ? (
        <Ionicons name="checkmark-circle" size={20} color="#D4AF37" style={styles.lock} />
      ) : null}
    </View>
  );

  const wrapped =
    revealDelayMs != null && revealDelayMs >= 0 ? (
      <Animated.View entering={FadeInRight.delay(revealDelayMs).springify()}>
        {inner}
      </Animated.View>
    ) : (
      inner
    );

  const a11yName = locked
    ? `잠긴 대결상대 ${npcDisplayName(npc)}`
    : npcDisplayName(npc);

  if (locked || !onPress) {
    return (
      <View
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        accessibilityLabel={a11yName}
        style={styles.outer}
      >
        {wrapped}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${a11yName} 도전`}
      onPress={onPress}
      style={({ pressed }) => [styles.outer, pressed && styles.pressed]}
    >
      {wrapped}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 10,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  card: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: '#3D2414',
    borderWidth: 2,
    borderColor: colors.sand,
    minHeight: 140,
  },
  cardBoss: {
    borderColor: BOSS_CARD_BORDER,
    backgroundColor: '#4A2E18',
  },
  cardLocked: {
    backgroundColor: '#2A1810',
    borderColor: '#4A3A32',
    opacity: 0.55,
  },
  spriteWrap: {
    width: 68,
    height: 76,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 2,
    overflow: 'visible',
  },
  bossStar: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  name: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.cream,
    textAlign: 'center',
  },
  nameLocked: {
    color: colors.sand,
    opacity: 0.75,
  },
  badge: {
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  best: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    color: '#D4AF37',
  },
  lock: {
    marginTop: 4,
  },
});
