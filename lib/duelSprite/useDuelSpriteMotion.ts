import { useEffect } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { DuelCorner } from '@/constants/duelArena';
import { duelDefeatKnockback } from '@/constants/duelArena';
import type { SpritePose } from '@/constants/sprites';
import { RM_GAME } from '@/constants/reanimatedGame';

import { DUEL_SPRITE_TIMING } from './poseSpecs';

/** 결투 캐릭터 공통 procedural 모션 — 포즈별 스프라이트와 합쳐 먼지바람과 동일한 느낌 */
export function useDuelSpriteMotion(
  pose: SpritePose,
  victoryActive = false,
  corner: DuelCorner = 'bottomLeft',
) {
  const phase = useSharedValue(0);
  const T = DUEL_SPRITE_TIMING;
  const knock = duelDefeatKnockback(corner);

  useEffect(() => {
    if (victoryActive && pose === 'idle') {
      phase.value = 1;
      phase.value = withSequence(
        withTiming(0.15, {
          duration: T.victoryHolsterMs,
          easing: Easing.out(Easing.cubic),
          reduceMotion: RM_GAME,
        }),
        withRepeat(
          withSequence(
            withTiming(0.45, {
              duration: T.victoryPulseMs,
              easing: Easing.inOut(Easing.sin),
              reduceMotion: RM_GAME,
            }),
            withTiming(0.15, {
              duration: T.victoryPulseMs,
              easing: Easing.inOut(Easing.sin),
              reduceMotion: RM_GAME,
            }),
          ),
          -1,
          false,
        ),
      );
      return;
    }

    if (pose === 'idle') {
      phase.value = 0;
      phase.value = withRepeat(
        withSequence(
          withTiming(1, {
            duration: T.idleBobMs,
            easing: Easing.inOut(Easing.sin),
            reduceMotion: RM_GAME,
          }),
          withTiming(0, {
            duration: T.idleBobMs,
            easing: Easing.inOut(Easing.sin),
            reduceMotion: RM_GAME,
          }),
        ),
        -1,
        false,
      );
      return;
    }
    if (pose === 'aim') {
      phase.value = 0;
      phase.value = withRepeat(
        withSequence(
          withTiming(1, {
            duration: T.aimPulseMs,
            easing: Easing.inOut(Easing.quad),
            reduceMotion: RM_GAME,
          }),
          withTiming(0, {
            duration: T.aimPulseMs,
            easing: Easing.inOut(Easing.quad),
            reduceMotion: RM_GAME,
          }),
        ),
        -1,
        false,
      );
      return;
    }
    if (pose === 'shoot') {
      phase.value = withSequence(
        withTiming(1, {
          duration: T.shootKickInMs,
          easing: Easing.out(Easing.cubic),
          reduceMotion: RM_GAME,
        }),
        withTiming(0.35, {
          duration: T.shootKickHoldMs,
          easing: Easing.out(Easing.quad),
          reduceMotion: RM_GAME,
        }),
      );
      return;
    }
    if (pose === 'defeat') {
      phase.value = 0;
      phase.value = withTiming(1, {
        duration: T.defeatInMs,
        easing: Easing.out(Easing.cubic),
        reduceMotion: RM_GAME,
      });
      return;
    }
    phase.value = withTiming(0, {
      duration: T.poseFadeMs,
      easing: Easing.out(Easing.quad),
      reduceMotion: RM_GAME,
    });
  }, [
    phase,
    pose,
    victoryActive,
    corner,
    T.aimPulseMs,
    T.defeatInMs,
    T.idleBobMs,
    T.poseFadeMs,
    T.shootKickHoldMs,
    T.shootKickInMs,
    T.victoryHolsterMs,
    T.victoryPulseMs,
  ]);

  return useAnimatedStyle(() => {
    if (victoryActive && pose === 'idle') {
      const holster = phase.value;
      return {
        transform: [
          { translateY: -7 * holster },
          { scale: 1 + 0.055 * holster },
          { rotate: `${5 * holster}deg` },
        ],
      };
    }
    if (pose === 'idle') {
      const t = phase.value;
      return {
        transform: [
          { translateY: -3 * t },
          { scale: 1 + 0.025 * t },
        ],
      };
    }
    if (pose === 'aim') {
      const t = phase.value;
      return {
        transform: [
          { translateY: -2 - 1 * t },
          { scale: 1.015 + 0.015 * t },
        ],
      };
    }
    if (pose === 'shoot') {
      const kick = phase.value;
      return {
        transform: [
          { translateY: -3 - 4 * kick },
          { scale: 1.025 + 0.025 * kick },
        ],
      };
    }
    if (pose === 'defeat') {
      const p = phase.value;
      const peak = T.defeatKnockbackPeak;
      const knockT = p < peak ? p / peak : 1;
      const knockEase = Math.sin(knockT * Math.PI * 0.5);
      const fallT = p < peak * 0.55 ? 0 : Math.min(1, (p - peak * 0.55) / (1 - peak * 0.55));
      const fallEase = fallT * fallT;

      return {
        transform: [
          { translateX: knock.x * knockEase + knock.x * 0.25 * fallEase },
          {
            translateY:
              knock.y * knockEase + 34 * fallEase + (corner === 'topRight' ? 8 * fallEase : 0),
          },
          { rotate: `${knock.rotate * knockEase + knock.rotate * 0.45 * fallEase}deg` },
          { scale: 1 - 0.07 * fallEase },
        ],
        opacity: 0.96 - 0.1 * fallEase,
      };
    }
    return {};
  });
}
