import { useEffect } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { SpritePose } from '@/constants/sprites';
import { RM_GAME } from '@/constants/reanimatedGame';

import { DUEL_SPRITE_TIMING } from './poseSpecs';

/** idle / aim / shoot / defeat(→down) 레이어 크로스페이드 */
export function usePoseOpacity(pose: SpritePose, hasDown = false) {
  const T = DUEL_SPRITE_TIMING;
  const idle = useSharedValue(pose === 'idle' ? 1 : 0);
  const aim = useSharedValue(pose === 'aim' ? 1 : 0);
  const defeat = useSharedValue(pose === 'defeat' ? 1 : 0);
  const down = useSharedValue(0);
  const shoot = useSharedValue(pose === 'shoot' ? 1 : 0);
  const shootFrame = useSharedValue(0);

  useEffect(() => {
    const shootIn = {
      duration: T.shootInMs,
      easing: Easing.out(Easing.quad),
      reduceMotion: RM_GAME,
    };
    const isShoot = pose === 'shoot';
    const toDefeat = pose === 'defeat';
    const fadeMs = toDefeat ? T.defeatCrossfadeMs : T.poseFadeMs;
    const fadeCfg = {
      duration: fadeMs,
      easing: Easing.out(Easing.quad),
      reduceMotion: RM_GAME,
    };

    idle.value = withTiming(pose === 'idle' ? 1 : 0, isShoot ? shootIn : fadeCfg);
    aim.value = withTiming(pose === 'aim' ? 1 : 0, isShoot ? shootIn : fadeCfg);
    shoot.value = withTiming(isShoot ? 1 : 0, toDefeat ? fadeCfg : shootIn);

    if (toDefeat && hasDown) {
      // 휘청(defeat) → 바닥에 누움(down) — 착지 직전에 교체
      const swapDelay = Math.max(
        fadeMs,
        Math.round(T.defeatToppleMs * T.defeatDownSwapFrac),
      );
      const swapCfg = {
        duration: T.defeatDownSwapMs,
        easing: Easing.out(Easing.quad),
        reduceMotion: RM_GAME,
      };
      defeat.value = withSequence(
        withTiming(1, fadeCfg),
        withTiming(1, { duration: swapDelay - fadeMs, reduceMotion: RM_GAME }),
        withTiming(0, swapCfg),
      );
      down.value = 0;
      down.value = withDelay(swapDelay, withTiming(1, swapCfg));
    } else {
      defeat.value = withTiming(toDefeat ? 1 : 0, fadeCfg);
      down.value = withTiming(0, fadeCfg);
    }

    if (isShoot) {
      shootFrame.value = 0;
      shootFrame.value = withTiming(1, {
        duration: T.shootCrossfadeMs,
        easing: Easing.out(Easing.cubic),
        reduceMotion: RM_GAME,
      });
    } else {
      shootFrame.value = 0;
    }
  }, [
    pose,
    hasDown,
    idle,
    aim,
    defeat,
    down,
    shoot,
    shootFrame,
    T.poseFadeMs,
    T.defeatCrossfadeMs,
    T.defeatDownSwapFrac,
    T.defeatDownSwapMs,
    T.defeatToppleMs,
    T.shootCrossfadeMs,
    T.shootInMs,
  ]);

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
    down,
    shootFrame0Style,
    shootFrame1Style,
    singleShootStyle,
  };
}
