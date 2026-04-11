import { useRouter } from 'expo-router';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';

import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';

import { PhoneStageShell } from '@/components/layout/PhoneStageShell';
import { ShimmerTitle } from '@/components/title/ShimmerTitle';
import { gameImages } from '@/constants/gameImages';
import { colors } from '@/constants/theme';
import { FONT_RYE } from '@/constants/fonts';
import { play } from '@/utils/audioService';
import { trigger } from '@/utils/hapticService';

export default function TitleScreen() {
  const router = useRouter();
  const { stageWidth, stageHeight } = usePhoneStageMetrics();

  const goMenu = async () => {
    await Promise.all([trigger('medium'), play('bang_shot')]);
    router.push('/menu');
  };

  return (
    <PhoneStageShell>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="화면을 눌러 메뉴로"
        onPress={goMenu}
        style={[styles.root, { width: stageWidth, height: stageHeight }]}
      >
        <ImageBackground
          source={gameImages.titleHero}
          style={StyleSheet.absoluteFill}
          imageStyle={styles.titleImage}
        >
          <View style={styles.dim} />
          <View style={styles.center} pointerEvents="box-none">
            <ShimmerTitle label="HIGH NOON" fontFamily={FONT_RYE} fontSize={46} />
            <Text style={styles.tapHint}>탭하여 시작</Text>
          </View>
        </ImageBackground>
      </Pressable>
    </PhoneStageShell>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#2C1A0E',
  },
  titleImage: {
    resizeMode: 'cover',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 8, 6, 0.55)',
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
