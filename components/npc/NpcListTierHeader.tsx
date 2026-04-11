import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { colors } from '@/constants/theme';
import { FONT_RYE } from '@/constants/fonts';

type Props = {
  title: string;
  /** 레전드 섹션 첫 공개 시 연출 */
  revealAnimation?: 'spring' | 'fade';
};

export function NpcListTierHeader({ title, revealAnimation }: Props) {
  if (revealAnimation === 'spring') {
    return (
      <Animated.View
        entering={ZoomIn.duration(520).springify().damping(14)}
        style={styles.wrap}
      >
        <Text style={[styles.text, { fontFamily: FONT_RYE }]}>{title}</Text>
        <View style={styles.line} />
      </Animated.View>
    );
  }
  if (revealAnimation === 'fade') {
    return (
      <Animated.View entering={FadeInDown.duration(420)} style={styles.wrap}>
        <Text style={[styles.text, { fontFamily: FONT_RYE }]}>{title}</Text>
        <View style={styles.line} />
      </Animated.View>
    );
  }
  return (
    <View style={styles.wrap}>
      <Text style={[styles.text, { fontFamily: FONT_RYE }]}>{title}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 4,
  },
  text: {
    fontSize: 22,
    color: colors.ochre,
    letterSpacing: 3,
  },
  line: {
    marginTop: 8,
    height: 2,
    width: 48,
    backgroundColor: colors.sand,
    opacity: 0.7,
    borderRadius: 1,
  },
});
