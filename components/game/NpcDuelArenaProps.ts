import type { StyleProp, ViewStyle } from 'react-native';

import type { DuelSignalBoardPhase } from './DuelSignalBoard';
import type { SpritePose } from '@/constants/sprites';
import type { NpcTier } from '@/types/npc';
import type { NpcReactionStage, PlayerReactionStage } from '@/utils/combatReaction';
import type { DuelBackgroundId } from '@/utils/duelBackgroundSelection';

export type NpcDuelArenaProps = {
  width: number;
  height: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  npcId: number;
  tier: NpcTier;
  bossFlag: boolean;
  dayNight: 'day' | 'night';
  backgroundId?: DuelBackgroundId;
  npcPose: SpritePose;
  npcVictoryActive: boolean;
  playerDefeated: boolean;
  signalPhase: DuelSignalBoardPhase;
  blindBangText: boolean;
  hideBangText: boolean;
  voidShroud: boolean;
  echoBangMiddleSignal: boolean;
  specialPresentation: 'mirror' | 'thunderbolt' | 'redEye' | 'void' | 'echo' | null;
  opponentHearts: number;
  playerHearts: number;
  currentRound: number;
  shootCapturesEarly: boolean;
  shootActive: boolean;
  playerShotActive: boolean;
  playerCharacterId?: number;
  npcShotActive?: boolean;
  opponentCharacterId?: number;
  opponentName?: string;
  opponentTierLabel?: string;
  recordDuelLabel?: string;
  heartsMax?: number;
  earlyWarning: boolean;
  onShootPress: () => void;
  onPause: () => void;
  pauseDisabled: boolean;
  contentShakeStyle?: StyleProp<ViewStyle>;
  /** Development-only renderer replay; ignored by release builds. */
  combatPreview?: {
    scale?: number;
    npcStage?: NpcReactionStage;
    playerStage?: PlayerReactionStage;
  };
};
