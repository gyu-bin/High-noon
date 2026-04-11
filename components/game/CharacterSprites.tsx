import type { FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

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
};

const DefaultNpc = Npc01;

type BaseProps = {
  width: number;
  height: number;
  flipHorizontal?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function NpcCharacterSprite({
  npcId,
  width,
  height,
  flipHorizontal,
  style,
}: BaseProps & { npcId: number }) {
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
      <Cmp width={width} height={height} />
    </View>
  );
}

export function PlayerCharacterSprite({
  width,
  height,
  flipHorizontal,
  style,
}: BaseProps) {
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
      <PlayerSvg width={width} height={height} />
    </View>
  );
}
