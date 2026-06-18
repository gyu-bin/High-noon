import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WesternHomeBackground } from '@/components/layout/WesternHomeBackground';
import { ShimmerTitle } from '@/components/title/ShimmerTitle';
import { colors } from '@/constants/theme';
import { FONT_RYE } from '@/constants/fonts';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { bootMenuBgm } from '@/utils/bgmService';
import { play } from '@/utils/audioService';
import { trigger } from '@/utils/hapticService';

export default function TitleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useScreenBgm('menu');

  useEffect(() => {
    void bootMenuBgm();
  }, []);

  const goMenu = async () => {
    await Promise.all([trigger('medium'), play('bang_shot')]);
    router.push('/menu');
  };

  return (
    <WesternHomeBackground>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="화면을 눌러 메뉴로"
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
          <ShimmerTitle label="HIGH NOON" fontFamily={FONT_RYE} fontSize={48} />
          <Text style={styles.tapHint}>탭하여 시작</Text>
        </View>
      </Pressable>
    </WesternHomeBackground>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
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
