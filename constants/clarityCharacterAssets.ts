import type { ImageSourcePropType } from 'react-native';

export type ClarityPose = 'idle' | 'draw' | 'fire' | 'hit' | 'down';
export type ClarityPoseSet = Record<ClarityPose, ImageSourcePropType>;

// Register only complete, visually reviewed five-pose sets. Original assets remain intact.
// `-v2` folders are the 2026-10 redesign: expanded square canvases whose render scale lives in
// constants/characterArtMetadata.ts (REDESIGN_ART_META). Their `down` frame is the KNEEL.
export const CLARITY_PLAYERS: Partial<Record<number, ClarityPoseSet>> = {
  4: {
    idle: require('@/assets/images/characters/clarity/player/04-v2/idle.png'),
    draw: require('@/assets/images/characters/clarity/player/04-v2/draw.png'),
    fire: require('@/assets/images/characters/clarity/player/04-v2/fire.png'),
    hit: require('@/assets/images/characters/clarity/player/04-v2/hit.png'),
    down: require('@/assets/images/characters/clarity/player/04-v2/down.png'),
  },
  3: {
    idle: require('@/assets/images/characters/clarity/player/03/idle.png'),
    draw: require('@/assets/images/characters/clarity/player/03/draw.png'),
    fire: require('@/assets/images/characters/clarity/player/03/fire.png'),
    hit: require('@/assets/images/characters/clarity/player/03/hit.png'),
    down: require('@/assets/images/characters/clarity/player/03/down.png'),
  },
  1: {
    idle: require('@/assets/images/characters/clarity/player/01/idle.png'),
    draw: require('@/assets/images/characters/clarity/player/01/draw.png'),
    fire: require('@/assets/images/characters/clarity/player/01/fire.png'),
    hit: require('@/assets/images/characters/clarity/player/01/hit.png'),
    down: require('@/assets/images/characters/clarity/player/01/down.png'),
  },
  2: {
    idle: require('@/assets/images/characters/clarity/player/02-v2/idle.png'),
    draw: require('@/assets/images/characters/clarity/player/02-v2/draw.png'),
    fire: require('@/assets/images/characters/clarity/player/02-v2/fire.png'),
    hit: require('@/assets/images/characters/clarity/player/02-v2/hit.png'),
    down: require('@/assets/images/characters/clarity/player/02-v2/down.png'),
  },
};

