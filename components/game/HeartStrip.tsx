import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { RM_GAME } from '@/constants/reanimatedGame';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const HEART_SIZE = 40;
/** 채워진 하트 — 선명한 빨강 */
const HEART_FULL = '#E11D48';
/** 깨진/잃은 하트 — 한 톤 어둡게 */
const HEART_BROKEN = '#B91C1C';

type Props = {
  filled: number;
  max?: number;
  /** true이면 방금 줄어든 첫 빈 슬롯(막 잃은 하트)에 소멸 연출 */
  animateLoss?: boolean;
};

export function HeartStrip({ filled, max = 3, animateLoss }: Props) {
  const bump = useSharedValue(0);

  useEffect(() => {
    if (animateLoss) {
      bump.value = 0;
      bump.value = withSequence(
        RM_GAME,
        withTiming(1, { duration: 120, reduceMotion: RM_GAME }),
        withTiming(0, { duration: 320, reduceMotion: RM_GAME }),
      );
    }
  }, [animateLoss, bump]);

  const lostSlotStyle = useAnimatedStyle(() => ({
    opacity: 1 - bump.value * 0.9,
    transform: [{ scale: 1 - bump.value * 0.35 }],
  }));

  return (
    <View style={styles.row}>
      {Array.from({ length: max }).map((_, i) => {
        const isFull = i < filled;
        const isLostSlot = Boolean(animateLoss && i === filled);

        const icon = isFull ? (
          <Ionicons name="heart" size={HEART_SIZE} color={HEART_FULL} />
        ) : (
          <MaterialCommunityIcons
            name="heart-broken"
            size={HEART_SIZE}
            color={HEART_BROKEN}
          />
        );

        if (isLostSlot) {
          return (
            <Animated.View key={i} style={[styles.cell, lostSlotStyle]}>
              {icon}
            </Animated.View>
          );
        }
        return (
          <View key={i} style={styles.cell}>
            {icon}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
