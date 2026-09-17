import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { DuelCoverImage } from '@/components/game/DuelCoverImage';
import { MenuBackButton } from '@/components/ui/MenuBackButton';
import { WesternButton } from '@/components/ui/western/WesternPrimitives';
import { FONT_RYE, FONT_WESTERN_SERIF, usesCjkFont } from '@/constants/fonts';
import { gameImages } from '@/constants/gameImages';
import { uiV3Colors } from '@/constants/theme';
import { V3_PLAYER_IDENTITIES } from '@/constants/v3UiAssets';
import { useCharacterLabels } from '@/utils/characterLabels';

type Props = {
  width: number;
  height: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  playerId: number;
  opponentName: string;
  dayNight: 'day' | 'night';
  onBack: () => void;
  onStart: () => void;
};

export function NpcPreDuelScreen({
  width,
  height,
  paddingTop,
  paddingBottom,
  paddingLeft,
  playerId,
  opponentName,
  dayNight,
  onBack,
  onStart,
}: Props) {
  const { t } = useTranslation();
  const labels = useCharacterLabels(playerId as 1 | 2 | 3 | 4);
  const landscape = width > height;
  const figureSize = Math.min(landscape ? height * 0.78 : width * 0.82, landscape ? 430 : 370);

  return (
    <View style={[styles.root, { width, height }]}>
      <DuelCoverImage
        source={playerId === 1 ? require('@/assets/branding/cinematic-hero.png') : dayNight === 'night' ? gameImages.duelBgNightFull : gameImages.duelBgDayFull}
        width={width}
        height={height}
        bleed={1}
      />
      <LinearGradient
        colors={['rgba(8, 4, 2, 0.42)', 'rgba(8, 4, 2, 0.04)', 'rgba(8, 4, 2, 0.88)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <MenuBackButton
        onPress={onBack}
        variant="overlay"
        style={[styles.back, { top: paddingTop, left: paddingLeft }]}
      />

      <View style={[styles.copy, landscape && styles.copyLandscape, { top: landscape ? paddingTop + 28 : paddingTop + 82 }]}>
        <Text style={styles.kicker}>{t('game.gunslinger')}</Text>
        <Text style={[styles.name, usesCjkFont(labels.name) && styles.nameCjk]}>{labels.name}</Text>
        <Text style={[styles.opponent, usesCjkFont(opponentName) && styles.opponentCjk]}>{t('game.versus')}  {opponentName}</Text>
      </View>

      {playerId !== 1 ? <View style={[styles.figure, landscape && styles.figureLandscape]} pointerEvents="none">
        <Image
          source={V3_PLAYER_IDENTITIES[playerId] ?? V3_PLAYER_IDENTITIES[1]}
          contentFit="contain"
          transition={0}
          style={{ width: figureSize, height: figureSize }}
        />
      </View> : null}

      <View style={[styles.startWrap, landscape && styles.startWrapLandscape, { bottom: paddingBottom + 22 }]}>
        <Text style={styles.ready}>“{t('game.readyToDraw')}”</Text>
        <WesternButton
          title={t('game.start')}
          variant="primary"
          leadingIcon={<Ionicons name="flash-outline" size={23} color={uiV3Colors.gold} />}
          onPress={onStart}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden', backgroundColor: uiV3Colors.background },
  back: { position: 'absolute', zIndex: 10 },
  copy: { position: 'absolute', left: 24, right: 24, zIndex: 3, alignItems: 'center' },
  copyLandscape: { left: '55%', right: '6%', alignItems: 'flex-start' },
  kicker: { color: uiV3Colors.gold, fontSize: 9, fontWeight: '900', letterSpacing: 3 },
  name: { marginTop: 4, color: uiV3Colors.cream, fontFamily: FONT_RYE, fontSize: 30, letterSpacing: 1, textAlign: 'center', textShadowColor: '#130703', textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 3 },
  nameCjk: { fontFamily: FONT_WESTERN_SERIF, fontSize: 27, fontWeight: '700', letterSpacing: 1.4 },
  opponent: { marginTop: 7, color: uiV3Colors.cream, fontSize: 11, fontWeight: '900', letterSpacing: 1.6, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  opponentCjk: { fontFamily: FONT_WESTERN_SERIF, fontWeight: '700', letterSpacing: 0.9 },
  figure: { position: 'absolute', left: 0, right: 0, top: '27%', alignItems: 'center', justifyContent: 'center' },
  figureLandscape: { left: '5%', right: '48%', top: '10%' },
  halo: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255, 183, 56, 0.18)', borderWidth: 1, borderColor: 'rgba(232, 197, 71, 0.32)' },
  startWrap: { position: 'absolute', left: 28, right: 28, gap: 8 },
  startWrapLandscape: { left: '56%', right: '7%' },
  ready: { color: uiV3Colors.cream, fontFamily: FONT_RYE, fontSize: 16, letterSpacing: 1.1, textAlign: 'center', textShadowColor: '#000', textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 3 },
});
