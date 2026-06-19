export type VictoryEffectKind = 'gunSmoke' | 'mouthSmoke' | 'dustWisps';

export type VictoryAnchor = {
  x: number;
  y: number;
};

export type VictoryEffectSpec = {
  kinds: VictoryEffectKind[];
  barrel: VictoryAnchor;
  mouth?: VictoryAnchor;
  gunSmokeColor: string;
  gunSmokeAccent: string;
  mouthSmokeColor?: string;
  dustColor?: string;
};

/** PNG 기준 조준 → (총구·입 위치는 0~1 비율) */
export const NPC_VICTORY_EFFECTS: Partial<Record<number, VictoryEffectSpec>> = {
  1: {
    kinds: ['gunSmoke', 'dustWisps'],
    barrel: { x: 0.62, y: 0.52 },
    gunSmokeColor: 'rgba(210, 195, 165, 0.75)',
    gunSmokeAccent: 'rgba(160, 130, 90, 0.55)',
    dustColor: 'rgba(196, 165, 116, 0.7)',
  },
  2: {
    kinds: ['gunSmoke', 'mouthSmoke'],
    barrel: { x: 0.62, y: 0.5 },
    mouth: { x: 0.41, y: 0.19 },
    gunSmokeColor: 'rgba(185, 185, 190, 0.8)',
    gunSmokeAccent: 'rgba(120, 120, 130, 0.5)',
    mouthSmokeColor: 'rgba(200, 200, 210, 0.65)',
  },
  3: {
    kinds: ['gunSmoke', 'mouthSmoke'],
    barrel: { x: 0.62, y: 0.5 },
    mouth: { x: 0.4, y: 0.18 },
    gunSmokeColor: 'rgba(160, 150, 170, 0.75)',
    gunSmokeAccent: 'rgba(90, 80, 100, 0.5)',
    mouthSmokeColor: 'rgba(140, 130, 150, 0.6)',
  },
  4: {
    kinds: ['gunSmoke', 'mouthSmoke'],
    barrel: { x: 0.62, y: 0.5 },
    mouth: { x: 0.42, y: 0.17 },
    gunSmokeColor: 'rgba(200, 175, 140, 0.75)',
    gunSmokeAccent: 'rgba(150, 120, 80, 0.55)',
    mouthSmokeColor: 'rgba(210, 190, 160, 0.65)',
  },
};

export const PLAYER_VICTORY_EFFECTS: Partial<Record<number, VictoryEffectSpec>> = {
  1: {
    kinds: ['gunSmoke', 'mouthSmoke'],
    barrel: { x: 0.62, y: 0.5 },
    mouth: { x: 0.41, y: 0.19 },
    gunSmokeColor: 'rgba(210, 195, 165, 0.75)',
    gunSmokeAccent: 'rgba(160, 130, 90, 0.55)',
    mouthSmokeColor: 'rgba(200, 190, 170, 0.6)',
  },
};

export function getVictoryEffectSpec(
  mode: 'npc' | 'player',
  id: number,
): VictoryEffectSpec | undefined {
  return mode === 'npc' ? NPC_VICTORY_EFFECTS[id] : PLAYER_VICTORY_EFFECTS[id];
}
