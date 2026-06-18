import { Image } from 'expo-image';
import { memo, useEffect, type FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import type { SvgProps } from 'react-native-svg';

import {
  getNpcShootFrames,
  getNpcSpriteSource,
  getPlayerShootFrames,
  getPlayerSpriteSource,
} from '@/constants/spriteAssets';
import {
  SPRITE_POSE_TRANSFORM,
  type SpritePose,
} from '@/constants/sprites';
import { RM_GAME } from '@/constants/reanimatedGame';

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
const POSE_FADE_MS = 36;
const SHOOT_CROSSFADE_MS = 56;
const SHOOT_IN_MS = 0;

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
        recyclingKey={String(source)}
      />
    </Animated.View>
  );
});

function usePoseOpacity(pose: SpritePose) {
  const idle = useSharedValue(pose === 'idle' ? 1 : 0);
  const aim = useSharedValue(pose === 'aim' ? 1 : 0);
  const defeat = useSharedValue(pose === 'defeat' ? 1 : 0);
  const shoot = useSharedValue(pose === 'shoot' ? 1 : 0);
  const shootFrame = useSharedValue(0);

  useEffect(() => {
    const cfg = { duration: POSE_FADE_MS, easing: Easing.out(Easing.quad), reduceMotion: RM_GAME };
    const shootIn = { duration: SHOOT_IN_MS, easing: Easing.out(Easing.quad), reduceMotion: RM_GAME };
    idle.value = withTiming(pose === 'idle' ? 1 : 0, pose === 'shoot' ? shootIn : cfg);
    aim.value = withTiming(pose === 'aim' ? 1 : 0, pose === 'shoot' ? shootIn : cfg);
    defeat.value = withTiming(pose === 'defeat' ? 1 : 0, pose === 'shoot' ? shootIn : cfg);
    shoot.value = withTiming(pose === 'shoot' ? 1 : 0, shootIn);
    if (pose === 'shoot') {
      shootFrame.value = 0;
      shootFrame.value = withTiming(1, {
        duration: SHOOT_CROSSFADE_MS,
        easing: Easing.out(Easing.cubic),
        reduceMotion: RM_GAME,
      });
    } else {
      shootFrame.value = 0;
    }
  }, [pose, idle, aim, defeat, shoot, shootFrame]);

  const shootFrame0Style = useAnimatedStyle(() => ({
    opacity: shoot.value * (1 - shootFrame.value),
  }));
  const shootFrame1Style = useAnimatedStyle(() => ({
    opacity: shoot.value * shootFrame.value,
  }));
  const singleShootStyle = useAnimatedStyle(() => ({
    opacity: shoot.value,
  }));

  return {
    idle,
    aim,
    defeat,
    shootFrame0Style,
    shootFrame1Style,
    singleShootStyle,
  };
}

function PngSpriteStack({
  npcId,
  characterId,
  width,
  height,
  pose,
  mode,
}: {
  npcId?: number;
  characterId?: number;
  width: number;
  height: number;
  pose: SpritePose;
  mode: 'npc' | 'player';
}) {
  const idleSrc =
    mode === 'npc' ? getNpcSpriteSource(npcId!, 'idle') : getPlayerSpriteSource(characterId!, 'idle');
  const aimSrc =
    mode === 'npc' ? getNpcSpriteSource(npcId!, 'aim') : getPlayerSpriteSource(characterId!, 'aim');
  const defeatSrc =
    mode === 'npc'
      ? getNpcSpriteSource(npcId!, 'defeat')
      : getPlayerSpriteSource(characterId!, 'defeat');
  const shootSrc =
    mode === 'npc'
      ? getNpcSpriteSource(npcId!, 'shoot')
      : getPlayerSpriteSource(characterId!, 'shoot');
  const shootFrames =
    mode === 'npc' ? getNpcShootFrames(npcId!) : getPlayerShootFrames(characterId!);

  const op = usePoseOpacity(pose);
  const frame0 = shootFrames?.[0] ?? shootSrc;
  const frame1 = shootFrames?.[1];
  const useDualFrames = frame1 != null && frame0 != null;

  return (
    <View style={{ width, height }}>
      {idleSrc ? <SpriteLayer source={idleSrc} width={width} height={height} opacity={op.idle} /> : null}
      {aimSrc ? <SpriteLayer source={aimSrc} width={width} height={height} opacity={op.aim} /> : null}
      {defeatSrc ? (
        <SpriteLayer source={defeatSrc} width={width} height={height} opacity={op.defeat} />
      ) : null}
      {useDualFrames ? (
        <>
          <Animated.View pointerEvents="none" style={[layerStyles.absolute, op.shootFrame0Style]}>
            <Image
              source={frame0}
              style={{ width, height, backgroundColor: 'transparent' }}
              contentFit="contain"
              cachePolicy="memory-disk"
              priority="high"
              transition={0}
              recyclingKey={`${mode}-shoot-0-${frame0}`}
            />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[layerStyles.absolute, op.shootFrame1Style]}>
            <Image
              source={frame1}
              style={{ width, height, backgroundColor: 'transparent' }}
              contentFit="contain"
              cachePolicy="memory-disk"
              priority="high"
              transition={0}
              recyclingKey={`${mode}-shoot-1-${frame1}`}
            />
          </Animated.View>
        </>
      ) : frame0 ? (
        <Animated.View pointerEvents="none" style={[layerStyles.absolute, op.singleShootStyle]}>
          <Image
            source={frame0}
            style={{ width, height, backgroundColor: 'transparent' }}
            contentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
            transition={0}
            recyclingKey={`${mode}-shoot-${frame0}`}
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
}: BaseProps & { npcId: number }) {
  const idleSrc = getNpcSpriteSource(npcId, 'idle');
  const hasPng = !!idleSrc;
  const Cmp = NPC_BY_ID[npcId] ?? DefaultNpc;

  return (
    <View
      style={[
        {
          width,
          height,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        flipHorizontal ? { transform: [{ scaleX: -1 }] } : null,
        style,
      ]}
    >
      {hasPng ? (
        <PngSpriteStack mode="npc" npcId={npcId} width={width} height={height} pose={pose} />
      ) : (
        <View style={svgPoseStyle(pose)}>
          <Cmp width={width} height={height} />
        </View>
      )}
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
}: BaseProps & { characterId?: number }) {
  const idleSrc = getPlayerSpriteSource(characterId, 'idle');
  const hasPng = !!idleSrc;

  return (
    <View
      style={[
        {
          width,
          height,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        flipHorizontal ? { transform: [{ scaleX: -1 }] } : null,
        style,
      ]}
    >
      {hasPng ? (
        <PngSpriteStack
          mode="player"
          characterId={characterId}
          width={width}
          height={height}
          pose={pose}
        />
      ) : (
        <View style={svgPoseStyle(pose)}>
          <PlayerSvg width={width} height={height} />
        </View>
      )}
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
