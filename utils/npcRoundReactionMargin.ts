/** A measured round margin, never a match-wide score or an ability-derived win. */
export function npcRoundReactionMargin(data: {
  kind: 'win' | 'loss';
  playerMs: number | null;
  npcMs: number | null;
  reason?: string;
  npcMisfire?: boolean;
  lastStand?: boolean;
  revive?: boolean;
}): number | null {
  const { playerMs, npcMs } = data;
  if (playerMs == null || npcMs == null || !Number.isFinite(playerMs) || !Number.isFinite(npcMs)
    || playerMs < 0 || npcMs < 0 || data.npcMisfire || data.lastStand || data.revive) return null;
  if (data.kind === 'loss' && data.reason !== 'slower') return null;
  if (data.kind === 'win' ? playerMs >= npcMs : playerMs <= npcMs) return null;
  return Math.abs(npcMs - playerMs);
}
