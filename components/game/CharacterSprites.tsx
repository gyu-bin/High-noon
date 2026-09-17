import { Image } from 'expo-image';
import { memo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import {
  getNpcSpriteSource,
  getPlayerDownSource,
  getPlayerSpriteSource,
} from '@/constants/spriteAssets';
import type { DuelCorner } from '@/constants/duelArena';
import type { LocalDuelSkin } from '@/constants/localDuelSkin';
import { CLARITY_NPCS, CLARITY_PLAYERS } from '@/constants/clarityCharacterAssets';
import {
  SPRITE_CACHE_REVISION,
  SPRITE_POSE_TRANSFORM,
  type SpritePose,
} from '@/constants/sprites';
import {
  DefeatDustOverlay,
  defeatImpactDelayMs,
  MuzzleFlashOverlay,
  resolveDuelSpriteLayers,
  spriteDisplayPose,
  useDuelSpriteMotion,
  usePoseOpacity,
  VictoryEffectsOverlay,
} from '@/lib/duelSprite';

import PlayerSvg from '@/assets/images/characters/player.svg';


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
  const op = usePoseOpacity(displayPose, layers.down != null);
  const showAimLayer = layers.aim != null && layers.aim !== layers.idle;

  return (
    <View style={{ width, height, backgroundColor: 'transparent' }}>
      {layers.idle ? (
        <SpriteLayer source={layers.idle} width={width} height={height} opacity={op.idle} />
      ) : null}
      {showAimLayer && layers.aim ? (
        <SpriteLayer source={layers.aim} width={width} height={height} opacity={op.aim} />
      ) : null}
      {layers.defeat ? (
        <SpriteLayer source={layers.defeat} width={width} height={height} opacity={op.defeat} />
      ) : null}
      {layers.down ? (
        <SpriteLayer source={layers.down} width={width} height={height} opacity={op.down} />
      ) : null}
      {layers.useDualShootFrames && layers.shootFrame0 && layers.shootFrame1 ? (
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
      ) : layers.shootFrame0 ? (
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
  duelCorner = 'topRight',
  defeatDropPx,
}: BaseProps & {
  npcId: number;
  victoryActive?: boolean;
  duelCorner?: DuelCorner;
  /** 낙하 거리 px — landscape 등 같은 지면선 구도에서 제자리 착지용 */
  defeatDropPx?: number;
}) {
  const hasPng = !!getNpcSpriteSource(npcId, 'idle');
  const grounded = Boolean(CLARITY_NPCS[npcId]);
  const motionStyle = useDuelSpriteMotion(
    pose,
    victoryActive,
    duelCorner,
    'topple',
    height,
    defeatDropPx,
    grounded,
  );

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
        <MuzzleFlashOverlay
          width={width}
          height={height}
          flipHorizontal={grounded}
          anchorX={grounded ? 0.22 : undefined}
          active={pose === 'shoot' && !victoryActive}
        />
        <VictoryEffectsOverlay
          mode="npc"
          id={npcId}
          width={width}
          height={height}
          active={victoryActive}
        />
      </Animated.View>
      <DefeatDustOverlay
        width={width}
        height={height}
        active={pose === 'defeat'}
        impactDelayMs={defeatImpactDelayMs('topple')}
        groundOffsetY={grounded ? 0 : defeatDropPx != null ? defeatDropPx * 0.9 : height * 0.3}
      />
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
  duelCorner = 'bottomLeft',
  defeatDropPx,
}: BaseProps & {
  characterId?: number;
  victoryActive?: boolean;
  duelCorner?: DuelCorner;
  /** 낙하 거리 px — landscape 등 같은 지면선 구도에서 제자리 착지용 */
  defeatDropPx?: number;
}) {
  const hasPng = !!getPlayerSpriteSource(characterId, 'idle');
  const hasDown = !!getPlayerDownSource(characterId);
  const grounded = Boolean(CLARITY_PLAYERS[characterId]);
  const motionStyle = useDuelSpriteMotion(
    pose,
    victoryActive,
    duelCorner,
    hasDown ? 'topple' : 'collapse',
    height,
    defeatDropPx,
    grounded,
  );

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
        <MuzzleFlashOverlay
          width={width}
          height={height}
          flipHorizontal={grounded}
          anchorX={grounded ? (characterId === 2 ? 0.07 : 0.22) : undefined}
          active={pose === 'shoot' && !victoryActive}
        />
        <VictoryEffectsOverlay
          mode="player"
          id={characterId}
          width={width}
          height={height}
          active={victoryActive}
        />
      </Animated.View>
      <DefeatDustOverlay
        width={width}
        height={height}
        active={pose === 'defeat'}
        impactDelayMs={defeatImpactDelayMs(hasDown ? 'topple' : 'collapse')}
        groundOffsetY={
          grounded ? 0 : defeatDropPx != null ? defeatDropPx * 0.9 : height * (hasDown ? 0.3 : 0.38)
        }
      />
    </View>
  );
});

/** 로컬 2인전 — player/npc 스킨을 같은 슬롯 API로 렌더 */
export const LocalDuelSkinSprite = memo(function LocalDuelSkinSprite({
  skin,
  width,
  height,
  flipHorizontal,
  style,
  pose = 'idle',
  victoryActive = false,
  duelCorner,
  defeatDropPx,
}: BaseProps & {
  skin: LocalDuelSkin;
  victoryActive?: boolean;
  duelCorner?: DuelCorner;
  defeatDropPx?: number;
}) {
  if (skin.kind === 'npc') {
    return (
      <NpcCharacterSprite
        npcId={skin.id}
        width={width}
        height={height}
        flipHorizontal={flipHorizontal}
        style={style}
        pose={pose}
        victoryActive={victoryActive}
        duelCorner={duelCorner ?? 'topRight'}
        defeatDropPx={defeatDropPx}
      />
    );
  }
  return (
    <PlayerCharacterSprite
      characterId={skin.id}
      width={width}
      height={height}
      flipHorizontal={flipHorizontal}
      style={style}
      pose={pose}
      victoryActive={victoryActive}
      duelCorner={duelCorner ?? 'bottomLeft'}
      defeatDropPx={defeatDropPx}
    />
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
