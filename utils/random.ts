/** inclusive min/max (ms 등 구간 랜덤에 사용) */
export function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
