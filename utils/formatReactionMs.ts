/**
 * UI 표시용 — ms를 소수 첫째 자리까지 표기(정수면 `.0` 생략).
 * `toFixed(1)`로 긴 부동소수 문자열이 그대로 나오는 경우를 막음.
 */
export function formatReactionMs(ms: number): string {
  const n = Number(ms);
  if (!Number.isFinite(n)) return '—';
  const s = n.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}
