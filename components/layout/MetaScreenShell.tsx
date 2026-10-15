import { StyleSheet, View, type ViewProps } from 'react-native';

import { WesternHomeBackground } from '@/components/layout/WesternHomeBackground';
import { WESTERN_HERO_FALLBACK } from '@/constants/westernBackground';

type Props = ViewProps & {
  children: React.ReactNode;
  showDust?: boolean;
};

/** 메타 화면 — 타이틀과 동일 배경, 좌우 레터박스 없이 전체 너비 */
export function MetaScreenShell({
  children,
  style,
  showDust = true,
  ...rest
}: Props) {
  return (
    <View style={[styles.outer, style]} {...rest}>
      <WesternHomeBackground showDust={showDust} style={styles.fill}>
        {children}
      </WesternHomeBackground>
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
});
