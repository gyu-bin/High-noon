import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FONT_RYE, FONT_WESTERN_SERIF, usesCjkFont } from '@/constants/fonts';
import { colors, uiV3Colors } from '@/constants/theme';
import { play } from '@/utils/audioService';
import { trigger } from '@/utils/hapticService';

const leather = require('@/high_noon_terra_asset_pack/output/ui/textures/leather_panel.png');

type IconName = keyof typeof Ionicons.glyphMap;

export function BountyActionRow({
  icon,
  title,
  subtitle,
  detail,
  completed = false,
  disabled = false,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  detail?: string;
  completed?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        void play('ready_click');
        void trigger('selection');
        onPress();
      }}
      style={({ pressed }) => [
        styles.row,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Image source={leather} contentFit="cover" style={styles.texture} />
      <View style={styles.iconBox}>
        <Ionicons name={completed ? 'checkmark' : icon} size={23} color={colors.gold} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, usesCjkFont(title) && styles.cjkTitle]}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.sand} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#77532F',
    borderRadius: 5,
    backgroundColor: uiV3Colors.darkBrown,
  },
  texture: { ...StyleSheet.absoluteFillObject, opacity: 0.16 },
  iconBox: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderColor: 'rgba(219,183,124,0.46)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12,7,4,0.42)',
  },
  copy: { flex: 1, gap: 2 },
  title: {
    color: uiV3Colors.gold,
    fontFamily: FONT_RYE,
    fontSize: 14,
    letterSpacing: 0.7,
  },
  cjkTitle: {
    fontFamily: FONT_WESTERN_SERIF,
    fontWeight: '700',
    letterSpacing: 1,
  },
  subtitle: {
    color: uiV3Colors.cream,
    fontFamily: FONT_WESTERN_SERIF,
    fontSize: 11,
  },
  detail: {
    color: colors.sand,
    fontSize: 10,
    opacity: 0.86,
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.76, transform: [{ translateY: 1 }] },
});
