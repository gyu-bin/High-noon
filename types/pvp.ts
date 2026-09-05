export type PvpRankTier =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond';

export type PvpProfile = {
  id: string;
  display_name: string;
  character_id: number;
  cosmetic_npc_id: number | null;
  rating: number;
  rank_tier: PvpRankTier | string;
  wins: number;
  losses: number;
};

export type PvpOpponent = {
  id: string;
  display_name: string;
  character_id: number;
  cosmetic_npc_id: number | null;
  rating: number;
  rank_tier: PvpRankTier | string;
  is_bot: boolean;
  sample_ms: [number, number, number];
};

export type PvpMatchmakeResult = {
  player: PvpProfile;
  opponent: PvpOpponent;
};

export type PvpMatchResult = 'win' | 'loss' | 'draw';

export type PvpMatchMode = 'ranked' | 'daily';

export type DailyChallenge = {
  challenge_date: string;
  opponent_name: string;
  sample_ms: [number, number, number];
  character_id: number;
  cosmetic_npc_id: number | null;
  completed: boolean;
  completion: {
    score_player: number;
    score_opponent: number;
    result: PvpMatchResult;
    avg_ms: number | null;
    shared: boolean;
  } | null;
};

export type DailySubmitResult = {
  already_completed: boolean;
  challenge_date: string;
  result: PvpMatchResult;
  score_player: number;
  score_opponent: number;
  avg_ms: number | null;
  shared: boolean;
  badge: string;
};

export type PvpRoundRecord = {
  playerMs: number | null;
  opponentMs: number | null;
  winner: 'player' | 'opponent' | 'draw';
  playerEarly: boolean;
  playerTimeout: boolean;
};

export type PvpSubmitResult = {
  match_id: string;
  rating_before: number;
  rating_after: number;
  rating_delta: number;
  rank_tier: string;
  wins: number;
  losses: number;
};

export type PvpLeaderboardEntry = {
  id: string;
  display_name: string;
  character_id: number;
  cosmetic_npc_id: number | null;
  rating: number;
  rank_tier: string;
  wins: number;
  losses: number;
  rank: number;
};

export type PvpLeaderboardResult = {
  entries: PvpLeaderboardEntry[];
  me: {
    id: string;
    display_name: string;
    rating: number;
    rank_tier: string;
    wins: number;
    losses: number;
    rank: number;
  };
};
