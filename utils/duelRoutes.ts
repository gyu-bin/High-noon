/** Route guards shared by the root layout (status bar, OTA reload, deep links). */

export function isInGameRoute(pathname: string): boolean {
  return pathname === '/game' || pathname.startsWith('/game/');
}

/** A duel is being played (PvE, local, or ranking record duel). */
export function isActiveDuelRoute(pathname: string): boolean {
  return isInGameRoute(pathname) || pathname === '/ranking/duel';
}

/** Duel or its result screen — challenge links wait until the player leaves. */
export function isDuelFlowRoute(pathname: string): boolean {
  return (
    isActiveDuelRoute(pathname) ||
    pathname === '/result' ||
    pathname.startsWith('/result/') ||
    pathname === '/ranking/result'
  );
}
