export type NpcTier =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'master'
  | 'legend';

export type NpcDefinition = {
  id: number;
  name: string;
  title: string;
  /** NPC 목표 반응 시간(ms). 낮을수록 강함 */
  reactionMs: number;
  tier: NpcTier;
  bossFlag: boolean;
  /** 진행도에 따라 갱신 (기본: 1단계만 true) */
  unlocked: boolean;
};
