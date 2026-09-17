import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { SplashBrand, SplashScene } from '@/components/splash/SplashScene';
import { DEV_AUTO_SCREENSHOTS } from '@/constants/devFlags';
import { colors } from '@/constants/theme';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { play } from '@/utils/audioService';
import { trigger } from '@/utils/hapticService';

export default function TitleScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const entering = useRef(false);

  useScreenBgm('menu');

  useEffect(() => {
    if (!DEV_AUTO_SCREENSHOTS) return;
    router.replace('/menu');
  }, [router]);

  const goMenu = () => {
    if (entering.current) return;
    entering.current = true;
    // Sound/haptics must not block navigation or enqueue duplicate menu routes.
    void trigger('medium');
    void play('bang_shot');
    router.replace('/menu');
  };

  return (
    <SplashScene>
      <SplashBrand />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('a11y.titleTap')}
        onPress={goMenu}
        style={StyleSheet.absoluteFill}
      >
        <View
          style={[
            styles.center,
            {
              paddingTop: insets.top,
              paddingBottom: insets.bottom + 24,
            },
          ]}
          pointerEvents="box-none"
        >
          <Text style={styles.tapHint}>{t('title.tapToStart')}</Text>
        </View>
      </Pressable>
    </SplashScene>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 28,
    paddingHorizontal: 20,
  },
  tapHint: {
    marginTop: 8,
    color: colors.sand,
    fontSize: 15,
    letterSpacing: 2,
    opacity: 0.92,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
