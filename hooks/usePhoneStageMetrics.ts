import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

/** 논리 픽셀 기준(대략 iPhone 세로) — 더 큰 화면에서는 축소만 하고 확대하지 않음 */
export const PHONE_STAGE_WIDTH = 390;
export const PHONE_STAGE_HEIGHT = 844;

export type PhoneStageMetrics = {
  windowWidth: number;
  windowHeight: number;
  stageWidth: number;
  stageHeight: number;
  offsetX: number;
  offsetY: number;
  /** stage / 참조 프레임 */
  scale: number;
};

export function computePhoneStage(
  windowWidth: number,
  windowHeight: number,
): PhoneStageMetrics {
  const sw = windowWidth / PHONE_STAGE_WIDTH;
  const sh = windowHeight / PHONE_STAGE_HEIGHT;
  const scale = Math.min(1, sw, sh);
  const stageWidth = PHONE_STAGE_WIDTH * scale;
  const stageHeight = PHONE_STAGE_HEIGHT * scale;
  const offsetX = (windowWidth - stageWidth) / 2;
  const offsetY = (windowHeight - stageHeight) / 2;
  return {
    windowWidth,
    windowHeight,
    stageWidth,
    stageHeight,
    offsetX,
    offsetY,
    scale,
  };
}

export function usePhoneStageMetrics(): PhoneStageMetrics {
  const { width: W, height: H } = useWindowDimensions();
  return useMemo(() => computePhoneStage(W, H), [W, H]);
}

/** 스테이지 좌표계 기준 오버레이(일시정지·뒤로가기 등) 여백 */
export function phoneStageSafeOffsets(
  m: PhoneStageMetrics,
  insets: { top: number; right: number; bottom: number; left: number },
): { top: number; right: number; left: number } {
  if (m.scale >= 0.999) {
    return {
      top: insets.top + 6,
      right: 12 + insets.right,
      left: 12 + insets.left,
    };
  }
  const gapTop = m.offsetY;
  const gapLeft = m.offsetX;
  const gapRight = m.windowWidth - m.offsetX - m.stageWidth;
  return {
    top: Math.max(8, Math.max(0, insets.top - gapTop) + 6),
    right: 12 + Math.max(0, insets.right - gapRight),
    left: 12 + Math.max(0, insets.left - gapLeft),
  };
}
