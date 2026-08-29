#!/usr/bin/env python3
"""결투 신호(READY / STEADY / BANG) 임팩트 사운드 생성기.

TTS 음성 아래에 깔아 박진감을 주는 짧은 타악 사운드를 합성한다.
표준 라이브러리만 사용 — 44.1kHz / 16bit / 모노로 `assets/sounds/`에 쓴다.

    python3 scripts/gen_duel_cue_sounds.py

톤을 바꾸고 싶으면 각 함수의 주파수·감쇠 값을 조정한 뒤 다시 실행하면 된다.
"""
import math
import os
import random
import struct
import wave

SR = 44100
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'sounds')


def silence(dur):
    return [0.0] * int(SR * dur)


def mix(base, layer, at=0.0, gain=1.0):
    """base 위에 layer를 at초 지점부터 더한다 (길이가 모자라면 늘림)."""
    start = int(SR * at)
    need = start + len(layer)
    if need > len(base):
        base.extend([0.0] * (need - len(base)))
    for i, v in enumerate(layer):
        base[start + i] += v * gain
    return base


def env_exp(n, decay):
    """지수 감쇠 엔벨로프 — decay가 클수록 빨리 사라진다."""
    return [math.exp(-decay * i / n) for i in range(n)]


def attack(sig, ms=2.0):
    """클릭 노이즈 방지를 위한 짧은 페이드인."""
    a = max(1, int(SR * ms / 1000))
    for i in range(min(a, len(sig))):
        sig[i] *= i / a
    return sig


def tail_fade(sig, ms=8.0):
    f = max(1, int(SR * ms / 1000))
    for i in range(min(f, len(sig))):
        sig[len(sig) - 1 - i] *= i / f
    return sig


def sine_drop(dur, f_start, f_end, decay=5.0, curve=2.0):
    """피치가 떨어지는 사인 — 타격감의 핵심."""
    n = int(SR * dur)
    env = env_exp(n, decay)
    out = []
    phase = 0.0
    for i in range(n):
        t = i / n
        f = f_end + (f_start - f_end) * ((1.0 - t) ** curve)
        phase += 2 * math.pi * f / SR
        out.append(math.sin(phase) * env[i])
    return attack(out, 1.0)


def noise_burst(dur, decay=40.0, lowpass=0.35, seed=7):
    """트랜지언트용 노이즈 — lowpass가 작을수록 둔탁해진다."""
    rng = random.Random(seed)
    n = int(SR * dur)
    env = env_exp(n, decay)
    out, prev = [], 0.0
    for i in range(n):
        white = rng.uniform(-1.0, 1.0)
        prev = prev + lowpass * (white - prev)  # 1차 저역통과
        out.append(prev * env[i])
    return attack(out, 0.5)


def normalize(sig, peak=0.89):
    m = max(abs(v) for v in sig) or 1.0
    return [v * peak / m for v in sig]


def soft_clip(sig):
    """살짝 물려서 두껍게 — tanh 새추레이션."""
    return [math.tanh(v * 1.35) for v in sig]


def write(name, sig):
    sig = tail_fade(normalize(soft_clip(sig)))
    path = os.path.join(OUT_DIR, name)
    with wave.open(path, 'w') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b''.join(
            struct.pack('<h', max(-32768, min(32767, int(v * 32767)))) for v in sig
        ))
    print(f'{name:24} {len(sig)/SR:.2f}s  {os.path.getsize(path)//1024}KB')


def make_ready():
    """낮게 깔리는 첫 신호 — 긴장의 시작."""
    out = silence(0.30)
    mix(out, sine_drop(0.28, 165, 92, decay=6.0), gain=0.95)
    mix(out, noise_burst(0.035, decay=70, lowpass=0.30), gain=0.45)
    mix(out, sine_drop(0.10, 520, 380, decay=14.0), gain=0.18)
    return out


def make_steady():
    """한 단계 위 — 같은 색이되 더 조인다."""
    out = silence(0.30)
    mix(out, sine_drop(0.27, 220, 124, decay=6.2), gain=0.95)
    mix(out, noise_burst(0.035, decay=70, lowpass=0.34, seed=11), gain=0.50)
    mix(out, sine_drop(0.10, 700, 500, decay=14.0), gain=0.22)
    return out


def make_bang():
    """터지는 신호 — 총성이 아니라 '지금이다' 신호라서 임팩트+서브베이스로 간다."""
    out = silence(0.70)
    # 순간 트랜지언트 (때리는 느낌)
    mix(out, noise_burst(0.07, decay=55, lowpass=0.75, seed=3), gain=0.85)
    # 본체 임팩트
    mix(out, sine_drop(0.55, 240, 46, decay=4.2, curve=2.6), gain=1.0)
    # 서브베이스 드롭 (가슴 울리는 저역)
    mix(out, sine_drop(0.60, 90, 34, decay=3.0, curve=1.6), gain=0.75)
    # 금속성 스냅 — 명료도
    mix(out, sine_drop(0.09, 1750, 900, decay=22.0), gain=0.30)
    return out


if __name__ == '__main__':
    os.makedirs(OUT_DIR, exist_ok=True)
    write('cue_ready_impact.wav', make_ready())
    write('cue_steady_impact.wav', make_steady())
    write('cue_bang_impact.wav', make_bang())
