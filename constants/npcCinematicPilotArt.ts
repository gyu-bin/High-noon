import { CLARITY_PLAYERS, CLARITY_NPCS } from './clarityCharacterAssets';

// NPC-only quickdraw pilot. Preparation sources are square; AIM/FIRE are
// portrait cutouts contained in the same square actor frame. Only FIRE anchors
// emit VFX; holstered/extraction coordinates never emit shot effects.
const art = {
  player: {
    ready: { source: CLARITY_PLAYERS[1]!.idle, groundFraction: 1221 / 1254, muzzle: { x: .42, y: .49 } },
    preparation: { source: require('../assets/images/characters/faceoff/pilot/p01-preparation.png'), groundFraction: 1222 / 1254, muzzle: { x: .42, y: .49 } },
    draw: { source: CLARITY_PLAYERS[1]!.draw, groundFraction: 1222 / 1254, muzzle: { x: .42, y: .46 } },
    aim: { source: require('../assets/images/characters/faceoff/pilot/p01-aim.png'), groundFraction: 1461 / 1536, muzzle: { x: (256 + 1001) / 1536, y: 417 / 1536 } },
    fire: { source: require('../assets/images/characters/faceoff/pilot/p01-fire.png'), groundFraction: 1461 / 1536, muzzle: { x: (256 + 865) / 1536, y: 342 / 1536 } },
  },
  npc: {
    ready: { source: CLARITY_NPCS[1]!.idle, groundFraction: 1201 / 1254, muzzle: { x: .42, y: .5 } },
    preparation: { source: require('../assets/images/characters/faceoff/pilot/npc01-preparation.png'), groundFraction: 1202 / 1254, muzzle: { x: .42, y: .5 } },
    draw: { source: CLARITY_NPCS[1]!.draw, groundFraction: 1207 / 1254, muzzle: { x: .42, y: .47 } },
    aim: { source: require('../assets/images/characters/faceoff/pilot/npc01-aim.png'), groundFraction: 1474 / 1536, muzzle: { x: (256 + 22) / 1536, y: 389 / 1536 } },
    fire: { source: require('../assets/images/characters/faceoff/pilot/npc01-fire.png'), groundFraction: 1475 / 1536, muzzle: { x: (256 + 194) / 1536, y: 334 / 1536 } },
  },
} as const;

export function cinematicPilotArt(kind: 'player' | 'npc', stage: 'ready' | 'preparation' | 'draw' | 'aim' | 'fire') {
  return { ...art[kind][stage], flipHorizontal: kind === 'npc' && (stage === 'ready' || stage === 'preparation' || stage === 'draw'), artScale: 1 };
}
