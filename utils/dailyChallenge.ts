import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PvpMatchResult } from '@/types/pvp';

const DAILY_DONE_PREFIX = 'high-noon-daily-done:';

export type DailyChallengePayload = {
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

/** UTC YYYY-MM-DD */
export function utcDateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function hashDate(dateKey: string): number {
  let h = 2166136261;
  for (let i = 0; i < dateKey.length; i += 1) {
    h ^= dateKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 서버 없이도 전 세계 동일 시드에 가까운 로컬 데일리 */
export function buildLocalDaily(dateKey = utcDateKey()): DailyChallengePayload {
  const h = hashDate(dateKey);
  const base = 200 + (h % 100);
  const sample_ms: [number, number, number] = [
    base + (h % 40),
    base + ((h >> 3) % 50) - 10,
    base + ((h >> 7) % 45),
  ].map((v) => Math.max(120, Math.min(400, Math.round(v)))) as [
    number,
    number,
    number,
  ];
  const mmdd = dateKey.slice(5, 7) + dateKey.slice(8, 10);
  return {
    challenge_date: dateKey,
    opponent_name: `Daily Outlaw #${mmdd}`,
    sample_ms,
    character_id: 1 + (h % 4),
    cosmetic_npc_id: null,
    completed: false,
    completion: null,
  };
}

export async function loadLocalDailyCompletion(
  dateKey: string,
): Promise<DailyChallengePayload['completion']> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_DONE_PREFIX + dateKey);
    if (!raw) return null;
    return JSON.parse(raw) as DailyChallengePayload['completion'];
  } catch {
    return null;
  }
}

export async function saveLocalDailyCompletion(
  dateKey: string,
  completion: NonNullable<DailyChallengePayload['completion']>,
): Promise<void> {
  await AsyncStorage.setItem(
    DAILY_DONE_PREFIX + dateKey,
    JSON.stringify(completion),
  );
}

export async function getLocalDaily(): Promise<DailyChallengePayload> {
  const dateKey = utcDateKey();
  const base = buildLocalDaily(dateKey);
  const completion = await loadLocalDailyCompletion(dateKey);
  return {
    ...base,
    completed: completion != null,
    completion,
  };
}

export async function submitLocalDaily(input: {
  playerRounds: (number | null)[];
  scorePlayer: number;
  scoreOpponent: number;
  result: PvpMatchResult;
  shared?: boolean;
}): Promise<DailySubmitResult> {
  const dateKey = utcDateKey();
  const existing = await loadLocalDailyCompletion(dateKey);
  if (existing) {
    const shared = existing.shared || Boolean(input.shared);
    if (shared && !existing.shared) {
      const next = { ...existing, shared: true };
      await saveLocalDailyCompletion(dateKey, next);
      return {
        already_completed: true,
        challenge_date: dateKey,
        result: existing.result,
        score_player: existing.score_player,
        score_opponent: existing.score_opponent,
        avg_ms: existing.avg_ms,
        shared: true,
        badge: 'daily_duelist',
      };
    }
    return {
      already_completed: true,
      challenge_date: dateKey,
      result: existing.result,
      score_player: existing.score_player,
      score_opponent: existing.score_opponent,
      avg_ms: existing.avg_ms,
      shared: existing.shared,
      badge: 'daily_duelist',
    };
  }

  const vals = input.playerRounds.filter(
    (v): v is number => v != null && v >= 80 && v <= 2500,
  );
  const avg_ms =
    vals.length > 0
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      : null;

  const completion = {
    score_player: input.scorePlayer,
    score_opponent: input.scoreOpponent,
    result: input.result,
    avg_ms,
    shared: Boolean(input.shared),
  };
  await saveLocalDailyCompletion(dateKey, completion);
  return {
    already_completed: false,
    challenge_date: dateKey,
    result: input.result,
    score_player: input.scorePlayer,
    score_opponent: input.scoreOpponent,
    avg_ms,
    shared: completion.shared,
    badge: 'daily_duelist',
  };
}
