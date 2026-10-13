import { faceoffStandingArt } from './npcFaceoffPoseArt';

type Kind = 'player' | 'npc';
type Bounds = readonly [minX: number, minY: number, maxX: number, maxY: number];

// Measured alpha > 1 bounds of all 26 production AIM sources, in the nominal
// contain-square frame after artScale, before mirroring. Expanded capes/echoes
// can extend outside [0, 1]; fitting only the image box would crop those shapes.
const AIM_BOUNDS: Record<string, Bounds> = {
  P01: [0.190104167, 0.030598958, 0.825520833, 0.952473958],
  P02: [0.023923445, 0.010366826, 0.847687400, 0.977671451],
  P03: [0.006379585, 0.005582137, 0.795853270, 0.972089314],
  P04: [-0.171451356, -0.022328549, 0.820574163, 0.972089314],
  NPC01: [(256 + 97) / 1536, 40 / 1536, (256 + 995) / 1536, 1474 / 1536],
  NPC02: [308 / 1254, 15 / 1254, 1000 / 1254, 1219 / 1254],
  NPC03: [0.238437002, 0.007974482, 0.811004785, 0.980063796],
  NPC04: [260 / 1254, 10 / 1254, 1007 / 1254, 1224 / 1254],
  NPC05: [305 / 1254, 5 / 1254, 996 / 1254, 1225 / 1254],
  NPC06: [295 / 1254, 14 / 1254, 1005 / 1254, 1235 / 1254],
  NPC07: [0.216108453, 0.006379585, 0.788676236, 0.975279107],
  NPC08: [0.207336523, 0.000797448, 0.782296651, 0.969696970],
  NPC09: [-0.011961722, -0.021531100, 0.949760766, 0.978468900],
  NPC10: [0.233652313, 0.005582137, 0.787081340, 0.980063796],
  NPC11: [204 / 1254, 19 / 1254, 1027 / 1254, 1234 / 1254],
  NPC12: [0.207336523, 0.007974482, 0.823763955, 0.977671451],
  NPC13: [0.236842105, 0.007177033, 0.799840510, 0.971291866],
  NPC14: [284 / 1254, 17 / 1254, 1005 / 1254, 1222 / 1254],
  NPC15: [-0.102073365, 0.009569378, 0.974481659, 0.950558214],
  NPC16: [0.233652313, 0.004784689, 0.804625199, 0.962519936],
  NPC17: [330 / 1254, 8 / 1254, 959 / 1254, 1239 / 1254],
  NPC18: [-0.038277512, -0.013556619, 0.912280702, 0.966507177],
  NPC19: [-0.145933014, -0.021531100, 0.929824561, 0.987240829],
  NPC20: [0.032695375, 0.029505582, 1.027910686, 0.972089314],
  NPC21: [0.220095694, 0.005582137, 0.795055821, 0.987240829],
  NPC22: [-0.072567783, -0.043062201, 0.944976077, 0.988835726],
};

export function preDuelAimBounds(kind: Kind, id: number): Bounds {
  const bounds = AIM_BOUNDS[`${kind === 'player' ? 'P' : 'NPC'}${String(id).padStart(2, '0')}`]
    ?? AIM_BOUNDS[kind === 'player' ? 'P01' : 'NPC01']!;
  return faceoffStandingArt(kind, id, 'aim').flipHorizontal
    ? [1 - bounds[2], bounds[1], 1 - bounds[0], bounds[3]]
    : bounds;
}

/** Pre-Duel only. Place real silhouettes first; keep preferred sizes whenever
 * they fit. A common fit ratio is needed only when their combined opaque width
 * (or available crown-to-ground height) cannot fit this screen's figure region. */
export function npcPreDuelLayout({
  width, height, playerId, npcId, paddingTop = 0, paddingLeft = 8,
}: {
  width: number; height: number; playerId: number; npcId: number;
  paddingTop?: number; paddingLeft?: number;
}) {
  const landscape = width > height;
  const regionLeft = Math.max(paddingLeft, landscape ? width * .03 : 8);
  const regionRight = landscape ? width * .57 : width - Math.max(paddingLeft, 8);
  const regionTop = landscape ? height * .16 : Math.max(height * .29, paddingTop + 172);
  const groundY = height * (landscape ? .84 : .69);
  const playerPreferred = Math.min(landscape ? height * .7 : width * .64, landscape ? 390 : 290);
  const npcPreferred = Math.min(landscape ? height * .68 : width * .58, landscape ? 370 : 270);
  const playerBounds = preDuelAimBounds('player', playerId);
  const npcBounds = preDuelAimBounds('npc', npcId);
  const playerGround = faceoffStandingArt('player', playerId, 'aim').groundFraction;
  const npcGround = faceoffStandingArt('npc', npcId, 'aim').groundFraction;
  const requiredWidth = (playerBounds[2] - playerBounds[0]) * playerPreferred
    + (npcBounds[2] - npcBounds[0]) * npcPreferred;
  const gapMinimum = 40;
  const availableHeight = Math.max(1, groundY - regionTop);
  const scale = Math.min(1, (regionRight - regionLeft - gapMinimum) / requiredWidth,
    availableHeight / (playerPreferred * (playerGround - playerBounds[1])),
    availableHeight / (npcPreferred * (npcGround - npcBounds[1])));
  const playerSize = playerPreferred * scale;
  const npcSize = npcPreferred * scale;
  const player = {
    size: playerSize,
    left: regionLeft - playerBounds[0] * playerSize,
    top: groundY - playerGround * playerSize,
  };
  const npc = {
    size: npcSize,
    left: regionRight - npcBounds[2] * npcSize,
    top: groundY - npcGround * npcSize,
  };
  const playerRight = player.left + playerBounds[2] * playerSize;
  const npcLeft = npc.left + npcBounds[0] * npcSize;
  const visibleTop = Math.min(player.top + playerBounds[1] * playerSize,
    npc.top + npcBounds[1] * npcSize);
  return {
    player, npc, scale, groundY, gap: npcLeft - playerRight,
    regionLeft, regionRight, regionTop,
    vsLeft: (playerRight + npcLeft) / 2 - 20,
    vsTop: (visibleTop + groundY) / 2 - 14,
  };
}
