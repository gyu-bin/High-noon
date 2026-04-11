import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors } from '@/constants/theme';
import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';

type Props = ViewProps & {
  children: React.ReactNode;
};

/**
 * 태블릿 등 큰 화면에서도 휴대폰과 비슷한 논리 크기로 콘텐츠를 가두고 가운데 정렬합니다.
 */
export function PhoneStageShell({ children, style, ...rest }: Props) {
  const { stageWidth, stageHeight } = usePhoneStageMetrics();
  return (
    <View style={[styles.outer, style]} {...rest}>
      <View style={[styles.stage, { width: stageWidth, height: stageHeight }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: colors.darkBrown,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stage: {
    overflow: 'hidden',
  },
});
