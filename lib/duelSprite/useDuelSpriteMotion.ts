import { useLayoutEffect } from 'react';
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
  /**
   * 낙하 거리(px). 기본은 portrait 대각선 구도용(앞쪽 낮은 지면으로 추락).
   * landscape처럼 이미 같은 지면선에 서 있으면 작은 값을 넘겨 제자리 착지.
   */
  defeatDropPx?: number,
) {
  const phase = useSharedValue(0);
  const T = DUEL_SPRITE_TIMING;
  const knock = duelDefeatKnockback(corner);
  const defeatMs = defeatMotion === 'topple' ? T.defeatToppleMs : T.defeatCollapseMs;

  useLayoutEffect(() => {
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
      // useLayoutEffect에서 0으로 맞춘 뒤 피격 타임라인 — 첫 프레임 연속성은 스타일 쪽 shoot 잔여로 처리
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
      const dir = knock.rotate >= 0 ? 1 : -1;

      // shoot kick 잔여 → 피격으로 이어 붙이기 (첫 프레임 팝 방지)
      const entryT = Math.min(1, p / 0.1);
      const entryE = entryT * entryT * (3 - 2 * entryT);
      const shootCarryY = -4.2 * (1 - entryE);
      const shootCarryScale = 0.03 * (1 - entryE);

      // ── 공통 구간 ──
      // 1) 피격 휘청 (0 → hitEnd)
      const hitEnd = 0.17;
      const hitT = Math.min(1, p / hitEnd);
      const hitE = 1 - (1 - hitT) * (1 - hitT);

      // 2) topple: defeat 아트로 기울며 낙하 (hitEnd → swapAt)
      const swapAt = T.defeatDownSwapFrac;
      const fallT = p <= hitEnd ? 0 : Math.min(1, (p - hitEnd) / Math.max(0.001, swapAt - hitEnd));
      const fallE = fallT * fallT;

      // 3) down 아트 착지 후 바닥에 안착 (swapAt → 1)
      const groundT = p <= swapAt ? 0 : Math.min(1, (p - swapAt) / Math.max(0.001, 1 - swapAt));
      const settleE = 1 - (1 - groundT) * (1 - groundT);
      const bounce =
        groundT > 0 ? Math.sin(Math.min(1, groundT * 3.2) * Math.PI) * (1 - groundT * 0.7) * 0.55 : 0;

      if (defeatMotion === 'topple') {
        const tipDeg = dir * 44;
        const peakFallY = defeatDropPx ?? figureHeight * 0.34;
        const fallX = dir * 32;

        // defeat 아트: 피격 → 기울며 떨어짐 / down 아트: 회전 0으로 복귀하며 바닥에 누움
        const rotDuringFall = knock.rotate + (tipDeg - knock.rotate) * (hitE * 0.55 + fallE * 0.45);
        const flattenT = p <= swapAt ? 0 : Math.min(1, (p - swapAt) / 0.16);
        const rot = rotDuringFall * (1 - flattenT);

        const ty =
          shootCarryY +
          knock.y * hitE +
          peakFallY * (fallE * 0.88 + settleE * 0.12) -
          12 * bounce;
        const tx = knock.x * hitE + fallX * (fallE * 0.92 + settleE * 0.08);

        return {
          transform: [
            { translateX: tx },
            { translateY: ty },
            { rotate: `${rot}deg` },
            { scale: 1 + shootCarryScale - 0.05 * fallE },
          ],
          opacity: 1 - 0.04 * fallE,
        };
      }

      // collapse — down 에셋 없을 때 defeat 아트로 통째로 낙하
      const peakFallY = defeatDropPx ?? figureHeight * 0.4;
      const fallX = dir * 26;
      const tipDeg = dir * 22;
      const landAt = T.defeatCollapseLandFrac;

      const collapseFallT =
        p <= hitEnd ? 0 : Math.min(1, (p - hitEnd) / Math.max(0.001, landAt - hitEnd));
      const collapseFallE = collapseFallT * collapseFallT;
      const collapseGroundT =
        p <= landAt ? 0 : Math.min(1, (p - landAt) / Math.max(0.001, 1 - landAt));
      const collapseBounce =
        collapseGroundT > 0
          ? Math.sin(Math.min(1, collapseGroundT * 3) * Math.PI) *
            (1 - collapseGroundT * 0.65) *
            0.5
          : 0;

      const rot = knock.rotate * hitE + (tipDeg - knock.rotate) * collapseFallE;
      const ty =
        shootCarryY + knock.y * hitE + peakFallY * collapseFallE - 10 * collapseBounce;
      const tx = knock.x * hitE + fallX * collapseFallE;

      return {
        transform: [
          { translateX: tx },
          { translateY: ty },
          { rotate: `${rot}deg` },
          { scale: 1 + shootCarryScale - 0.06 * collapseFallE },
        ],
        opacity: 1 - 0.05 * collapseFallE,
      };
    }
    return {};
  });
}
