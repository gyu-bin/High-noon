import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors } from '@/constants/theme';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  accessibilityHint?: string;
};

export function WoodButton({
  title,
  onPress,
  disabled,
  style,
  textStyle,
  accessibilityHint,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.outer,
        disabled && styles.outerDisabled,
        pressed && !disabled && styles.outerPressed,
        style,
      ]}
    >
      <View pointerEvents="none" style={styles.grainRow} />
      <View pointerEvents="none" style={[styles.grainRow, styles.grainRow2]} />
      <Text style={[styles.label, disabled && styles.labelDisabled, textStyle]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 22,
    backgroundColor: '#4A2E18',
    borderWidth: 3,
    borderColor: '#2C1810',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 4,
    elevation: 6,
  },
  outerPressed: {
    transform: [{ translateY: 2 }],
    shadowOpacity: 0.25,
  },
  outerDisabled: {
    opacity: 0.45,
  },
  grainRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '22%',
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  grainRow2: {
    top: '62%',
    height: 2,
    opacity: 0.85,
  },
  label: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: colors.ochre,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  labelDisabled: {
    color: colors.sand,
  },
});
