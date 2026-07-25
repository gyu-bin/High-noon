import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { WESTERN_HERO_FALLBACK } from '@/constants/westernBackground';

type Props = {
  /** 스플래시 하단 안내. null이면 메시지만 숨김 */
  message: string | null;
};

/** 네이티브 스플래시 숨긴 뒤 OTA 확인/적용 동안 보이는 부트 화면 */
export function OtaBootSplash({ message }: Props) {
  return (
    <View style={styles.root}>
      {message ? (
        <View style={styles.pill}>
          <Text style={styles.text}>{message}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WESTERN_HERO_FALLBACK,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 72,
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(44, 26, 14, 0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.ochre,
  },
  text: {
    color: colors.cream,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
