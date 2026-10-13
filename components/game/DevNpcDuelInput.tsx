import { createContext, useContext, useEffect, useRef } from 'react';

/** Opt-in input automation for the hard-DEV-only actual match QA route. */
export const DevNpcDuelInputContext = createContext<boolean | { firstRoundDelayMs: number; delayMs: number }>(false);

export function DevNpcDuelInput({ signalPhase, shootActive, onShootPress, scope }: {
  signalPhase: string;
  shootActive: boolean;
  onShootPress: () => void;
  scope: string;
}) {
  const enabled = useContext(DevNpcDuelInputContext);
  const latest = useRef({ signalPhase, shootActive, onShootPress, scope });
  latest.current = { signalPhase, shootActive, onShootPress, scope };
  const firedScope = useRef<string | null>(null);

  useEffect(() => {
    if (!__DEV__ || !enabled || signalPhase !== '뱅' || !shootActive || firedScope.current === scope) return;
    // This is an input delay after the real BANG, not an engine timing override.
    const timer = setTimeout(() => {
      const input = latest.current;
      if (!__DEV__ || input.scope !== scope || input.signalPhase !== '뱅' || !input.shootActive) return;
      firedScope.current = scope;
      input.onShootPress();
    }, typeof enabled === 'object' ? (scope.endsWith(':1') ? enabled.firstRoundDelayMs : enabled.delayMs) : 100);
    return () => clearTimeout(timer);
  }, [enabled, scope, shootActive, signalPhase]);

  return null;
}
