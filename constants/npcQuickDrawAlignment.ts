/** NPC Duel batch-only anatomical registration, in the unchanged 1254px square.
 * Pelvis = upper-thigh junction, manually reviewed against source artwork (±8px).
 * Bounds use alpha >=16 to exclude invisible matte specks, never to center bodies.
 * READY is the fixed anatomical reference. Pilot and shared art are untouched. */
type Kind = 'player' | 'npc';
type Stage = 'ready' | 'preparation' | 'draw' | 'aim' | 'fire';
type Measurement = { pelvis: number; bounds: readonly [number, number]; flip: boolean };
export const QUICK_DRAW_ALIGNMENT: Partial<Record<string, Record<Stage, Measurement>>> = {
  'player:2': {
    ready: { pelvis: 630, bounds: [323, 981], flip: false },
    preparation: { pelvis: 640, bounds: [272, 1014], flip: false },
    draw: { pelvis: 640, bounds: [282, 1008], flip: false },
    aim: { pelvis: 535, bounds: [180, 1229], flip: false },
    fire: { pelvis: 535, bounds: [177, 1232], flip: false },
  },
  'player:3': {
    ready: { pelvis: 630, bounds: [338, 964], flip: false },
    preparation: { pelvis: 650, bounds: [235, 1052], flip: false },
    draw: { pelvis: 650, bounds: [295, 993], flip: false },
    aim: { pelvis: 600, bounds: [260, 1227], flip: false },
    fire: { pelvis: 600, bounds: [258, 1232], flip: false },
  },
  'npc:2': {
    ready: { pelvis: 630, bounds: [354, 988], flip: true },
    preparation: { pelvis: 650, bounds: [329, 1019], flip: true },
    draw: { pelvis: 630, bounds: [294, 1008], flip: true },
    aim: { pelvis: 535, bounds: [217, 1198], flip: true },
    fire: { pelvis: 650, bounds: [311, 998], flip: false },
  },
  'npc:4': {
    ready: { pelvis: 640, bounds: [361, 965], flip: true },
    preparation: { pelvis: 650, bounds: [320, 1019], flip: true },
    draw: { pelvis: 650, bounds: [303, 987], flip: true },
    aim: { pelvis: 520, bounds: [174, 1201], flip: true },
    fire: { pelvis: 650, bounds: [263, 1004], flip: false },
  },
};
const CANVAS = 1254;
const screenX = (x: number, flip: boolean) => flip ? CANVAS - x : x;
export function quickDrawOffsetX(kind: Kind, id: number, stage: Stage) {
  const frames = QUICK_DRAW_ALIGNMENT[`${kind}:${id}`];
  if (!frames) return 0;
  return (screenX(frames.ready.pelvis, frames.ready.flip) - screenX(frames[stage].pelvis, frames[stage].flip)) / CANVAS;
}
// Unchanged reaction artwork also shares this fixed lane; including it prevents
// a separate containment jump when the cinematic actor hands off to HIT/DOWN.
const REACTION_BOUNDS: Record<string, readonly [number, number]> = {
  'player:2': [119, 1238],
  'player:3': [255, 1178],
  'npc:2': [130, 926],
  'npc:4': [92, 992],
};
export function quickDrawBounds(kind: Kind, id: number): readonly [number, number] | null {
  const key = `${kind}:${id}`, frames = QUICK_DRAW_ALIGNMENT[key];
  if (!frames) return null;
  const bounds: (readonly [number, number])[] = (Object.keys(frames) as Stage[]).map(stage => {
    const frame = frames[stage], dx = quickDrawOffsetX(kind, id, stage);
    return frame.flip
      ? [(CANVAS - frame.bounds[1]) / CANVAS + dx, (CANVAS - frame.bounds[0]) / CANVAS + dx]
      : [frame.bounds[0] / CANVAS + dx, frame.bounds[1] / CANVAS + dx];
  });
  const reaction = REACTION_BOUNDS[key];
  if (reaction) bounds.push([reaction[0] / CANVAS, reaction[1] / CANVAS]);
  return [Math.min(...bounds.map(b => b[0])), Math.max(...bounds.map(b => b[1]))];
}
/** One minimal viewport clamp for every phase, without resizing the locked pair. */
export function quickDrawContainedLeft(input: { kind: Kind; id: number; left: number; size: number; width: number; paddingLeft: number; paddingRight: number }) {
  const bounds = quickDrawBounds(input.kind, input.id);
  if (!bounds) return input.left;
  const minimum = input.paddingLeft - bounds[0] * input.size;
  const maximum = input.width - input.paddingRight - bounds[1] * input.size;
  return Math.max(minimum, Math.min(input.left, maximum));
}
