/** NPC Duel presentation registration, in the centered 1254px production square.
 * Calibrated batches use the reviewed upper-thigh junction (±8px). The full-roster
 * extension explicitly retains its original production center until calibrated.
 * Bounds use alpha >=16 to exclude invisible matte specks, never to center bodies.
 * READY is the registration reference. Pilot and shared art are untouched. */
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
  // Batch 3. IDLE, STEADY and DRAW legs match within 1-4px (lower-leg template), so they share
  // IDLE's pelvis; the crotch scan reads DRAW at 584 because of the wider stance and moved it 16px.
  'npc:10': {
    ready: { pelvis: 600, bounds: [350, 973], flip: true },
    preparation: { pelvis: 600, bounds: [303, 995], flip: true },
    draw: { pelvis: 600, bounds: [278, 981], flip: true },
    aim: { pelvis: 588, bounds: [296, 985], flip: false },
    fire: { pelvis: 588, bounds: [296, 985], flip: false },
  },
  // IDLE, STEADY and DRAW boots/shins match within 3px (lower-leg template); the crotch scan reads
  // STEADY at 549 because the coat tail fills the leg gap, so all three share IDLE's pelvis.
  'npc:11': {
    ready: { pelvis: 686, bounds: [292, 1027], flip: true },
    preparation: { pelvis: 686, bounds: [277, 1037], flip: true },
    draw: { pelvis: 686, bounds: [267, 1039], flip: true },
    aim: { pelvis: 687, bounds: [206, 1025], flip: false },
    fire: { pelvis: 687, bounds: [206, 1025], flip: false },
  },
  // STEADY and DRAW legs sit 3-6px right of IDLE (lower-leg template); after registration the
  // screen-right boot of READY/STEADY/DRAW lines up within 4px. FIRE uses the crotch scan.
  'npc:12': {
    ready: { pelvis: 575, bounds: [334, 963], flip: true },
    preparation: { pelvis: 580, bounds: [323, 986], flip: true },
    draw: { pelvis: 578, bounds: [299, 1009], flip: true },
    aim: { pelvis: 594, bounds: [262, 1031], flip: false },
    fire: { pelvis: 594, bounds: [262, 1031], flip: false },
  },
  // STEADY keeps IDLE's legs pixel for pixel, so it shares IDLE's pelvis. DRAW's crotch scan reads 624 like IDLE
  // (the lower-leg template is unreliable here: DRAW is painted ~1% smaller). FIRE uses the crotch scan.
  'npc:13': {
    ready: { pelvis: 624, bounds: [369, 928], flip: true },
    preparation: { pelvis: 624, bounds: [353, 928], flip: true },
    draw: { pelvis: 624, bounds: [314, 972], flip: true },
    aim: { pelvis: 635, bounds: [299, 1001], flip: false },
    fire: { pelvis: 635, bounds: [299, 1001], flip: false },
  },
  // STEADY retains IDLE's pelvis/legs exactly. Trouser crotch joins were independently reviewed
  // on the native IDLE, DRAW and corrected FIRE sources (660 / 664 / 657, ±8px).
  'npc:14': {
    ready: { pelvis: 660, bounds: [354, 988], flip: true },
    preparation: { pelvis: 660, bounds: [354, 988], flip: true },
    draw: { pelvis: 664, bounds: [297, 1003], flip: true },
    aim: { pelvis: 657, bounds: [286, 1003], flip: false },
    fire: { pelvis: 657, bounds: [286, 1003], flip: false },
  },
  // Full roster extension: exact alpha bounds on the production frame. Preserve the
  // existing center (627) rather than inventing unreviewed anatomical offsets.
  'player:4': {
    ready: { pelvis: 627, bounds: [76, 1116], flip: false },
    preparation: { pelvis: 627, bounds: [-4, 1162], flip: false },
    draw: { pelvis: 627, bounds: [-4, 1162], flip: false },
    aim: { pelvis: 627, bounds: [-212, 1025], flip: true },
    fire: { pelvis: 627, bounds: [-212, 1025], flip: true },
  },
  'npc:9': {
    ready: { pelvis: 627, bounds: [182, 1382], flip: false },
    preparation: { pelvis: 627, bounds: [65, 1262], flip: false },
    draw: { pelvis: 627, bounds: [65, 1262], flip: false },
    aim: { pelvis: 627, bounds: [-11, 1190], flip: false },
    fire: { pelvis: 627, bounds: [-11, 1190], flip: false },
  },
  'npc:15': {
    ready: { pelvis: 627, bounds: [-159, 1034], flip: true },
    preparation: { pelvis: 627, bounds: [-41, 1107], flip: true },
    draw: { pelvis: 627, bounds: [-41, 1107], flip: true },
    aim: { pelvis: 627, bounds: [-126, 1219], flip: true },
    fire: { pelvis: 627, bounds: [-126, 1219], flip: true },
  },
  'npc:16': {
    ready: { pelvis: 627, bounds: [352, 956], flip: true },
    preparation: { pelvis: 627, bounds: [256, 1006], flip: true },
    draw: { pelvis: 627, bounds: [256, 1006], flip: true },
    aim: { pelvis: 627, bounds: [296, 1006], flip: false },
    fire: { pelvis: 627, bounds: [296, 1006], flip: false },
  },
  'npc:17': {
    ready: { pelvis: 627, bounds: [424, 892], flip: true },
    preparation: { pelvis: 627, bounds: [326, 922], flip: true },
    draw: { pelvis: 627, bounds: [326, 922], flip: true },
    aim: { pelvis: 627, bounds: [332, 957], flip: false },
    fire: { pelvis: 627, bounds: [332, 957], flip: false },
  },
  'npc:18': {
    ready: { pelvis: 627, bounds: [-208, 1029], flip: true },
    preparation: { pelvis: 627, bounds: [-55, 1147], flip: true },
    draw: { pelvis: 627, bounds: [-55, 1147], flip: true },
    aim: { pelvis: 627, bounds: [-46, 1139], flip: false },
    fire: { pelvis: 627, bounds: [-46, 1139], flip: false },
  },
  'npc:19': {
    ready: { pelvis: 627, bounds: [210, 1164], flip: false },
    preparation: { pelvis: 627, bounds: [-99, 1094], flip: false },
    draw: { pelvis: 627, bounds: [-99, 1094], flip: false },
    aim: { pelvis: 627, bounds: [-181, 1164], flip: false },
    fire: { pelvis: 627, bounds: [-181, 1164], flip: false },
  },
  'npc:20': {
    ready: { pelvis: 627, bounds: [258, 1505], flip: false },
    preparation: { pelvis: 627, bounds: [51, 1285], flip: false },
    draw: { pelvis: 627, bounds: [51, 1285], flip: false },
    aim: { pelvis: 627, bounds: [51, 1285], flip: false },
    fire: { pelvis: 627, bounds: [51, 1285], flip: false },
  },
  'npc:21': {
    ready: { pelvis: 627, bounds: [310, 979], flip: true },
    preparation: { pelvis: 627, bounds: [290, 984], flip: true },
    draw: { pelvis: 627, bounds: [290, 984], flip: true },
    aim: { pelvis: 627, bounds: [278, 995], flip: false },
    fire: { pelvis: 627, bounds: [278, 995], flip: false },
  },
  'npc:22': {
    ready: { pelvis: 627, bounds: [-50, 1181], flip: false },
    preparation: { pelvis: 627, bounds: [-83, 1153], flip: false },
    draw: { pelvis: 627, bounds: [-83, 1153], flip: false },
    aim: { pelvis: 627, bounds: [-88, 1181], flip: false },
    fire: { pelvis: 627, bounds: [-88, 1181], flip: false },
  },
};
const CANVAS = 1254;
const screenX = (x: number, flip: boolean) => flip ? CANVAS - x : x;
export function quickDrawOffsetX(kind: Kind, id: number, stage: Stage) {
  const frames = QUICK_DRAW_ALIGNMENT[`${kind}:${id}`];
  if (!frames) return 0;
  return (screenX(frames.ready.pelvis, frames.ready.flip) - screenX(frames[stage].pelvis, frames[stage].flip)) / CANVAS;
}
// Unchanged reaction artwork also shares this fixed lane; including HIT, KNEEL
// and available dedicated FALL/DOWN prevents a separate containment jump.
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
  'npc:10': [137, 989],
  'npc:11': [75, 1042],
  'npc:12': [113, 1021],
  'npc:13': [121, 985],
  'npc:14': [65, 1038],
  'player:4': [-44, 1177],
  'npc:9': [-2, 1359],
  'npc:15': [-108, 1353],
  'npc:16': [140, 945],
  'npc:17': [120, 977],
  'npc:18': [-228, 1391],
  'npc:19': [-69, 1445],
  'npc:20': [-16, 1407],
  'npc:21': [166, 1041],
  'npc:22': [-197, 1272],
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
