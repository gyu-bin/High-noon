import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FONT_RYE } from '@/constants/fonts';
import { colors } from '@/constants/theme';

type Props = {
  onPress: () => void;
  /** 기본값은 `common.back` 번역 */
  label?: string;
  /** 헤더 / 결투 오버레이 */
  variant?: 'header' | 'overlay';
  style?: StyleProp<ViewStyle>;
};

/** 나무 질감 뒤로가기 — 앱 전역 동일 스타일 */
export function MenuBackButton({
  onPress,
  label,
  variant = 'header',
  style,
}: Props) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t('common.back');
  const isOverlay = variant === 'overlay';

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={resolvedLabel}
      style={({ pressed }) => [
        styles.outer,
        isOverlay && styles.outerOverlay,
        pressed && styles.outerPressed,
        style,
      ]}
    >
      <View pointerEvents="none" style={styles.grain} />
      <Ionicons
        name="chevron-back"
        size={isOverlay ? 18 : 16}
        color={colors.ochre}
        style={styles.icon}
      />
      <Text
        style={[
          styles.label,
          isOverlay && styles.labelOverlay,
          { fontFamily: FONT_RYE },
        ]}
      >
        {resolvedLabel}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
    paddingVertical: 7,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: 9,
    backgroundColor: '#4A2E18',
    borderWidth: 2,
    borderColor: 'rgba(212, 165, 116, 0.55)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  outerOverlay: {
    marginLeft: 0,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 14,
  },
  outerPressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.92,
  },
  grain: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '38%',
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  icon: {
    marginRight: 2,
  },
  label: {
    color: colors.cream,
    fontSize: 15,
    letterSpacing: 1,
  },
  labelOverlay: {
    fontSize: 16,
  },
});
