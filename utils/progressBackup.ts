/**
 * 진행도 백업 코드.
 *
 * AsyncStorage는 앱 컨테이너 안에 있어서 **앱을 지우면 함께 사라진다.** OTA
 * 업데이트로는 살아남지만 삭제·기기 변경은 못 버틴다. 서버 없이 그걸 넘기려고,
 * 진행도를 문자열 한 덩어리로 뽑아 유저가 보관했다가 다시 넣을 수 있게 한다.
 *
 * 설계 메모:
 * - 새 의존성을 쓰지 않는다. base64 인코더까지 직접 들고 있어 **OTA로 배포된다**
 *   (네이티브 모듈을 추가하면 스토어 재빌드가 필요해진다).
 * - `isAdFree`는 **일부러 뺐다.** 결제로 얻는 권리라 코드에 담으면 누구나
 *   직접 적어 넣어 광고를 없앨 수 있다. 복원은 스토어의 구매 복원으로 해야 한다.
 * - 체크섬을 붙여 잘못 붙여넣은 코드를 걸러낸다.
 */
import { useProgressStore } from '@/store/progressStore';

/** 코드 접두사 — 형식이 바뀌면 숫자를 올린다 */
const PREFIX = 'HN1';

type BackupPayload = {
  /** highestUnlockedNpcId */
  h: number;
  /** [npcId, cleared(0|1), bestReactionMs(0=없음)] */
  n: [number, number, number][];
  /** reactionAggregate [sumMs, count] */
  a: [number, number];
  /** unlockedCharacterIds */
  c: number[];
  /** hiddenCharUnlocked */
  x: number;
  /** paleRiderUnlocked */
  p: number;
  /** legacyReactionAggregate [sumMs, count] | null */
  l: [number, number] | null;
};

// ─────────────────────────── base64 (의존성 없이) ───────────────────────────

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** UTF-8 → base64url. RN 런타임에 btoa가 없을 수 있어 직접 구현한다. */
function toBase64(input: string): string {
  const bytes: number[] = [];
  for (const ch of input) {
    let cp = ch.codePointAt(0)!;
    if (cp < 0x80) bytes.push(cp);
    else if (cp < 0x800) bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000) {
      bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    } else {
      bytes.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f),
      );
    }
  }
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? '' : B64[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? '' : B64[b2 & 63];
  }
  return out;
}

function fromBase64(input: string): string {
  const bytes: number[] = [];
  let buf = 0;
  let bits = 0;
  for (const ch of input) {
    const v = B64.indexOf(ch);
    if (v < 0) continue;
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buf >> bits) & 0xff);
    }
  }
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b0 = bytes[i]!;
    if (b0 < 0x80) {
      out += String.fromCodePoint(b0);
      i += 1;
    } else if (b0 < 0xe0) {
      out += String.fromCodePoint(((b0 & 0x1f) << 6) | (bytes[i + 1]! & 0x3f));
      i += 2;
    } else if (b0 < 0xf0) {
      out += String.fromCodePoint(
        ((b0 & 0x0f) << 12) | ((bytes[i + 1]! & 0x3f) << 6) | (bytes[i + 2]! & 0x3f),
      );
      i += 3;
    } else {
      out += String.fromCodePoint(
        ((b0 & 0x07) << 18) |
          ((bytes[i + 1]! & 0x3f) << 12) |
          ((bytes[i + 2]! & 0x3f) << 6) |
          (bytes[i + 3]! & 0x3f),
      );
      i += 4;
    }
  }
  return out;
}

/** FNV-1a — 오타 검출용이라 짧고 빠르면 충분하다 */
function checksum(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).slice(0, 6);
}

// ─────────────────────────────── 내보내기 ───────────────────────────────

/** 현재 진행도를 백업 코드 한 줄로. 유저가 보관했다가 다시 넣는다. */
export function exportProgressCode(): string {
  const s = useProgressStore.getState();
  const payload: BackupPayload = {
    h: s.highestUnlockedNpcId,
    n: Object.entries(s.npcById)
      .map(([id, row]): [number, number, number] => [
        Number(id),
        row.cleared ? 1 : 0,
        row.bestReactionMs ?? 0,
      ])
      // 아무 기록도 없는 NPC는 담지 않는다 (코드가 짧아진다)
      .filter(([, cleared, best]) => cleared === 1 || best > 0),
    a: [Math.round(s.reactionAggregate.sumMs), s.reactionAggregate.count],
    c: s.unlockedCharacterIds,
    x: s.hiddenCharUnlocked ? 1 : 0,
    p: s.paleRiderUnlocked ? 1 : 0,
    l: s.legacyReactionAggregate
      ? [Math.round(s.legacyReactionAggregate.sumMs), s.legacyReactionAggregate.count]
      : null,
  };
  const body = toBase64(JSON.stringify(payload));
  return `${PREFIX}.${body}.${checksum(body)}`;
}

// ─────────────────────────────── 가져오기 ───────────────────────────────

export type ImportResult =
  | { ok: true; clearedCount: number }
  | { ok: false; reason: 'format' | 'checksum' | 'corrupt' };

function isAggregate(v: unknown): v is [number, number] {
  return (
    Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number'
  );
}

/**
 * 백업 코드를 적용한다. 형식·체크섬이 맞지 않으면 **아무것도 바꾸지 않고** 실패를 돌려준다.
 * 성공 시 기존 진행도를 덮어쓰므로, 호출부에서 확인을 받은 뒤 부를 것.
 */
export function importProgressCode(raw: string): ImportResult {
  const code = raw.trim().replace(/\s+/g, '');
  const parts = code.split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) return { ok: false, reason: 'format' };

  const [, body, sum] = parts as [string, string, string];
  if (checksum(body) !== sum) return { ok: false, reason: 'checksum' };

  let payload: BackupPayload;
  try {
    payload = JSON.parse(fromBase64(body)) as BackupPayload;
  } catch {
    return { ok: false, reason: 'corrupt' };
  }

  if (
    typeof payload?.h !== 'number' ||
    !Array.isArray(payload.n) ||
    !isAggregate(payload.a) ||
    !Array.isArray(payload.c)
  ) {
    return { ok: false, reason: 'corrupt' };
  }

  const npcById: Record<number, { cleared: boolean; bestReactionMs: number | null }> = {};
  let clearedCount = 0;
  for (const row of payload.n) {
    if (!Array.isArray(row) || row.length !== 3) continue;
    const [id, cleared, best] = row;
    if (typeof id !== 'number' || !Number.isFinite(id)) continue;
    npcById[id] = { cleared: cleared === 1, bestReactionMs: best > 0 ? best : null };
    if (cleared === 1) clearedCount += 1;
  }

  useProgressStore.setState((s) => ({
    npcById: { ...s.npcById, ...npcById },
    highestUnlockedNpcId: payload.h,
    reactionAggregate: { sumMs: payload.a[0], count: payload.a[1] },
    unlockedCharacterIds: payload.c.filter((v) => typeof v === 'number'),
    hiddenCharUnlocked: payload.x === 1,
    paleRiderUnlocked: payload.p === 1,
    legacyReactionAggregate: isAggregate(payload.l)
      ? { sumMs: payload.l[0], count: payload.l[1] }
      : null,
    // isAdFree는 복원하지 않는다 — 스토어 구매 복원으로만 되살아나야 한다
  }));

  return { ok: true, clearedCount };
}
