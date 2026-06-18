import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useWindowDimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DustParticles } from '@/components/effects/DustParticles';
import { ShimmerTitle } from '@/components/title/ShimmerTitle';
import { gameImages } from '@/constants/gameImages';
import { colors } from '@/constants/theme';
import { FONT_RYE } from '@/constants/fonts';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { bootMenuBgm } from '@/utils/bgmService';
import { play } from '@/utils/audioService';
import { trigger } from '@/utils/hapticService';
import { useEffect } from 'react';

export default function TitleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();

  useScreenBgm('menu');

  useEffect(() => {
    void bootMenuBgm();
  }, []);

  const goMenu = async () => {
    await Promise.all([trigger('medium'), play('bang_shot')]);
    router.push('/menu');
  };

  return (
    <View style={styles.root}>
      <View style={styles.bgClip}>
        <Image
          source={gameImages.titleHero}
          style={[
            styles.bgImage,
            {
              width: winW * 1.12,
              height: winH * 1.06,
              left: -winW * 0.06,
              top: -winH * 0.02,
            },
          ]}
          contentFit="cover"
          contentPosition="bottom center"
          cachePolicy="memory-disk"
          priority="high"
          transition={0}
        />
      </View>

      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(8, 4, 2, 0.55)',
          'rgba(8, 4, 2, 0.08)',
          'rgba(8, 4, 2, 0.02)',
          'rgba(8, 4, 2, 0.62)',
        ]}
        locations={[0, 0.28, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />

      <DustParticles />

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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1A0F08',
    overflow: 'hidden',
  },
  bgClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bgImage: {
    position: 'absolute',
  },
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