export const CLARITY_NPCS: Partial<Record<number, ClarityPoseSet>> = {
  22: {
    idle: require('@/assets/images/characters/clarity/npc/22-v2/idle.png'),
    draw: require('@/assets/images/characters/clarity/npc/22-v2/draw.png'),
    fire: require('@/assets/images/characters/clarity/npc/22-v2/fire.png'),
    hit: require('@/assets/images/characters/clarity/npc/22-v2/hit.png'),
    down: require('@/assets/images/characters/clarity/npc/22-v2/down.png'),
  },
  20: {
    idle: require('@/assets/images/characters/clarity/npc/20-v2/idle.png'),
    draw: require('@/assets/images/characters/clarity/npc/20-v2/draw.png'),
    fire: require('@/assets/images/characters/clarity/npc/20-v2/fire.png'),
    hit: require('@/assets/images/characters/clarity/npc/20-v2/hit.png'),
    down: require('@/assets/images/characters/clarity/npc/20-v2/down.png'),
  },
  19: {
    idle: require('@/assets/images/characters/clarity/npc/19-v2/idle.png'),
    draw: require('@/assets/images/characters/clarity/npc/19-v2/draw.png'),
    fire: require('@/assets/images/characters/clarity/npc/19-v2/fire.png'),
    hit: require('@/assets/images/characters/clarity/npc/19-v2/hit.png'),
    down: require('@/assets/images/characters/clarity/npc/19-v2/down.png'),
  },
  21: {
    idle: require('@/assets/images/characters/clarity/npc/21/idle.png'),
    draw: require('@/assets/images/characters/clarity/npc/21/draw.png'),
    fire: require('@/assets/images/characters/clarity/npc/21/fire.png'),
    hit: require('@/assets/images/characters/clarity/npc/21/hit.png'),
    down: require('@/assets/images/characters/clarity/npc/21/down.png'),
  },
  13: {
    idle: require('@/assets/images/characters/clarity/npc/13/idle.png'),
    draw: require('@/assets/images/characters/clarity/npc/13/draw.png'),
    fire: require('@/assets/images/characters/clarity/npc/13/fire.png'),
    hit: require('@/assets/images/characters/clarity/npc/13/hit.png'),
    down: require('@/assets/images/characters/clarity/npc/13/down.png'),
  },
  6: {
    idle: require('@/assets/images/characters/clarity/npc/06/idle.png'),
    draw: require('@/assets/images/characters/clarity/npc/06/draw.png'),
    fire: require('@/assets/images/characters/clarity/npc/06/fire.png'),
    hit: require('@/assets/images/characters/clarity/npc/06/hit.png'),
    down: require('@/assets/images/characters/clarity/npc/06/down.png'),
  },
  18: {
    idle: require('@/assets/images/characters/clarity/npc/18-v2/idle.png'),
    draw: require('@/assets/images/characters/clarity/npc/18-v2/draw.png'),
    fire: require('@/assets/images/characters/clarity/npc/18-v2/fire.png'),
    hit: require('@/assets/images/characters/clarity/npc/18-v2/hit.png'),
    down: require('@/assets/images/characters/clarity/npc/18-v2/down.png'),
  },
  17: {
    idle: require('@/assets/images/characters/clarity/npc/17/idle.png'),
    draw: require('@/assets/images/characters/clarity/npc/17/draw.png'),
    fire: require('@/assets/images/characters/clarity/npc/17/fire.png'),
    hit: require('@/assets/images/characters/clarity/npc/17/hit.png'),
    down: require('@/assets/images/characters/clarity/npc/17/down.png'),
  },
  16: {
    idle: require('@/assets/images/characters/clarity/npc/16/idle.png'),
    draw: require('@/assets/images/characters/clarity/npc/16/draw.png'),
    fire: require('@/assets/images/characters/clarity/npc/16/fire.png'),
    hit: require('@/assets/images/characters/clarity/npc/16/hit.png'),
    down: require('@/assets/images/characters/clarity/npc/16/down.png'),
  },
  15: {
    idle: require('@/assets/images/characters/clarity/npc/15-v2/idle.png'),
    draw: require('@/assets/images/characters/clarity/npc/15-v2/draw.png'),
    fire: require('@/assets/images/characters/clarity/npc/15-v2/fire.png'),
    hit: require('@/assets/images/characters/clarity/npc/15-v2/hit.png'),
    down: require('@/assets/images/characters/clarity/npc/15-v2/down.png'),
  },
  14: {
    idle: require('@/assets/images/characters/clarity/npc/14/idle.png'),
    draw: require('@/assets/images/characters/clarity/npc/14/draw.png'),
    fire: require('@/assets/images/characters/clarity/npc/14/fire.png'),
    hit: require('@/assets/images/characters/clarity/npc/14/hit.png'),
    down: require('@/assets/images/characters/clarity/npc/14/down.png'),
  },
  12: {
    idle: require('@/assets/images/characters/clarity/npc/12/idle.png'),
    draw: require('@/assets/images/characters/clarity/npc/12/draw.png'),
    fire: require('@/assets/images/characters/clarity/npc/12/fire.png'),
    hit: require('@/assets/images/characters/clarity/npc/12/hit.png'),
    down: require('@/assets/images/characters/clarity/npc/12/down.png'),
  },
  11: {
    idle: require('@/assets/images/characters/clarity/npc/11/idle.png'),
    draw: require('@/assets/images/characters/clarity/npc/11/draw.png'),
    fire: require('@/assets/images/characters/clarity/npc/11/fire.png'),
    hit: require('@/assets/images/characters/clarity/npc/11/hit.png'),
    down: require('@/assets/images/characters/clarity/npc/11/down.png'),
  },
  10: {
    idle: require('@/assets/images/characters/clarity/npc/10/idle.png'),
    draw: require('@/assets/images/characters/clarity/npc/10/draw.png'),
    fire: require('@/assets/images/characters/clarity/npc/10/fire.png'),
    hit: require('@/assets/images/characters/clarity/npc/10/hit.png'),
    down: require('@/assets/images/characters/clarity/npc/10/down.png'),
  },
  9: {
    idle: require('@/assets/images/characters/clarity/npc/09-v2/idle.png'),
    draw: require('@/assets/images/characters/clarity/npc/09-v2/draw.png'),
    fire: require('@/assets/images/characters/clarity/npc/09-v2/fire.png'),
    hit: require('@/assets/images/characters/clarity/npc/09-v2/hit.png'),
    down: require('@/assets/images/characters/clarity/npc/09-v2/down.png'),
  },
  8: {
    idle: require('@/assets/images/characters/clarity/npc/08/idle.png'),
    draw: require('@/assets/images/characters/clarity/npc/08/draw.png'),
    fire: require('@/assets/images/characters/clarity/npc/08/fire.png'),
    hit: require('@/assets/images/characters/clarity/npc/08/hit.png'),
    down: require('@/assets/images/characters/clarity/npc/08/down.png'),
  },
  7: {
    idle: require('@/assets/images/characters/clarity/npc/07/idle.png'),
    draw: require('@/assets/images/characters/clarity/npc/07/draw.png'),
    fire: require('@/assets/images/characters/clarity/npc/07/fire.png'),
    hit: require('@/assets/images/characters/clarity/npc/07/hit.png'),
    down: require('@/assets/images/characters/clarity/npc/07/down.png'),
  },
  5: {
    idle: require('@/assets/images/characters/clarity/npc/05/idle.png'),
    draw: require('@/assets/images/characters/clarity/npc/05/draw.png'),
    fire: require('@/assets/images/characters/clarity/npc/05/fire.png'),
    hit: require('@/assets/images/characters/clarity/npc/05/hit.png'),
    down: require('@/assets/images/characters/clarity/npc/05/down.png'),
  },
  4: {
    idle: require('@/assets/images/characters/clarity/npc/04/idle.png'),
    draw: require('@/assets/images/characters/clarity/npc/04/draw.png'),
    fire: require('@/assets/images/characters/clarity/npc/04/fire.png'),
    hit: require('@/assets/images/characters/clarity/npc/04/hit.png'),
    down: require('@/assets/images/characters/clarity/npc/04/down.png'),
  },
  3: {
    idle: require('@/assets/images/characters/clarity/npc/03/idle.png'),
    draw: require('@/assets/images/characters/clarity/npc/03/draw.png'),
    fire: require('@/assets/images/characters/clarity/npc/03/fire.png'),
    hit: require('@/assets/images/characters/clarity/npc/03/hit.png'),
    down: require('@/assets/images/characters/clarity/npc/03/down.png'),
  },
  2: {
    idle: require('@/assets/images/characters/clarity/npc/02/idle.png'),
    draw: require('@/assets/images/characters/clarity/npc/02/draw.png'),
    fire: require('@/assets/images/characters/clarity/npc/02/fire.png'),
    hit: require('@/assets/images/characters/clarity/npc/02/hit.png'),
    down: require('@/assets/images/characters/clarity/npc/02/down.png'),
  },
  1: {
    idle: require('@/assets/images/characters/clarity/npc/01/idle.png'),
    draw: require('@/assets/images/characters/clarity/npc/01/draw.png'),
    fire: require('@/assets/images/characters/clarity/npc/01/fire.png'),
    hit: require('@/assets/images/characters/clarity/npc/01/hit.png'),
    down: require('@/assets/images/characters/clarity/npc/01/down.png'),
  },
};
