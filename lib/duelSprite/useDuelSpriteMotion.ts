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

import { DUEL_SPRITE_TIMING, type DuelDefeatMotion } from './poseSpecs';

/** 결투 캐릭터 공통 procedural 모션 — 포즈별 스프라이트와 합쳐 먼지바람과 동일한 느낌 */
export function useDuelSpriteMotion(
  pose: SpritePose,
  victoryActive = false,
  corner: DuelCorner = 'bottomLeft',
  defeatMotion: DuelDefeatMotion = 'collapse',
  figureHeight = 220,
) {
  const phase = useSharedValue(0);
  const T = DUEL_SPRITE_TIMING;
  const knock = duelDefeatKnockback(corner);
  const defeatMs = defeatMotion === 'topple' ? T.defeatToppleMs : T.defeatCollapseMs;
  const landFrac =
    defeatMotion === 'topple' ? T.defeatToppleLandFrac : T.defeatCollapseLandFrac;

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
      // 선형 드라이버 — 휘청/낙하/착지 곡선은 worklet에서 구간별로 계산
      phase.value = 0;
      phase.value = withTiming(1, {
        duration: defeatMs,
        easing: Easing.linear,
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
    defeatMs,
    T.aimPulseMs,
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
      const staggerEnd = defeatMotion === 'topple' ? 0.2 : 0.26;

      // 1) 피격 휘청 — 뒤로 젖혀지는 넉백
      const sT = Math.min(1, p / staggerEnd);
      const sE = Math.sin(sT * Math.PI * 0.5);

      // 2) 낙하 — 중력 가속으로 바닥까지
      const fT =
        p <= staggerEnd ? 0 : Math.min(1, (p - staggerEnd) / (landFrac - staggerEnd));
      const fE = fT * fT;

      // 3) 착지 — 짧은 바운스 후 정지
      const bT = p <= landFrac ? 0 : Math.min(1, (p - landFrac) / (1 - landFrac));
      const bounce = Math.sin(bT * Math.PI) * (1 - 0.55 * bT);

      const dir = knock.rotate >= 0 ? 1 : -1;

      if (defeatMotion === 'topple') {
        // 휘청(defeat 아트)이 기울다가, 착지 직전 down(누움) 아트로 교체되며
        // 컨테이너 회전은 0 근처로 복귀 — 실제 눕는 모습은 베이크된 에셋이 표현
        const tipDeg = dir * 30;
        const restDeg = dir * 3;
        const fallX = dir * Math.abs(knock.x) * 1.6;
        const fallY = figureHeight * 0.05;
        // 착지 후 기울기 복귀 — 몸이 바닥에 탁 떨어지는 느낌
        const settleT = Math.min(1, bT / 0.55);
        const rot =
          knock.rotate * sE + (tipDeg - knock.rotate) * fE - (tipDeg - restDeg) * settleT;

        return {
          transform: [
            { translateX: knock.x * sE + fallX * fE },
            { translateY: knock.y * sE + fallY * fE - 7 * bounce },
            { rotate: `${rot}deg` },
            { scale: 1 - 0.03 * fE },
          ],
          opacity: 1 - 0.04 * fE,
        };
      }

      // collapse — 이미 누운 defeat 아트로 크로스페이드하며 낙하·착지
      const fallY = figureHeight * 0.17;
      const rotPeak = dir * 13;
      const rotRest = dir * 7;
      const rot =
        knock.rotate * sE + (rotPeak - knock.rotate) * fE - (rotPeak - rotRest) * bT;

      return {
        transform: [
          { translateX: knock.x * sE + knock.x * 1.2 * fE },
          { translateY: knock.y * sE + fallY * fE - 6 * bounce },
          { rotate: `${rot}deg` },
          { scale: 1 - 0.045 * fE },
        ],
        opacity: 1 - 0.05 * fE,
      };
    }
    return {};
  });
}
