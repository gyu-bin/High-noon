import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { uiV3Colors } from '@/constants/theme';
import { trigger } from '@/utils/hapticService';

type Props = {
  accessibilityLabel: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

const KNOB_TRAVEL = 28;

export function WesternToggle({
  accessibilityLabel,
  value,
  onValueChange,
  disabled = false,
}: Props) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, {
      duration: reduceMotion ? 0 : 180,
    });
  }, [progress, reduceMotion, value]);

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * KNOB_TRAVEL }],
  }));

  const toggle = () => {
    if (disabled) return;
    void trigger('selection');
    onValueChange(!value);
  };

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={toggle}
      style={({ pressed }) => [
        styles.track,
        value ? styles.trackOn : styles.trackOff,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View pointerEvents="none" style={styles.innerBorder} />
      <Ionicons
        name="moon"
        size={12}
        color={value ? 'rgba(29,14,7,0.38)' : uiV3Colors.dustGray}
        style={styles.iconLeft}
      />
      <Ionicons
        name="sunny"
        size={14}
        color={value ? '#5B2F12' : 'rgba(242,213,162,0.28)'}
        style={styles.iconRight}
      />
      <Animated.View pointerEvents="none" style={[styles.knob, value && styles.knobOn, knobStyle]}>
        <View style={styles.knobInset} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 62,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.42,
    shadowRadius: 3,
    elevation: 3,
  },
  trackOff: {
    backgroundColor: '#21140F',
    borderColor: '#61452F',
  },
  trackOn: {
    backgroundColor: '#B66A2E',
    borderColor: '#F0C77B',
    shadowColor: '#D98732',
    shadowOpacity: 0.34,
  },
  innerBorder: {
    position: 'absolute',
    inset: 3,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(242,213,162,0.2)',
  },
  iconLeft: { position: 'absolute', left: 8 },
  iconRight: { position: 'absolute', right: 7 },
  knob: {
    width: 28,
    height: 28,
    marginLeft: 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D4A574',
    backgroundColor: '#E8D5B4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 2,
    elevation: 4,
  },
  knobOn: {
    backgroundColor: '#FFE3A3',
    borderColor: '#FFF0C7',
  },
  knobInset: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(91,47,18,0.25)',
  },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.97 }] },
});
