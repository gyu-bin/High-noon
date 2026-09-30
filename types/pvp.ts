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
  rating: number;
  rank_tier: PvpRankTier | string;
  wins: number;
  losses: number;
};

/**
 * Ghost Snapshot V2: one round of one completed ranked match.
 * SHOT = valid post-BANG reaction, INVALID = post-BANG but outside 80..2499
 * (normalized value kept for audit, never a speed), EARLY = before BANG,
 * TIMEOUT = no input.
 */
export type GhostOutcome = 'shot' | 'early' | 'timeout' | 'invalid';

export type GhostRound =
  | { outcome: 'shot'; reactionMs: number }
  | { outcome: 'invalid'; reactionMs: number }
  | { outcome: 'early'; reactionMs: null }
  | { outcome: 'timeout'; reactionMs: null };

/** Server wire form (snake_case, integer ms). */
export type GhostRoundWire = {
  outcome: GhostOutcome;
  reaction_ms: number | null;
};

export type PvpOpponent = {
  id: string;
  display_name: string;
  character_id: number;
  rating: number;
  rank_tier: PvpRankTier | string;
  is_bot: boolean;
  /** V1 replay values (SHOT ms). Non-SHOT V2 rounds carry a fallback here. */
  sample_ms: [number, number, number];
  /** Present only for Ghost V2 assignments; authoritative for replay. */
  ghost_rounds?: [GhostRound, GhostRound, GhostRound];
};

export type PvpMatchmakeResult = {
  match_id?: string;
  player: PvpProfile;
  opponent: PvpOpponent;
  ghost_version?: 1 | 2;
};

export type PvpMatchResult = 'win' | 'loss' | 'draw';

export type PvpMatchMode = 'ranked' | 'daily' | 'friend';

export type DailyChallenge = {
  challenge_date: string;
  opponent_name: string;
  sample_ms: [number, number, number];
  character_id: number;
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

export type FriendChallenge = {
  id: string;
  code: string;
  creator_id?: string;
  creator_name: string;
  sample_ms: [number, number, number];
  character_id: number;
  creator_avg_ms: number | null;
  creator_best_ms: number | null;
  score_creator: number;
  expires_at: string;
  is_creator?: boolean;
  completed?: boolean;
  completion?: {
    score_player: number;
    score_creator: number;
    result: PvpMatchResult;
    avg_ms: number | null;
    best_ms: number | null;
  } | null;
};

export type FriendChallengeCreated = {
  id: string;
  code: string;
  creator_name: string;
  sample_ms: [number, number, number];
  character_id: number;
  creator_avg_ms: number | null;
  creator_best_ms: number | null;
  score_creator: number;
  expires_at: string;
};

export type FriendChallengeSubmitResult = {
  already_completed: boolean;
  code: string;
  result: PvpMatchResult;
  score_player: number;
  score_creator: number;
  avg_ms: number | null;
  best_ms: number | null;
  creator_name: string;
  creator_avg_ms: number | null;
  creator_best_ms: number | null;
};

export type PvpRoundRecord = {
  playerMs: number | null;
  opponentMs: number | null;
  winner: 'player' | 'opponent' | 'draw';
  playerEarly: boolean;
  playerTimeout: boolean;
  /**
   * Post-BANG tap whose normalized reaction is outside 80..2499: INVALID, a lost
   * round and never a speed record. Distinct from an early (pre-BANG) tap.
   * `playerMs` keeps the raw measurement.
   */
  playerInvalid?: boolean;
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

export type PvpHistoryEntry = {
  id: string;
  opponent_name: string;
  opponent_character_id: number;
  result: PvpMatchResult;
  score_player: number;
  score_opponent: number;
  rating_delta: number;
  completed_at: string;
  /** Additive (Ghost V2 servers). Absent / null on older servers and legacy rows. */
  ghost_version?: number | null;
  player_rounds?: (number | null)[] | null;
  player_round_detail?: GhostRoundWire[] | null;
  opponent_rounds?: GhostRoundWire[] | null;
};
