import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors } from '@/constants/theme';
import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';

type Props = ViewProps & {
  children: React.ReactNode;
  /** true면 기기 전체 높이를 채움 (메뉴 등) */
  fullHeight?: boolean;
  backgroundColor?: string;
};

/**
 * 태블릿 등 큰 화면에서도 휴대폰과 비슷한 논리 크기로 콘텐츠를 가두고 가운데 정렬합니다.
 */
export function PhoneStageShell({
  children,
  style,
  fullHeight = false,
  backgroundColor = colors.darkBrown,
  ...rest
}: Props) {
  const { stageWidth, stageHeight, windowHeight } = usePhoneStageMetrics();
  const stageH = fullHeight ? windowHeight : Math.min(windowHeight, stageHeight);

  return (
    <View style={[styles.outer, { backgroundColor }, style]} {...rest}>
      <View
        style={[
          styles.stage,
          { width: stageWidth, height: stageH },
        ]}
      >
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
  stage: {
    overflow: 'hidden',
  },
});
