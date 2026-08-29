#!/usr/bin/env python3
"""결투 보이스(cue_{ready,steady,bang}_v1~5) 정규화.

READY에서 보이스 세트를 랜덤으로 뽑기 때문에, 세트마다 소리가 시작되는 시점과
음량이 다르면 **어느 세트가 걸리느냐로 체감 반응속도가 갈린다.** 정규화 전
BANG 파일들의 소리 시작 시점은 25.5ms ~ 108.1ms로 82.6ms나 벌어져 있었다.
기기 간 주사율 편차(~4ms)의 20배다.

맞추는 것은 두 가지:

1. **소리 시작 시점** — 앞쪽 무음을 잘라 모든 파일이 `LEAD_MS` 뒤에 소리가
   나도록 통일한다. 재생 호출과 실제 소리 사이의 지연이 세트와 무관해진다.
2. **음량** — 발성 구간 RMS를 큐별 중앙값에 맞춘다. 작게 녹음된 세트가 늦게
   인지되는 것을 막는다. 큐 사이의 상대적 크기(READY < BANG 등)는 건드리지
   않으려고 큐별로 따로 맞춘다. 피크는 클리핑 직전에서 제한한다.

파일을 제자리에서 덮어쓴다. 원본은 git 히스토리에 있다.

    python3 scripts/normalize_duel_voices.py           # 적용
    python3 scripts/normalize_duel_voices.py --check   # 측정만, 변경 없음
"""
import argparse
import os
import struct
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOUND_DIR = os.path.join(ROOT, 'assets', 'sounds')

CUES = ('ready', 'steady', 'bang')
PACKS = (1, 2, 3, 4, 5)

# 재생 호출 후 소리가 나기까지 남겨둘 여유 (ms).
# 0으로 바짝 붙이면 디코더가 첫 샘플을 놓치거나 클릭이 들릴 수 있다.
LEAD_MS = 8.0
# 소리 시작 판정 — 파일 피크 대비 비율
ONSET_THRESH = 0.05
# 뒤쪽 무음은 이 길이만 남기고 자른다 (ms)
TAIL_KEEP_MS = 60.0
# 클리핑 방지 상한
PEAK_CEILING = 0.95
FADE_IN_MS = 3.0
FADE_OUT_MS = 6.0


def read_wav(path):
    with wave.open(path) as w:
        n, sr, sw, ch = w.getnframes(), w.getframerate(), w.getsampwidth(), w.getnchannels()
        raw = w.readframes(n)
    fmt = {1: 'b', 2: 'h', 4: 'i'}[sw]
    d = struct.unpack('<' + fmt * (n * ch), raw)
    peak = float(1 << (8 * sw - 1))
    mono = [d[i * ch] / peak for i in range(n)] if ch > 1 else [v / peak for v in d]
    return mono, sr


def write_wav(path, sig, sr):
    with wave.open(path, 'w') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(b''.join(
            struct.pack('<h', max(-32768, min(32767, int(v * 32767)))) for v in sig
        ))


def voiced_range(sig):
    """소리가 실제로 나는 구간 [시작, 끝)."""
    mx = max((abs(v) for v in sig), default=0.0)
    if mx <= 0:
        return 0, len(sig)
    thr = ONSET_THRESH * mx
    start = next((i for i, v in enumerate(sig) if abs(v) >= thr), 0)
    end = next((i for i in range(len(sig) - 1, -1, -1) if abs(sig[i]) >= thr), len(sig) - 1)
    return start, end + 1


def rms(sig):
    if not sig:
        return 0.0
    return (sum(v * v for v in sig) / len(sig)) ** 0.5


def measure(path):
    sig, sr = read_wav(path)
    start, end = voiced_range(sig)
    return {
        'sig': sig, 'sr': sr, 'start': start, 'end': end,
        'dur': len(sig) / sr,
        'onset_ms': start / sr * 1000,
        'peak': max((abs(v) for v in sig), default=0.0),
        'rms': rms(sig[start:end]),
    }


def median(xs):
    s = sorted(xs)
    return s[len(s) // 2] if s else 0.0


def apply_fades(sig, sr):
    fi = max(1, int(sr * FADE_IN_MS / 1000))
    fo = max(1, int(sr * FADE_OUT_MS / 1000))
    for i in range(min(fi, len(sig))):
        sig[i] *= i / fi
    for i in range(min(fo, len(sig))):
        sig[len(sig) - 1 - i] *= i / fo
    return sig


def normalize(m, target_rms):
    """앞무음 정리 + 음량 정렬. 정규화된 샘플 배열을 돌려준다."""
    sig, sr, start, end = m['sig'], m['sr'], m['start'], m['end']

    lead = int(sr * LEAD_MS / 1000)
    tail_keep = int(sr * TAIL_KEEP_MS / 1000)
    body = sig[start:min(len(sig), end + tail_keep)]
    out = [0.0] * lead + body

    gain = (target_rms / m['rms']) if m['rms'] > 0 else 1.0
    out = [v * gain for v in out]

    peak = max((abs(v) for v in out), default=0.0)
    if peak > PEAK_CEILING:
        out = [v * PEAK_CEILING / peak for v in out]

    return apply_fades(out, sr)


def path_for(cue, pack):
    return os.path.join(SOUND_DIR, f'cue_{cue}_v{pack}.wav')


def report(title, rows):
    print(f'\n{title}')
    print(f'  {"파일":<22}{"길이":>7}{"소리시작":>11}{"피크":>8}{"RMS":>8}')
    for name, m in rows:
        print(f'  {name:<22}{m["dur"]:>6.2f}s{m["onset_ms"]:>9.1f}ms'
              f'{m["peak"]:>8.2f}{m["rms"]:>8.3f}')
    onsets = [m['onset_ms'] for _, m in rows]
    rmss = [m['rms'] for _, m in rows]
    print(f'  → 소리시작 편차 {max(onsets) - min(onsets):.1f}ms, '
          f'RMS 최대/최소 {max(rmss) / max(min(rmss), 1e-9):.2f}배')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true', help='측정만 하고 파일은 건드리지 않는다')
    args = ap.parse_args()

    missing = [path_for(c, p) for c in CUES for p in PACKS if not os.path.exists(path_for(c, p))]
    if missing:
        raise SystemExit('파일 없음: ' + ', '.join(os.path.basename(m) for m in missing))

    for cue in CUES:
        measured = [(f'cue_{cue}_v{p}.wav', measure(path_for(cue, p))) for p in PACKS]
        report(f'[{cue.upper()}] 현재', measured)

        if args.check:
            continue

        target = median([m['rms'] for _, m in measured])
        for pack, (name, m) in zip(PACKS, measured):
            write_wav(path_for(cue, pack), normalize(m, target), m['sr'])

        after = [(f'cue_{cue}_v{p}.wav', measure(path_for(cue, p))) for p in PACKS]
        report(f'[{cue.upper()}] 정규화 후', after)


if __name__ == '__main__':
    main()
