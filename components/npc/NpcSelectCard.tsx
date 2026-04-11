import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { NpcCharacterSprite } from '@/components/game/CharacterSprites';
import { colors } from '@/constants/theme';
import type { NpcDefinition } from '@/types/npc';
import { formatReactionMs } from '@/utils/formatReactionMs';

type Props = {
  npc: NpcDefinition;
  locked: boolean;
  cleared: boolean;
  bestMs: number | null;
  onPress?: () => void;
  /** 레전드 해금 직후 카드 등장 딜레이(ms) */
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

  const inner = (
    <View style={[styles.card, boss && styles.cardBoss, locked && styles.cardLocked]}>
      <View style={styles.iconCircle}>
        <NpcCharacterSprite npcId={npc.id} width={44} height={44} />
      </View>

      <View style={styles.mid}>
        <Text style={[styles.name, locked && styles.dim]} numberOfLines={1}>
          {npc.name}
        </Text>
        <Text style={[styles.title, locked && styles.dim]} numberOfLines={1}>
          {npc.title}
        </Text>
        <Text style={[styles.ms, locked && styles.dim]}>
          목표 반응 {npc.reactionMs} ms
        </Text>
        {cleared && bestMs != null ? (
          <Text style={styles.best}>최고 {formatReactionMs(bestMs)} ms</Text>
        ) : null}
      </View>

      <View style={styles.right}>
        {cleared ? (
          <Ionicons name="checkmark-circle" size={28} color="#D4AF37" />
        ) : null}
        {locked ? (
          <Ionicons name="lock-closed" size={24} color={colors.sand} style={styles.lock} />
        ) : null}
      </View>
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

  const a11yName = `${npc.title} ${npc.name}`;

  if (locked || !onPress) {
    return (
      <View
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        accessibilityLabel={`${a11yName}, 잠금`}
        accessibilityHint="이전 NPC를 클리어하면 도전할 수 있습니다"
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
      accessibilityHint="탭하면 이 NPC와 결투를 시작합니다"
      onPress={onPress}
      style={({ pressed }) => [styles.outer, pressed && styles.pressed]}
    >
      {wrapped}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#3D2414',
    borderWidth: 2,
    borderColor: colors.sand,
    gap: 12,
  },
  cardBoss: {
    borderColor: colors.rustRed,
    borderWidth: 2,
  },
  cardLocked: {
    opacity: 0.42,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2A1810',
    borderWidth: 2,
    borderColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mid: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.cream,
  },
  title: {
    marginTop: 2,
    fontSize: 13,
    color: colors.sand,
  },
  ms: {
    marginTop: 6,
    fontSize: 13,
    color: colors.ochre,
    fontWeight: '600',
  },
  best: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#D4AF37',
  },
  dim: {
    color: colors.sand,
  },
  right: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 32,
  },
  lock: {
    marginTop: 6,
  },
});
