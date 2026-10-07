export function boundedNpcIndex(currentIndex: number, direction: -1 | 1, count: number): number {
  if (count <= 0) return 0;
  return Math.min(count - 1, Math.max(0, currentIndex + direction));
}

/** Keeps the focused NPC in the middle without wrapping the ends together. */
export function centeredNpcIndices(index: number, count: number, radius = 2): Array<number | null> {
  return Array.from({ length: radius * 2 + 1 }, (_, slot) => {
    const candidate = index + slot - radius;
    return candidate >= 0 && candidate < count ? candidate : null;
  });
}
