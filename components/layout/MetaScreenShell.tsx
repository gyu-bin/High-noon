import { Image } from 'expo-image';
import { StyleSheet, View, type ImageSourcePropType, type ViewProps } from 'react-native';

import { WesternHomeBackground } from '@/components/layout/WesternHomeBackground';
import { WESTERN_HERO_FALLBACK } from '@/constants/westernBackground';

type Props = ViewProps & {
  children: React.ReactNode;
  showDust?: boolean;
  background?: ImageSourcePropType;
};

/** 메타 화면 — 타이틀과 동일 배경, 좌우 레터박스 없이 전체 너비 */
export function MetaScreenShell({
  children,
  style,
  showDust = true,
  background,
  ...rest
}: Props) {
  return (
    <View style={[styles.outer, style]} {...rest}>
      {background ? (
        <View style={styles.fill}>
          <Image source={background} contentFit="cover" style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={styles.scrim} />
          {children}
        </View>
      ) : (
        <WesternHomeBackground showDust={showDust} style={styles.fill}>
          {children}
        </WesternHomeBackground>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: WESTERN_HERO_FALLBACK,
  },
  fill: {
    flex: 1,
    width: '100%',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 8, 5, 0.28)',
  },
});
