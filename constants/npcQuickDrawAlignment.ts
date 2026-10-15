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
  // Batch 2 reuses production art only: STEADY and the 120ms draw share the clarity DRAW
  // frame, AIM and FIRE share the left-facing FIRE frame. Pelvis = crotch of the trouser
  // legs, read from the unflipped source (±10px); bounds alpha >= 16.
  'npc:3': {
    ready: { pelvis: 695, bounds: [350, 973], flip: true },
    // Dedicated STEADY (hand on holstered grip). Its legs match DRAW (lower-leg template dx 0),
    // so it shares DRAW's pelvis; the crotch scan is fooled by the dark poncho between the legs.
    preparation: { pelvis: 706, bounds: [317, 992], flip: true },
    draw: { pelvis: 706, bounds: [295, 986], flip: true },
    aim: { pelvis: 646, bounds: [301, 1015], flip: false },
    fire: { pelvis: 646, bounds: [301, 1015], flip: false },
  },
  'npc:5': {
    ready: { pelvis: 631, bounds: [370, 957], flip: true },
    // Dedicated STEADY: its legs sit 26px right of DRAW (lower-leg/thigh template match), so it is
    // registered at DRAW's pelvis + 26 to keep the body still through STEADY -> BANG.
    preparation: { pelvis: 684, bounds: [348, 989], flip: true },
    draw: { pelvis: 658, bounds: [299, 982], flip: true },
    aim: { pelvis: 698, bounds: [307, 993], flip: false },
    fire: { pelvis: 698, bounds: [307, 993], flip: false },
  },
  'npc:6': {
    ready: { pelvis: 646, bounds: [322, 978], flip: true },
    // Dedicated STEADY: thighs match DRAW exactly (template dx 0, boots 3px), so DRAW's pelvis applies.
    preparation: { pelvis: 648, bounds: [320, 980], flip: true },
    draw: { pelvis: 648, bounds: [303, 991], flip: true },
    aim: { pelvis: 652, bounds: [298, 1002], flip: false },
    fire: { pelvis: 652, bounds: [298, 1002], flip: false },
  },
  'npc:7': {
    ready: { pelvis: 611, bounds: [361, 983], flip: true },
    // Dedicated STEADY, edited from IDLE at native resolution: body and legs are IDLE's
    // (template dx 0), so it shares IDLE's pelvis.
    preparation: { pelvis: 611, bounds: [361, 983], flip: true },
    draw: { pelvis: 607, bounds: [301, 991], flip: true },
    aim: { pelvis: 616, bounds: [273, 987], flip: false },
    fire: { pelvis: 616, bounds: [273, 987], flip: false },
  },
  'npc:8': {
    ready: { pelvis: 600, bounds: [323, 964], flip: true },
    // Dedicated STEADY, edited from IDLE at native resolution (legs template dx 0 vs IDLE).
    preparation: { pelvis: 600, bounds: [323, 964], flip: true },
    draw: { pelvis: 604, bounds: [282, 992], flip: true },
    aim: { pelvis: 603, bounds: [262, 978], flip: false },
    fire: { pelvis: 603, bounds: [262, 978], flip: false },
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
  // Batch 2: mirrored HIT ∪ DOWN (the reaction renderer flips these NPCs).
  'npc:3': [147, 1037],
  'npc:5': [149, 1004],
  'npc:6': [102, 1012],
  'npc:7': [124, 988],
  'npc:8': [94, 1037],
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
