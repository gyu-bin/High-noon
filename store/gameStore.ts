import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type GameMode = 'npc' | 'local';

export type SignalPhase = 'idle' | 'ready' | 'steady' | 'bang' | 'result';

export type ReactionRecord = {
  playerMs: number | null;
  npcMs: number | null;
};

export type GameMatchInit = {
  mode: GameMode;
  /** 남은 하트(선택). 미입력 시 모드별 기본값 */
  playerHearts?: number;
  opponentHearts?: number;
};

const DEFAULT_HEARTS_NPC = 3;
const DEFAULT_HEARTS_LOCAL = 3;

type GameStoreState = {
  mode: GameMode;
  currentRound: number;
  playerScore: number;
  opponentScore: number;
  playerHearts: number;
  opponentHearts: number;
  signalPhase: SignalPhase;
  lastReaction: ReactionRecord;
  setMode: (mode: GameMode) => void;
  startMatch: (init: GameMatchInit) => void;
  setSignalPhase: (phase: SignalPhase) => void;
  setLastReaction: (record: ReactionRecord) => void;
  patchLastReaction: (patch: Partial<ReactionRecord>) => void;
  setScores: (player: number, opponent: number) => void;
  setHearts: (player: number, opponent: number) => void;
  nextRound: () => void;
  resetSignalOnly: () => void;
  /** 저장까지 초기화: 타이틀 화면 등으로 돌아갈 때 */
  resetToIdle: () => void;
};

const idleReaction: ReactionRecord = { playerMs: null, npcMs: null };

const baseState: Omit<
  GameStoreState,
  | 'setMode'
  | 'startMatch'
  | 'setSignalPhase'
  | 'setLastReaction'
  | 'patchLastReaction'
  | 'setScores'
  | 'setHearts'
  | 'nextRound'
  | 'resetSignalOnly'
  | 'resetToIdle'
> = {
  mode: 'npc',
  currentRound: 1,
  playerScore: 0,
  opponentScore: 0,
  playerHearts: DEFAULT_HEARTS_NPC,
  opponentHearts: 0,
  signalPhase: 'idle',
  lastReaction: { ...idleReaction },
};

export const useGameStore = create<GameStoreState>()(
  persist(
    (set) => ({
      ...baseState,

      setMode: (mode) => set({ mode }),

      startMatch: (init) =>
        set(() => {
          const ph =
            init.playerHearts ??
            (init.mode === 'npc' ? DEFAULT_HEARTS_NPC : DEFAULT_HEARTS_LOCAL);
          const oh =
            init.opponentHearts ??
            (init.mode === 'npc' ? 0 : DEFAULT_HEARTS_LOCAL);
          return {
            mode: init.mode,
            currentRound: 1,
            playerScore: 0,
            opponentScore: 0,
            playerHearts: ph,
            opponentHearts: oh,
            signalPhase: 'idle',
            lastReaction: { ...idleReaction },
          };
        }),

      setSignalPhase: (signalPhase) => set({ signalPhase }),

      setLastReaction: (lastReaction) => set({ lastReaction }),

      patchLastReaction: (patch) =>
        set((s) => ({
          lastReaction: { ...s.lastReaction, ...patch },
        })),

      setScores: (playerScore, opponentScore) => set({ playerScore, opponentScore }),

      setHearts: (playerHearts, opponentHearts) => set({ playerHearts, opponentHearts }),

      nextRound: () => set((s) => ({ currentRound: s.currentRound + 1 })),

      resetSignalOnly: () =>
        set({
          signalPhase: 'idle',
          lastReaction: { ...idleReaction },
        }),

      resetToIdle: () =>
        set({
          ...baseState,
          lastReaction: { ...idleReaction },
        }),
    }),
    {
      name: 'high-noon-game',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        mode: s.mode,
        currentRound: s.currentRound,
        playerScore: s.playerScore,
        opponentScore: s.opponentScore,
        playerHearts: s.playerHearts,
        opponentHearts: s.opponentHearts,
        signalPhase: s.signalPhase,
        lastReaction: s.lastReaction,
      }),
    },
  ),
);
