/**
 * 진행도 자동 백업 — 앱을 지웠다 다시 깔아도 조용히 되살린다.
 *
 * AsyncStorage는 앱 컨테이너 안에 있어서 앱을 지우면 함께 사라진다. iOS 키체인은
 * 컨테이너 밖에 있고 **같은 번들 ID로 재설치하면 값이 남아 있다.** 그래서 진행도
 * 스냅샷을 키체인에도 같이 써두고, 부팅 때 진행도가 비어 있으면 되돌린다.
 * 유저는 아무것도 하지 않는다 (백업 코드는 이게 실패했을 때의 탈출구다).
 *
 * 한계: 기기를 옮기면 따라오지 않는다. 기기 이동까지 필요해지면 서버가 답이다.
 * 안드로이드는 키체인 대신 SharedPreferences라 삭제와 함께 사라지지만, 자동 백업이
 * 기본으로 켜져 있어 Play 재설치 시 AsyncStorage 자체가 복원된다.
 *
 * **`expo-secure-store`를 동적으로 불러온다.** 네이티브 모듈이라 OTA로는 추가되지
 * 않는다. 이 코드가 먼저 OTA로 나가고 유저 기기의 바이너리에는 아직 모듈이 없을 수
 * 있으므로, 없으면 조용히 아무것도 하지 않는다. 다음 스토어 빌드부터 동작한다.
 */
import { requireOptionalNativeModule } from 'expo-modules-core';

import { useProgressStore } from '@/store/progressStore';
import { exportProgressCode, importProgressCode } from '@/utils/progressBackup';

const KEY = 'highnoon.progress.snapshot.v1';
/** 연속 저장을 묶는다 — 라운드마다 키체인을 때릴 이유가 없다 */
const WRITE_DEBOUNCE_MS = 1500;

type SecureStore = typeof import('expo-secure-store');

let libPromise: Promise<SecureStore | null> | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribe: (() => void) | null = null;

function hasSecureStoreNative(): boolean {
  try {
    return requireOptionalNativeModule('ExpoSecureStore') != null;
  } catch {
    return false;
  }
}

async function getSecureStore(): Promise<SecureStore | null> {
  if (!hasSecureStoreNative()) return null;
  if (!libPromise) {
    libPromise = import('expo-secure-store').catch(() => null);
  }
  return libPromise;
}

/** 진행도가 사실상 비어 있는가 — 복원 여부 판단 기준 */
function looksEmpty(): boolean {
  const s = useProgressStore.getState();
  if (s.highestUnlockedNpcId > 1) return false;
  if (s.reactionAggregate.count > 0) return false;
  return !Object.values(s.npcById).some((r) => r.cleared || r.bestReactionMs != null);
}

async function writeSnapshot(): Promise<void> {
  const lib = await getSecureStore();
  if (!lib) return;
  try {
    await lib.setItemAsync(KEY, exportProgressCode(), {
      // 이 기기에서만, 잠금 해제 후에만 읽는다. iCloud로 새어나가지 않는다.
      keychainAccessible: lib.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch {
    /* 키체인 접근 실패는 게임 진행을 막을 이유가 없다 */
  }
}

function scheduleWrite(): void {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeTimer = null;
    void writeSnapshot();
  }, WRITE_DEBOUNCE_MS);
}

/**
 * 부팅 시 1회. **persist hydration 이후에** 불러야 한다 — 그 전에 부르면
 * 아직 안 읽힌 로컬 진행도를 비어 있다고 오판한다.
 *
 * @returns 실제로 복원했으면 true
 */
export async function restoreProgressIfEmpty(): Promise<boolean> {
  if (!looksEmpty()) return false;

  const lib = await getSecureStore();
  if (!lib) return false;

  try {
    const code = await lib.getItemAsync(KEY);
    if (!code) return false;
    // 복원 직전에 한 번 더 확인 — 대기 중에 유저가 게임을 시작했을 수 있다
    if (!looksEmpty()) return false;
    return importProgressCode(code).ok;
  } catch {
    return false;
  }
}

/** 진행도가 바뀔 때마다 스냅샷을 갱신한다. 부팅 시 1회 호출. */
export function startProgressAutoBackup(): void {
  if (unsubscribe) return;
  unsubscribe = useProgressStore.subscribe(() => {
    scheduleWrite();
  });
  // 첫 스냅샷 — 이미 진행도가 있는 기존 유저를 위해
  if (!looksEmpty()) scheduleWrite();
}
