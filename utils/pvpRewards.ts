import { NPCS } from '@/constants/npcs';

export function unlockedCosmeticNpcIds(input: {
  npcById: Record<number, { cleared?: boolean } | undefined>;
  paleRiderUnlocked: boolean;
}): number[] {
  return NPCS.filter((n) => {
    const cleared = input.npcById[n.id]?.cleared === true;
    if (!cleared) return false;
    if (n.secret) return input.paleRiderUnlocked;
    return true;
  }).map((n) => n.id);
}
