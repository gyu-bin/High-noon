/**
 * NPC 매치 최종 결과.
 * 전면 광고 직후 결과 화면이 한 프레임 params 없이 마운트되면
 * `won`이 비어 패배로 보이는 깜빡임을 막기 위해, 광고 전에 결과를 고정한다.
 */
export type NpcMatchResultSnapshot = {
  npcId: string;
  won: boolean;
  playerWins: number;
  npcWins: number;
  playerMs: string;
  npcMs: string;
  lossReason: string;
  dayNight: string;
  completionStamp: string;
};

let lastResult: NpcMatchResultSnapshot | null = null;

export function rememberNpcMatchResult(result: NpcMatchResultSnapshot): void {
  lastResult = result;
}

export function peekNpcMatchResult(): NpcMatchResultSnapshot | null {
  return lastResult;
}

export function firstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  if (value == null) return undefined;
  const s = Array.isArray(value) ? value[0] : value;
  return s === '' ? undefined : s;
}
