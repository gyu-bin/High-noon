import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors } from '@/constants/theme';
import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';

type Props = ViewProps & {
  children: React.ReactNode;
  /** true면 기기 전체 높이를 채움 (메뉴 등) */
  fullHeight?: boolean;
  /** true면 가로도 기기 전체 — 결투 배경 레터박스 방지 */
  edgeToEdge?: boolean;
  backgroundColor?: string;
};

/**
 * 태블릿 등 큰 화면에서도 휴대폰과 비슷한 논리 크기로 콘텐츠를 가두고 가운데 정렬합니다.
 */
export function PhoneStageShell({
  children,
  style,
  fullHeight = false,
  edgeToEdge = false,
  backgroundColor = colors.darkBrown,
  ...rest
}: Props) {
  const { stageWidth, stageHeight, windowWidth, windowHeight } = usePhoneStageMetrics();
  const stageW = edgeToEdge ? windowWidth : stageWidth;
  const stageH = edgeToEdge
    ? windowHeight
    : fullHeight
      ? windowHeight
      : Math.min(windowHeight, stageHeight);

  return (
    <View
      style={[
        styles.outer,
        { backgroundColor },
        edgeToEdge && styles.outerEdge,
        style,
      ]}
      {...rest}
    >
      <View style={[styles.stage, { width: stageW, height: stageH }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: colors.darkBrown,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  outerEdge: {
    alignItems: 'stretch',
  },
  stage: {
    overflow: 'hidden',
  },
});
