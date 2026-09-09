import * as Linking from 'expo-linking';

/** Normalize user-entered challenge codes to 6-char A-Z0-9. */
export function normalizeChallengeCode(raw: string | null | undefined): string {
  return String(raw ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}

export function isValidChallengeCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}

/** App deep link for a challenge code. */
export function buildChallengeDeepLink(code: string): string {
  const normalized = normalizeChallengeCode(code);
  return Linking.createURL('ranking/challenge', {
    queryParams: { code: normalized },
  });
}

/** Public web landing (GitHub Pages) for uninstalled users. */
export function buildChallengeWebLink(code: string): string {
  const normalized = normalizeChallengeCode(code);
  return `https://gyu-bin.github.io/High-noon/challenge.html?code=${encodeURIComponent(normalized)}`;
}

export function challengeCodeFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = Linking.parse(url);
    const fromQuery = normalizeChallengeCode(
      typeof parsed.queryParams?.code === 'string'
        ? parsed.queryParams.code
        : Array.isArray(parsed.queryParams?.code)
          ? parsed.queryParams?.code[0]
          : '',
    );
    if (isValidChallengeCode(fromQuery)) return fromQuery;

    const path = (parsed.path ?? '').replace(/^\//, '');
    const parts = path.split('/').filter(Boolean);
    // high-noon://challenge/ABC123 or .../ranking/challenge/ABC123
    const idx = parts.findIndex((p) => p === 'challenge');
    if (idx >= 0 && parts[idx + 1]) {
      const fromPath = normalizeChallengeCode(parts[idx + 1]);
      if (isValidChallengeCode(fromPath)) return fromPath;
    }
  } catch {
    // ignore parse errors
  }
  return null;
}
