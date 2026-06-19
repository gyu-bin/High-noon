/** NPC 카드·HUD — title/name 중복(먼지바람 먼지바람) 방지 */
export function npcDisplayName(npc: { title: string; name: string }): string {
  const title = npc.title.trim();
  const name = npc.name.trim();
  if (!name) return title;
  if (!title || title === name) return name;
  return `${title} ${name}`;
}
