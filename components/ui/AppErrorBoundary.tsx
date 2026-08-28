import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { colors } from '@/constants/theme';

/**
 * 렌더 에러 폴백 화면. expo-router의 `ErrorBoundary` 라우트 export로 사용한다.
 *
 * 이 컴포넌트는 "앱이 이미 깨진 상태"에서 그려지므로 의도적으로 의존성을 최소화했다.
 * - `SafeAreaProvider`를 자체적으로 감싼다. 루트 레이아웃이 렌더 중 던지면 앱의
 *   SafeAreaProvider가 아직 없어서, 그냥 `SafeAreaView`만 쓰면 폴백이 또 크래시한다.
 * - 커스텀 폰트(FONT_RYE)를 쓰지 않는다. 폰트 로드 실패가 원인인 경우
 *   폴백까지 같은 이유로 죽는다. 시스템 폰트만 사용한다.
 * - 상세 메시지는 `__DEV__`에서만 노출한다.
 */
export type AppErrorBoundaryProps = {
  error: Error;
  retry: () => Promise<void>;
  /** 재시도만으로 회복이 어려운 화면(결투 중 등)에서 탈출구 제공 */
  onMainMenu?: () => void;
};

export function AppErrorBoundary({ error, retry, onMainMenu }: AppErrorBoundaryProps) {
  const { t } = useTranslation();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('error.title', 'Something went wrong')}</Text>
          <Text style={styles.desc}>
            {t('error.desc', 'An unexpected error kept this screen from loading.')}
          </Text>

          {__DEV__ ? (
            <ScrollView style={styles.devBox} contentContainerStyle={styles.devBoxContent}>
              <Text style={styles.devText}>{error?.message ?? String(error)}</Text>
            </ScrollView>
          ) : null}

          <Pressable
            accessibilityLabel={t('error.retryA11y', 'Try loading this screen again')}
            accessibilityRole="button"
            onPress={() => {
              void retry();
            }}
            style={styles.btnPrimary}
          >
            <Text style={styles.btnPrimaryText}>{t('error.retry', 'Try again')}</Text>
          </Pressable>

          {onMainMenu ? (
            <Pressable
              accessibilityLabel={t('error.toMenuA11y', 'Return to the main menu')}
              accessibilityRole="button"
              onPress={onMainMenu}
              style={styles.btn}
            >
              <Text style={styles.btnText}>{t('error.toMenu', 'Main menu')}</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.darkBrown,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    padding: 22,
    backgroundColor: '#3D2414',
    borderWidth: 2,
    borderColor: colors.sand,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ochre,
    textAlign: 'center',
  },
  desc: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.cream,
    textAlign: 'center',
    marginBottom: 4,
  },
  devBox: {
    maxHeight: 140,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.sand,
    backgroundColor: colors.darkBrown,
  },
  devBoxContent: {
    padding: 10,
  },
  devText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.rustRed,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  btnPrimary: {
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.ochre,
  },
  btnPrimaryText: {
    textAlign: 'center',
    fontWeight: '800',
    color: colors.darkBrown,
    fontSize: 16,
  },
  btn: {
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.sand,
  },
  btnText: {
    textAlign: 'center',
    fontWeight: '700',
    color: colors.cream,
    fontSize: 15,
  },
});
