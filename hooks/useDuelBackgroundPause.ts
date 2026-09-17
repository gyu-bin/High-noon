import { useCallback } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

/** Never let a focused duel continue unseen during an interruption. */
export function useDuelBackgroundPause(active: boolean, onPause: () => void) {
  useFocusEffect(useCallback(() => {
    let previous = AppState.currentState;
    const sub = AppState.addEventListener('change', state => {
      if (active && previous === 'active' && state !== 'active') onPause();
      previous = state;
    });
    return () => sub.remove();
  }, [active, onPause]));
}
