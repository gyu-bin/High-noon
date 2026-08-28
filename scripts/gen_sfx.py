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


def gunshot(dur: float = 0.48) -> list[float]:
    """리볼버 총성 — 초고속 크랙 + 저역 블로우 + 메탈릭 링 + 잔향."""
    n = int(dur * SR)
    out: list[float] = []
    lp = 0.0
    hp = 0.0
    for i in range(n):
        t = i / SR
        white = random.uniform(-1.0, 1.0)

        # 초반 크랙 (고역 노이즈)
        crack = white * math.exp(-90.0 * t) * 1.35

        # 몸통 블로우 (저역)
        body = (
            math.sin(2 * math.pi * 72 * t) * math.exp(-18.0 * t)
            + math.sin(2 * math.pi * 118 * t) * math.exp(-28.0 * t) * 0.55
        )

        # 배럴 메탈릭 링
        ring = (
            math.sin(2 * math.pi * 1850 * t) * math.exp(-42.0 * t) * 0.22
            + math.sin(2 * math.pi * 3200 * t) * math.exp(-70.0 * t) * 0.12
        )

        # 광대역 노이즈 테일 (머즐 블라스트)
        lp = lp * 0.72 + white * 0.28
        hp = white - lp
        blast = (lp * 0.85 + hp * 0.35) * math.exp(-11.0 * t)

        # 짧은 잔향 느낌
        room = white * math.exp(-4.2 * t) * 0.08

        v = crack + body * 1.15 + ring + blast * 0.9 + room
        # 초초반 soft attack으로 DAC 클릭 방지
        if t < 0.0015:
            v *= t / 0.0015
        out.append(v)
    return out


def seq(notes: list[tuple[float, float]], gap: float = 0.0, decay: float = 6.0) -> list[float]:
    out: list[float] = []
    for freq, dur in notes:
        out += tone(freq, dur, decay=decay, harmonics=(1.0, 0.35, 0.14))
        if gap:
            out += [0.0] * int(gap * SR)
    return out


def shout_burst(base: float, dur: float, noise_amt: float = 0.55) -> list[float]:
    """짧은 외침/강조 — 노이즈 + 하강 포먼트."""
    n = int(dur * SR)
    out = []
    for i in range(n):
        t = i / SR
        env = math.exp(-9.0 * t)
        freq = base * (1.0 + 1.8 * math.exp(-14.0 * t))
        v = math.sin(2 * math.pi * freq * t)
        if noise_amt and t < dur * 0.45:
            v += random.uniform(-1, 1) * noise_amt * math.exp(-20.0 * t)
        out.append(v * env * min(1.0, t / 0.004))
    return out


def duel_cue_ready() -> list[float]:
    """긴장감 — 저음 타격 → 상승."""
    gap = int(0.018 * SR)
    a = click(280, 0.07, 42, 0.45)
    b = tone(520, 0.11, decay=10, harmonics=(1.0, 0.55, 0.2))
    c = shout_burst(680, 0.14, 0.35)
    return a + [0.0] * gap + b + [0.0] * gap + c


def duel_cue_steady() -> list[float]:
    """집중 — 떨리는 중음 + 마무리 강조."""
    n = int(0.26 * SR)
    out = []
    for i in range(n):
        t = i / SR
        trem = 1.0 + 0.11 * math.sin(2 * math.pi * 14 * t)
        v = math.sin(2 * math.pi * 480 * t) * trem * math.exp(-2.8 * t)
        out.append(v)
    tail = shout_burst(560, 0.1, 0.28)
    return out + tail


def duel_cue_bang() -> list[float]:
    """뱅 — 폭발적 외침(총성은 별도)."""
    return shout_burst(320, 0.2, 0.72) + click(140, 0.06, 28, 0.35)


def defeat_thud() -> list[float]:
    """쓰러짐 — 저역 충격 + 흙먼지."""
    n = int(0.38 * SR)
    out = []
    prev = 0.0
    for i in range(n):
        t = i / SR
        env = math.exp(-8.5 * t)
        thump = math.sin(2 * math.pi * 62 * t) * math.exp(-20.0 * t)
        nse = random.uniform(-1, 1) * math.exp(-28.0 * t) * 0.45
        prev = prev * 0.58 + nse * 0.42
        out.append((thump * 1.1 + prev) * env * min(1.0, t / 0.003))
    return out


def heart_crack() -> list[float]:
    """하트 깨짐 — 짧은 금속/유리 크랙 (멜로디 X)."""
    crack = click(920, 0.045, 72, 0.55)
    tail = tone(180, 0.07, decay=24, harmonics=(1.0, 0.2))
    return crack + tail


def build() -> None:
    random.seed(7)
    os.makedirs(os.path.abspath(OUT_DIR), exist_ok=True)
    print("generating SFX (wav):")

    # 카운트다운 큐 — 짧고 명확, 음정으로 진행감
    _write("ready_click.wav", click(660, 0.14, decay=34, noise=0.25))
    _write("steady_click.wav", click(990, 0.13, decay=36, noise=0.22))
    _write("bang_shot.wav", gunshot(0.48))

    # 결투 음성 큐 — TTS 대신 임팩트 있는 WAV (화면 텍스트가 i18n)
    _write("cue_ready.wav", duel_cue_ready())
    _write("cue_steady.wav", duel_cue_steady())
    _write("cue_bang.wav", duel_cue_bang())

    # 조작/결과
    _write("early_tap.wav", seq([(440, 0.09), (300, 0.13)], decay=9))          # 삑- 실패
    _write("win_fanfare.wav", seq([(523, 0.12), (659, 0.12), (784, 0.14), (1047, 0.28)], decay=4))
    _write("lose_sad.wav", seq([(330, 0.22), (262, 0.28)], decay=4.2))        # 매치 패배용 — 짧게
    _write("defeat_thud.wav", defeat_thud())
    _write("heart_break.wav", heart_crack())
    _write("level_clear.wav", seq([(523, 0.11), (659, 0.11), (784, 0.11), (1047, 0.24)], decay=3.5))

    print("done ->", os.path.abspath(OUT_DIR))


if __name__ == "__main__":
    build()
