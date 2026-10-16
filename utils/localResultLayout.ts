/** Shared by local result cards and arena: enlarged type must reserve real
 * space before the character is laid out, including P2's rotated safe edge. */
export function localResultLayout({ width, height, fontScale, paddingTop = 0, paddingBottom = 0 }: {
  width: number; height: number; fontScale: number; paddingTop?: number; paddingBottom?: number;
}) {
  const outerPadding = Math.max(34, paddingTop + 16, paddingBottom + 16);
  const desired = 102 + Math.max(0, fontScale - 1) * 76;
  // Keep a visible character and a 6px gap even on short phones. Unbounded OS
  // text sizes are announced in full through each card's accessibility label;
  // the visual multiplier is capped only when its safe zone is exhausted.
  const cardHeight = Math.max(102, Math.min(desired, 230, height / 2 - outerPadding - 72 - 14));
  return {
    cardHeight,
    cardWidth: Math.min(width - 32, 420),
    reserve: cardHeight + 14,
    textMultiplier: Math.max(1, Math.min(fontScale, (cardHeight - 20) / 82)),
  };
}
