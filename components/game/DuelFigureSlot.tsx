import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { duelFigureTransform, type DuelCorner } from '@/constants/duelArena';
import { DUEL_FIGURE_SHADOW } from '@/constants/duelPresentation';
import type { SpritePose } from '@/constants/sprites';

type Props = {
  corner: DuelCorner;
  pose: SpritePose;
  figW: number;
  figH: number;
  children: React.ReactNode;
};

/** 결투 캐릭터 — 접지 그림자·포즈 트랜스폼 */
export function DuelFigureSlot({ corner, pose, figW, figH, children }: Props) {
  const isPlayer = corner === 'bottomLeft';
  const shadow = isPlayer ? DUEL_FIGURE_SHADOW.player : DUEL_FIGURE_SHADOW.npc;

  return (
    <View style={[styles.slot, { width: figW, minHeight: figH + 10 }]}>
      <View
        pointerEvents="none"
        style={[
          styles.groundShadow,
          {
            width: Math.round(figW * shadow.widthRatio),
            bottom: shadow.bottom,
            opacity: shadow.opacity,
          },
        ]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(255, 196, 130, 0.08)', 'transparent']}
        locations={[0, 0.55, 1]}
        style={[
          styles.groundGlow,
          { width: Math.round(figW * 0.88), height: Math.round(figH * 0.18) },
        ]}
      />
      <View style={{ transform: duelFigureTransform(corner, pose) }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  groundShadow: {
    position: 'absolute',
    height: 18,
    borderRadius: 999,
    backgroundColor: '#000',
    transform: [{ scaleX: 1.35 }],
  },
  groundGlow: {
    position: 'absolute',
    bottom: 2,
    borderRadius: 999,
  },
});
