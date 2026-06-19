import { Image } from 'expo-image';
import type { ImageSourcePropType } from 'react-native';

type Props = {
  source: ImageSourcePropType;
  width: number;
  height: number;
  /** cover: 화면 채움(일부 크롭) · contain: 배경 전체 노출 */
  fit?: 'cover' | 'contain';
  /** cover 전용 — 가로세로 비율 차이로 생기는 레터박스 방지용 여유 배율 */
  bleed?: number;
};

/** 결투 배경 — portrait 화면에서 landscape 에셋 레이아웃 */
export function DuelCoverImage({
  source,
  width: w,
  height: h,
  fit = 'cover',
  bleed = 1.2,
}: Props) {
  if (fit === 'contain') {
    return (
      <Image
        pointerEvents="none"
        source={source}
        style={{
          position: 'absolute',
          width: w,
          height: h,
          left: 0,
          top: 0,
        }}
        contentFit="contain"
        contentPosition="center"
        cachePolicy="memory-disk"
        priority="high"
        transition={0}
      />
    );
  }

  const bw = w * bleed;
  const bh = h * bleed;

  return (
    <Image
      pointerEvents="none"
      source={source}
      style={{
        position: 'absolute',
        width: bw,
        height: bh,
        left: (w - bw) / 2,
        top: (h - bh) / 2,
      }}
      contentFit="cover"
      contentPosition="center"
      cachePolicy="memory-disk"
      priority="high"
      transition={0}
    />
  );
}
