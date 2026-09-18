/** Turn PostgrestError / unknown into a displayable string (never "[object Object]"). */
export function formatUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.length > 0) return msg;
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && code.length > 0) return code;
    try {
      return JSON.stringify(error);
    } catch {
      /* ignore */
    }
  }
  return 'Unknown error';
}

export function isNetworkError(error: unknown): boolean {
  const msg = formatUnknownError(error).toLowerCase();
  return (
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('timed out') ||
    msg.includes('timeout')
  );
}

/** Re-throw Supabase client errors as real Error instances. */
export function throwSupabaseError(error: unknown): never {
  throw new Error(formatUnknownError(error));
}
