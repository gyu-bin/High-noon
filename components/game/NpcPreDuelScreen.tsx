import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { DuelCoverImage } from '@/components/game/DuelCoverImage';
import { MenuBackButton } from '@/components/ui/MenuBackButton';
import { WesternButton } from '@/components/ui/western/WesternPrimitives';
import { FONT_RYE, FONT_WESTERN_SERIF, usesCjkFont } from '@/constants/fonts';
import { uiV3Colors } from '@/constants/theme';
import { characterArtDisplayScale, scaledArtStyle } from '@/constants/characterArtMetadata';
import { CLARITY_PLAYERS } from '@/constants/clarityCharacterAssets';
import {
  APPROVED_DUEL_BACKGROUNDS,
  getV3NpcPose,
  V3_PRE_DUEL_NPC_FACEOFF,
  V3_PRE_DUEL_PLAYER_FACEOFF,
  type DuelBackgroundId,
} from '@/constants/v3DuelAssets';
import { useCharacterLabels } from '@/utils/characterLabels';

type Props = {
  width: number;
  height: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  playerId: number;
  npcId: number;
  opponentName: string;
  backgroundId: DuelBackgroundId;
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
  npcId,
  opponentName,
  backgroundId,
  onBack,
  onStart,
}: Props) {
  const { t } = useTranslation();
  const labels = useCharacterLabels(playerId as 1 | 2 | 3 | 4);
  const landscape = width > height;
  const playerSize = Math.min(landscape ? height * 0.7 : width * 0.64, landscape ? 390 : 290);
  const npcSize = Math.min(landscape ? height * 0.68 : width * 0.58, landscape ? 370 : 270);

  return (
    <View style={[styles.root, { width, height }]}>
      <DuelCoverImage
        source={APPROVED_DUEL_BACKGROUNDS[backgroundId]}
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

      <View style={[styles.duelists, landscape && styles.duelistsLandscape]} pointerEvents="none">
        <View style={styles.playerFigure}>
          <Image
            source={
              V3_PRE_DUEL_PLAYER_FACEOFF[playerId] ??
              (CLARITY_PLAYERS[playerId] ?? CLARITY_PLAYERS[1])!.fire
            }
            contentFit="contain"
            transition={0}
            style={scaledArtStyle(playerSize, playerSize, characterArtDisplayScale('player', playerId))}
          />
        </View>
        <Text style={styles.vs}>VS</Text>
        <View style={styles.npcFigure}>
          <Image
            source={V3_PRE_DUEL_NPC_FACEOFF[npcId] ?? getV3NpcPose(npcId, 'fire')}
            contentFit="contain"
            transition={0}
            style={scaledArtStyle(npcSize, npcSize, characterArtDisplayScale('npc', npcId))}
          />
        </View>
      </View>

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
  duelists: { position: 'absolute', left: 8, right: 8, top: '29%', height: '40%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  duelistsLandscape: { left: '3%', right: '43%', top: '16%', height: '68%' },
  playerFigure: { flex: 1, alignItems: 'flex-end', justifyContent: 'flex-end' },
  npcFigure: { flex: 1, alignItems: 'flex-start', justifyContent: 'flex-end' },
  vs: { alignSelf: 'center', marginHorizontal: -8, zIndex: 2, color: uiV3Colors.gold, fontFamily: FONT_RYE, fontSize: 20, textShadowColor: '#000', textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 3 },
  startWrap: { position: 'absolute', left: 28, right: 28, gap: 8 },
  startWrapLandscape: { left: '56%', right: '7%' },
  ready: { color: uiV3Colors.cream, fontFamily: FONT_RYE, fontSize: 16, letterSpacing: 1.1, textAlign: 'center', textShadowColor: '#000', textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 3 },
});
