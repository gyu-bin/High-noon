import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type MatchRecord = { id: string; mode: 'npc' | 'local'; opponentId?: number; winner: 'player' | 'npc' | 'p1' | 'p2'; at: number };
type State = {
  matches: MatchRecord[];
  npcTotal: number;
  npcWins: number;
  localTotal: number;
  record: (match: MatchRecord) => void;
  reset: () => void;
};
const initial = { matches: [] as MatchRecord[], npcTotal: 0, npcWins: 0, localTotal: 0 };
export const useMatchHistoryStore = create<State>()(persist((set) => ({
  ...initial,
  record: (match) => set((state) => {
    if (state.matches.some((entry) => entry.id === match.id)) return state;
    return {
      matches: [match, ...state.matches].slice(0, 200),
      npcTotal: state.npcTotal + Number(match.mode === 'npc'),
      npcWins: state.npcWins + Number(match.mode === 'npc' && match.winner === 'player'),
      localTotal: state.localTotal + Number(match.mode === 'local'),
    };
  }),
  reset: () => set(initial),
}), { name: 'high-noon-match-history', storage: createJSONStorage(() => AsyncStorage) }));
