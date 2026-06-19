import { useEffect } from 'react';
import { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { SpritePose } from '@/constants/sprites';
import { RM_GAME } from '@/constants/reanimatedGame';

import { DUEL_SPRITE_TIMING } from './poseSpecs';

/** idle / aim / shoot / defeat 레이어 크로스페이드 */
export function usePoseOpacity(pose: SpritePose) {
  const T = DUEL_SPRITE_TIMING;
  const idle = useSharedValue(pose === 'idle' ? 1 : 0);
  const aim = useSharedValue(pose === 'aim' ? 1 : 0);
  const defeat = useSharedValue(pose === 'defeat' ? 1 : 0);
  const shoot = useSharedValue(pose === 'shoot' ? 1 : 0);
  const shootFrame = useSharedValue(0);

  useEffect(() => {
    const cfg = {
      duration: T.poseFadeMs,
      easing: Easing.out(Easing.quad),
      reduceMotion: RM_GAME,
    };
    const shootIn = {
      duration: T.shootInMs,
      easing: Easing.out(Easing.quad),
      reduceMotion: RM_GAME,
    };
    const isShoot = pose === 'shoot';

    idle.value = withTiming(pose === 'idle' ? 1 : 0, isShoot ? shootIn : cfg);
    aim.value = withTiming(pose === 'aim' ? 1 : 0, isShoot ? shootIn : cfg);
    defeat.value = withTiming(pose === 'defeat' ? 1 : 0, isShoot ? shootIn : cfg);
    shoot.value = withTiming(isShoot ? 1 : 0, shootIn);

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
  }, [pose, idle, aim, defeat, shoot, shootFrame, T.poseFadeMs, T.shootCrossfadeMs, T.shootInMs]);

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
