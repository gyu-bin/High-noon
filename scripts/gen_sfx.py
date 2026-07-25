#!/usr/bin/env python3
"""High Noon 게임용 짧은 효과음(WAV) 생성기.

외부 의존성 없이 표준 라이브러리(math/struct/wave)만 사용한다.
16-bit PCM · mono · 44.1kHz. 짧고 서로 확실히 구분되는 SFX를 만든다.
"""
from __future__ import annotations

import math
import os
import random
import struct
import wave

SR = 44100
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "sounds")


def _write(name: str, samples: list[float]) -> None:
    peak = max((abs(s) for s in samples), default=1.0) or 1.0
    gain = 0.89 / peak
    frames = bytearray()
    for s in samples:
        v = int(max(-1.0, min(1.0, s * gain)) * 32767)
        frames += struct.pack("<h", v)
    path = os.path.abspath(os.path.join(OUT_DIR, name))
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(bytes(frames))
    dur = len(samples) / SR
    print(f"  {name:20s} {dur:5.3f}s  {len(frames)+44:>7d} bytes")


def _env(n: int, attack: float, decay: float) -> list[float]:
    """공통 fade in/out 엔벨로프 (클릭 방지)."""
    a = max(1, int(attack * SR))
    d = max(1, int(decay * SR))
    out = []
    for i in range(n):
        if i < a:
            out.append(i / a)
        elif i > n - d:
            out.append(max(0.0, (n - i) / d))
        else:
            out.append(1.0)
    return out


def tone(freq: float, dur: float, decay: float = 0.0, harmonics=(1.0,)) -> list[float]:
    n = int(dur * SR)
    env = _env(n, 0.004, min(0.05, dur * 0.5))
    out = []
    for i in range(n):
        t = i / SR
        v = 0.0
        for k, amp in enumerate(harmonics, start=1):
            v += amp * math.sin(2 * math.pi * freq * k * t)
        d = math.exp(-decay * t) if decay else 1.0
        out.append(v * d * env[i])
    return out


def click(freq: float, dur: float, decay: float, noise: float = 0.0) -> list[float]:
    """나무 두드림 느낌 — 감쇠 사인 + 약간의 노이즈 어택."""
    n = int(dur * SR)
    env = _env(n, 0.001, dur * 0.25)
    out = []
    for i in range(n):
        t = i / SR
        d = math.exp(-decay * t)
        v = math.sin(2 * math.pi * freq * t) * d
        if noise and t < 0.006:
            v += (random.uniform(-1, 1)) * noise * (1 - t / 0.006)
        out.append(v * env[i])
    return out


def gunshot(dur: float = 0.34) -> list[float]:
    """총성 — 저역 thump + 광대역 노이즈 버스트, 빠른 감쇠."""
    n = int(dur * SR)
    out = []
    prev = 0.0
    for i in range(n):
        t = i / SR
        # 빠른 어택, 지수 감쇠
        amp = math.exp(-16.0 * t)
        white = random.uniform(-1, 1)
        # 살짝 로우패스 (묵직함)
        prev = prev * 0.55 + white * 0.45
        thump = math.sin(2 * math.pi * 85 * t) * math.exp(-26.0 * t)
        crack = white * math.exp(-55.0 * t)
        out.append((prev * 0.7 + thump * 0.9 + crack * 0.6) * amp)
    # 앞쪽 살짝 페이드로 클릭 방지
    for i in range(min(40, n)):
        out[i] *= i / 40
    return out


def seq(notes: list[tuple[float, float]], gap: float = 0.0, decay: float = 6.0) -> list[float]:
    out: list[float] = []
    for freq, dur in notes:
        out += tone(freq, dur, decay=decay, harmonics=(1.0, 0.35, 0.14))
        if gap:
            out += [0.0] * int(gap * SR)
    return out


def build() -> None:
    random.seed(7)
    os.makedirs(os.path.abspath(OUT_DIR), exist_ok=True)
    print("generating SFX (wav):")

    # 카운트다운 큐 — 짧고 명확, 음정으로 진행감
    _write("ready_click.wav", click(660, 0.14, decay=34, noise=0.25))
    _write("steady_click.wav", click(990, 0.13, decay=36, noise=0.22))
    _write("bang_shot.wav", gunshot(0.34))

    # 조작/결과
    _write("early_tap.wav", seq([(440, 0.09), (300, 0.13)], decay=9))          # 삑- 실패
    _write("win_fanfare.wav", seq([(523, 0.12), (659, 0.12), (784, 0.14), (1047, 0.28)], decay=4))
    _write("lose_sad.wav", seq([(392, 0.18), (311, 0.30)], decay=3.5))
    _write("heart_break.wav", seq([(600, 0.10), (450, 0.10), (250, 0.22)], decay=6))
    _write("level_clear.wav", seq([(523, 0.11), (659, 0.11), (784, 0.11), (1047, 0.24)], decay=3.5))

    print("done ->", os.path.abspath(OUT_DIR))


if __name__ == "__main__":
    build()
