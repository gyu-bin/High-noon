import { Image } from 'expo-image';
import { memo, type FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import type { SvgProps } from 'react-native-svg';

import { getNpcSpriteSource, getPlayerSpriteSource } from '@/constants/spriteAssets';
import {
  SPRITE_CACHE_REVISION,
  SPRITE_POSE_TRANSFORM,
  type SpritePose,
} from '@/constants/sprites';
import {
  MuzzleFlashOverlay,
  resolveDuelSpriteLayers,
  spriteDisplayPose,
  useDuelSpriteMotion,
  usePoseOpacity,
  VictoryEffectsOverlay,
} from '@/lib/duelSprite';

import Npc01 from '@/assets/images/characters/npc_01_clay.svg';
import Npc02 from '@/assets/images/characters/npc_02_doug.svg';
import Npc03 from '@/assets/images/characters/npc_03_betty.svg';
import Npc04 from '@/assets/images/characters/npc_04_billy.svg';
import Npc05 from '@/assets/images/characters/npc_05_sam.svg';
import Npc06 from '@/assets/images/characters/npc_06_rosa.svg';
import Npc07 from '@/assets/images/characters/npc_07_jack.svg';
import Npc08 from '@/assets/images/characters/npc_08_colt.svg';
import Npc09 from '@/assets/images/characters/npc_09_rider_boss.svg';
import Npc10 from '@/assets/images/characters/npc_10_eagle.svg';
import Npc11 from '@/assets/images/characters/npc_11_daisy.svg';
import Npc12 from '@/assets/images/characters/npc_12_sybil_boss.svg';
import Npc13 from '@/assets/images/characters/npc_13_seth.svg';
import Npc14 from '@/assets/images/characters/npc_14_doc.svg';
import Npc15 from '@/assets/images/characters/npc_15_lace_boss.svg';
import Npc16 from '@/assets/images/characters/npc_16_angel.svg';
import Npc17 from '@/assets/images/characters/npc_17_dryden_boss.svg';
import Npc18 from '@/assets/images/characters/npc_18_unknown.svg';
import Npc19 from '@/assets/images/characters/npc_19_unknown.svg';
import Npc20 from '@/assets/images/characters/npc_20_whiteman_finalboss.svg';
import PlayerSvg from '@/assets/images/characters/player.svg';

const NPC_BY_ID: Record<number, FC<SvgProps>> = {
  1: Npc01,
  2: Npc02,
  3: Npc03,
  4: Npc04,
  5: Npc05,
  6: Npc06,
  7: Npc07,
  8: Npc08,
  9: Npc09,
  10: Npc10,
  11: Npc11,
  12: Npc12,
  13: Npc13,
  14: Npc14,
  15: Npc15,
  16: Npc16,
  17: Npc17,
  18: Npc18,
  19: Npc19,
  20: Npc20,
  21: Npc20,
  22: Npc18,
};

const DefaultNpc = Npc01;

type BaseProps = {
  width: number;
  height: number;
  flipHorizontal?: boolean;
  style?: StyleProp<ViewStyle>;
  pose?: SpritePose;
};

type LayerSource = NonNullable<ReturnType<typeof getNpcSpriteSource>>;

const SpriteLayer = memo(function SpriteLayer({
  source,
  width,
  height,
  opacity,
}: {
  source: LayerSource;
  width: number;
  height: number;
  opacity: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View pointerEvents="none" style={[layerStyles.absolute, style]}>
      <Image
        source={source}
        style={{ width, height, backgroundColor: 'transparent' }}
        contentFit="contain"
        cachePolicy="memory-disk"
        priority="high"
        transition={0}
        recyclingKey={`${String(source)}-r${SPRITE_CACHE_REVISION}`}
      />
    </Animated.View>
  );
});

function DuelSpriteStack({
  mode,
  id,
  width,
  height,
  pose,
}: {
  mode: 'npc' | 'player';
  id: number;
  width: number;
  height: number;
  pose: SpritePose;
}) {
  const layers = resolveDuelSpriteLayers(mode, id);
  const displayPose = spriteDisplayPose(pose);
  const op = usePoseOpacity(displayPose);
  const showAimLayer = displayPose === 'aim' && layers.aim !== layers.idle;
  const showShootLayer = displayPose === 'shoot';

  return (
    <View style={{ width, height }}>
      {layers.idle ? (
        <SpriteLayer source={layers.idle} width={width} height={height} opacity={op.idle} />
      ) : null}
      {showAimLayer ? (
        <SpriteLayer source={layers.aim} width={width} height={height} opacity={op.aim} />
      ) : null}
      {layers.defeat ? (
        <SpriteLayer source={layers.defeat} width={width} height={height} opacity={op.defeat} />
      ) : null}
      {showShootLayer && layers.useDualShootFrames && layers.shootFrame0 && layers.shootFrame1 ? (
        <>
          <Animated.View pointerEvents="none" style={[layerStyles.absolute, op.shootFrame0Style]}>
            <Image
              source={layers.shootFrame0}
              style={{ width, height, backgroundColor: 'transparent' }}
              contentFit="contain"
              cachePolicy="memory-disk"
              priority="high"
              transition={0}
              recyclingKey={`${String(layers.shootFrame0)}-r${SPRITE_CACHE_REVISION}-0`}
            />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[layerStyles.absolute, op.shootFrame1Style]}>
            <Image
              source={layers.shootFrame1}
              style={{ width, height, backgroundColor: 'transparent' }}
              contentFit="contain"
              cachePolicy="memory-disk"
              priority="high"
              transition={0}
              recyclingKey={`${String(layers.shootFrame1)}-r${SPRITE_CACHE_REVISION}-1`}
            />
          </Animated.View>
        </>
      ) : showShootLayer && layers.shootFrame0 ? (
        <Animated.View pointerEvents="none" style={[layerStyles.absolute, op.singleShootStyle]}>
          <Image
            source={layers.shootFrame0}
            style={{ width, height, backgroundColor: 'transparent' }}
            contentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
            transition={0}
            recyclingKey={`${String(layers.shootFrame0)}-r${SPRITE_CACHE_REVISION}`}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

function svgPoseStyle(pose: SpritePose) {
  const t = SPRITE_POSE_TRANSFORM[pose];
  return {
    transform: [{ scale: t.scale }, { translateY: t.translateY }],
  };
}

export const NpcCharacterSprite = memo(function NpcCharacterSprite({
  npcId,
  width,
  height,
  flipHorizontal,
  style,
  pose = 'idle',
  victoryActive = false,
}: BaseProps & { npcId: number; victoryActive?: boolean }) {
  const hasPng = !!getNpcSpriteSource(npcId, 'idle');
  const motionStyle = useDuelSpriteMotion(pose, victoryActive);

  return (
    <View
      style={[
        {
          width,
          height,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
        },
        flipHorizontal ? { transform: [{ scaleX: -1 }] } : null,
        style,
      ]}
    >
      <Animated.View style={[{ width, height }, motionStyle]}>
        {hasPng ? (
          <DuelSpriteStack mode="npc" id={npcId} width={width} height={height} pose={pose} />
        ) : (
          <View style={{ width, height }} />
        )}
        {pose === 'shoot' && !victoryActive ? (
          <MuzzleFlashOverlay width={width} height={height} active />
        ) : null}
        {victoryActive ? (
          <VictoryEffectsOverlay
            mode="npc"
            id={npcId}
            width={width}
            height={height}
            active
          />
        ) : null}
      </Animated.View>
    </View>
  );
});

export const PlayerCharacterSprite = memo(function PlayerCharacterSprite({
  characterId = 1,
  width,
  height,
  flipHorizontal,
  style,
  pose = 'idle',
  victoryActive = false,
}: BaseProps & { characterId?: number; victoryActive?: boolean }) {
  const hasPng = !!getPlayerSpriteSource(characterId, 'idle');
  const motionStyle = useDuelSpriteMotion(pose, victoryActive);

  return (
    <View
      style={[
        {
          width,
          height,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
        },
        flipHorizontal ? { transform: [{ scaleX: -1 }] } : null,
        style,
      ]}
    >
      <Animated.View style={[{ width, height }, motionStyle]}>
        {hasPng ? (
          <DuelSpriteStack
            mode="player"
            id={characterId}
            width={width}
            height={height}
            pose={pose}
          />
        ) : (
          <View style={svgPoseStyle(pose)}>
            <PlayerSvg width={width} height={height} />
          </View>
        )}
        {pose === 'shoot' && !victoryActive ? (
          <MuzzleFlashOverlay width={width} height={height} active />
        ) : null}
        {victoryActive ? (
          <VictoryEffectsOverlay
            mode="player"
            id={characterId}
            width={width}
            height={height}
            active
          />
        ) : null}
      </Animated.View>
    </View>
  );
});

const layerStyles = {
  absolute: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
  },
};

export type { SpritePose };
