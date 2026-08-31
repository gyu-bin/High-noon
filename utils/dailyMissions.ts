import { NPCS } from '@/constants/npcs';

export type DailyMissionId = 'rankingPlay' | 'rankingWin' | 'todayBoss';

const DAILY_BOSS_IDS = NPCS.filter((n) => n.bossFlag && !n.secret).map((n) => n.id);

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
}

/** 기기 로컬 날짜. 랭킹 데일리는 타임존을 서버와 맞출 필요 없이 하루 단위면 된다. */
export function localDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 해금된 보스 중에서 날짜마다 한 명. 아직 보스가 없으면 첫 보스(#3).
 * #22 페일 라이더는 시크릿이라 제외.
 */
export function pickTodayBossNpcId(dateKey: string, highestUnlockedNpcId: number): number {
  const unlocked = DAILY_BOSS_IDS.filter((id) => id <= Math.max(3, highestUnlockedNpcId));
  const pool = unlocked.length > 0 ? unlocked : [DAILY_BOSS_IDS[0] ?? 3];
  return pool[hashString(dateKey) % pool.length]!;
}

export function isDailyMissionComplete(s: {
  rankingPlay: boolean;
  rankingWin: boolean;
  todayBoss: boolean;
}): boolean {
  return s.rankingPlay && s.rankingWin && s.todayBoss;
}
