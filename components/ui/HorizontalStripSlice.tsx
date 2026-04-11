import type { ReactNode } from 'react';
import { Image, type ImageSourcePropType, StyleSheet, View, type ViewStyle } from 'react-native';

type Props = {
  source: ImageSourcePropType;
  /** 0 … sliceCount - 1 */
  sliceIndex: number;
  sliceCount: number;
  /** 표시 높이 — 가로는 비율에 맞춰 계산 */
  height: number;
  /** 전체 이미지 가로÷세로 (예: 1408/768) */
  aspectWidthOverHeight: number;
  style?: ViewStyle;
  children?: ReactNode;
};

/** 가로로 이어 붙인 N등분 스프라이트에서 한 칸만 보이게 클리핑 */
export function HorizontalStripSlice({
  source,
  sliceIndex,
  sliceCount,
  height,
  aspectWidthOverHeight,
  style,
  children,
}: Props) {
  const fullWidth = height * aspectWidthOverHeight;
  const sliceWidth = fullWidth / sliceCount;

  return (
    <View style={[{ height, width: sliceWidth, overflow: 'hidden' }, style]}>
      <Image
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        source={source}
        style={[
          styles.img,
          {
            height,
            width: fullWidth,
            marginLeft: -sliceIndex * sliceWidth,
          },
        ]}
        resizeMode="cover"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  img: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
