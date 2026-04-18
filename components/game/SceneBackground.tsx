import { Image } from 'expo-image';
import {
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors } from '@/constants/theme';

type Props = {
  /** 배경 이미지. `solidColor`만 쓰면 생략 가능 */
  source?: ImageSourcePropType;
  /** 이미지 에셋 없을 때 등 단색 전체 배경 */
  solidColor?: string;
  children: React.ReactNode;
  /** 바깥 컨테이너 — 너비·높이 지정 시 레이아웃이 더 안정적 */
  style?: StyleProp<ViewStyle>;
  /** 이미지 위 브라운 딤 */
  dimColor?: string;
  /** 지정 시 배경 이미지·루트가 이 크기(폰 스테이지 등). 미지정 시 창 크기 */
  contentWidth?: number;
  contentHeight?: number;
};

/**
 * RN ImageBackground / RN Image 대신 expo-image — iOS에서 배경이 비는 경우 완화.
 */
export function SceneBackground({
  source,
  solidColor,
  children,
  style,
  dimColor = 'rgba(20, 12, 8, 0.42)',
  contentWidth,
  contentHeight,
}: Props) {
  const { width: dw, height: dh } = useWindowDimensions();
  const w = contentWidth ?? dw;
  const h = contentHeight ?? dh;

  const useSolid = solidColor != null && source == null;

  return (
    <View
      style={[
        styles.root,
        { width: w, height: h },
        useSolid && { backgroundColor: solidColor },
        style,
      ]}
    >
      {useSolid ? null : (
        <Image
          pointerEvents="none"
          source={source!}
          style={[styles.bgImage, { width: w, height: h }]}
          contentFit="cover"
          cachePolicy="memory-disk"
          priority="high"
          transition={0}
        />
      )}
      <View pointerEvents="none" style={[styles.dim, { backgroundColor: dimColor }]} />
      <View style={styles.foreground} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.darkBrown,
  },
  bgImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 0,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  foreground: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    backgroundColor: 'transparent',
  },
});
