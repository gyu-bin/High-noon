import * as Updates from 'expo-updates';

import { markOtaJustApplied } from '@/utils/otaUpdateFlag';

const DEFAULT_TIMEOUT_MS = 12_000;
/** 포그라운드 반복 체크 스로틀 (스플래시 force 는 무시) */
const MIN_CHECK_INTERVAL_MS = 30_000;

let inFlight = false;
let lastCheckAt = 0;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('ota-timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * EAS Update 확인 → fetch → reloadAsync.
 * @returns true 면 reload 진행 중(호출 측은 이어서 UI를 열지 말 것)
 */
export async function applyOtaUpdateIfAvailable(opts?: {
  timeoutMs?: number;
  /** 부팅 스플래시 — 스로틀 무시 */
  force?: boolean;
}): Promise<boolean> {
  if (__DEV__ || !Updates.isEnabled) return false;
  if (inFlight) return false;

  const now = Date.now();
  if (!opts?.force && now - lastCheckAt < MIN_CHECK_INTERVAL_MS) return false;

  inFlight = true;
  lastCheckAt = now;
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  try {
    const check = await withTimeout(Updates.checkForUpdateAsync(), timeoutMs);
    if (!check.isAvailable) return false;
    await withTimeout(Updates.fetchUpdateAsync(), timeoutMs);
    await markOtaJustApplied();
    try {
      await Updates.reloadAsync();
    } catch {
      return false;
    }
    return true;
  } catch {
    return false;
  } finally {
    inFlight = false;
  }
}
