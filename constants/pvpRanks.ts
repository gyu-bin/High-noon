import type { PvpRankTier } from '@/types/pvp';

export const PVP_WINS_NEEDED = 2;
export const PVP_MAX_ROUNDS = 3;

export const PVP_MIN_VALID_MS = 80;
export const PVP_MAX_VALID_MS = 2500;

export const RANK_TIER_ORDER: PvpRankTier[] = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
];

/** 더미 반응속도 분포 (PvE NPC와 분리) */
export const PVP_DUMMY_MS_RANGE: Record<PvpRankTier, { min: number; max: number }> = {
  bronze: { min: 400, max: 600 },
  silver: { min: 280, max: 400 },
  gold: { min: 220, max: 280 },
  platinum: { min: 180, max: 220 },
  diamond: { min: 120, max: 180 },
};

export function ratingToRankTier(rating: number): PvpRankTier {
  if (rating < 1000) return 'bronze';
  if (rating < 1200) return 'silver';
  if (rating < 1400) return 'gold';
  if (rating < 1600) return 'platinum';
  return 'diamond';
}

export function formatRatingDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return `${delta}`;
}

export function parseRankTier(value: string): PvpRankTier {
  if ((RANK_TIER_ORDER as string[]).includes(value)) return value as PvpRankTier;
  return 'bronze';
}

export function tierRankIndex(tier: PvpRankTier): number {
  return RANK_TIER_ORDER.indexOf(tier);
}

export function higherRankTier(a: PvpRankTier, b: PvpRankTier): PvpRankTier {
  return tierRankIndex(a) >= tierRankIndex(b) ? a : b;
}

export function isRankTierUpgrade(beforeRating: number, afterTier: string): boolean {
  return (
    tierRankIndex(ratingToRankTier(beforeRating)) <
    tierRankIndex(parseRankTier(afterTier))
  );
}

export function currentSeasonKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function formatSeasonKey(key: string, locale: string): string {
  const [ys, ms] = key.split('-');
  const y = Number(ys);
  const month = Number(ms);
  if (!Number.isFinite(y) || !Number.isFinite(month)) return key;
  if (locale.startsWith('ko')) return `${y}년 ${month}월`;
  if (locale.startsWith('ja')) return `${y}年${month}月`;
  return new Date(y, month - 1, 1).toLocaleString('en', {
    month: 'short',
    year: 'numeric',
  });
}

export function averageSampleMs(samples: readonly number[]): number {
  const vals = samples.filter((n) => Number.isFinite(n) && n > 0);
  if (vals.length === 0) return 280;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
