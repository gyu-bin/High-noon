import { CHARACTERS } from '@/constants/characters';
import { NPCS } from '@/constants/npcs';

export type LocalDuelSkinKind = 'player' | 'npc';

export type LocalDuelSkin = {
  kind: LocalDuelSkinKind;
  id: number;
};

export const DEFAULT_LOCAL_P1_SKIN: LocalDuelSkin = { kind: 'player', id: 1 };
export const DEFAULT_LOCAL_P2_SKIN: LocalDuelSkin = { kind: 'player', id: 2 };

/** URL/스토어용 — `p:1` / `n:5` */
export function encodeLocalDuelSkin(skin: LocalDuelSkin): string {
  return `${skin.kind === 'player' ? 'p' : 'n'}:${skin.id}`;
}

export function isSameLocalDuelSkin(a: LocalDuelSkin, b: LocalDuelSkin): boolean {
  return a.kind === b.kind && a.id === b.id;
}

function skinExists(skin: LocalDuelSkin): boolean {
  if (skin.kind === 'player') {
    return CHARACTERS.some((c) => c.id === skin.id);
  }
  return NPCS.some((n) => n.id === skin.id);
}

export function parseLocalDuelSkin(
  raw: string | string[] | undefined,
  fallback: LocalDuelSkin,
): LocalDuelSkin {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || typeof v !== 'string') return fallback;
  const m = /^(p|n):(\d+)$/i.exec(v.trim());
  if (!m) return fallback;
  const kind: LocalDuelSkinKind = m[1]!.toLowerCase() === 'p' ? 'player' : 'npc';
  const id = Number(m[2]);
  if (!Number.isFinite(id) || id < 1) return fallback;
  const skin: LocalDuelSkin = { kind, id };
  return skinExists(skin) ? skin : fallback;
}

/** 로컬 2인전 — 유저+NPC 전부 (해금 없음) */
export function listLocalDuelSkins(): LocalDuelSkin[] {
  return [
    ...CHARACTERS.map((c) => ({ kind: 'player' as const, id: c.id })),
    ...NPCS.map((n) => ({ kind: 'npc' as const, id: n.id })),
  ];
}

export function normalizeLocalDuelSkin(
  value: unknown,
  fallback: LocalDuelSkin,
): LocalDuelSkin {
  if (!value || typeof value !== 'object') return fallback;
  const kind = (value as { kind?: unknown }).kind;
  const id = (value as { id?: unknown }).id;
  if ((kind !== 'player' && kind !== 'npc') || typeof id !== 'number') {
    return fallback;
  }
  const skin: LocalDuelSkin = { kind, id };
  return skinExists(skin) ? skin : fallback;
}
