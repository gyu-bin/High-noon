#!/usr/bin/env python3
"""결투 신호(READY / STEADY / BANG) 음성 파일 생성기.

espeak-ng로 합성한 뒤 후처리로 서부극 진행자 톤을 만든다.
기기 TTS는 발화 시작 지연이 기기마다 흔들려서 반응속도 게임의 신호로는
불리하다. 미리 구운 파일이면 지연이 일정하다.

준비물:
    apt-get install -y espeak-ng

실행:
    python3 scripts/gen_duel_cue_voice.py

문구는 `locales/*.json`의 `speech.*`에서 읽으므로 문구를 바꾸면 다시 돌리면 된다.
출력: assets/sounds/voice_{lang}_{cue}.wav (44.1kHz / 16bit / 모노)
"""
import json
import math
import os
import struct
import subprocess
import sys
import tempfile
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'assets', 'sounds')
LOCALES_DIR = os.path.join(ROOT, 'locales')
OUT_SR = 44100

CUES = ('ready', 'steady', 'bang')

# espeak 음성. 낮고 단호한 남성 톤을 쓰되, 후처리에서 더 내릴 것을 감안해
# 속도는 빠르게 뽑는다(피치를 내리면 느려지므로 여기서 미리 당겨둔다).
VOICES = {
    'en': {'voice': 'en-us+m3', 'speed': 168, 'pitch': 18},
    'ko': {'voice': 'ko+m3', 'speed': 168, 'pitch': 18},
    'ja': {'voice': 'ja+m3', 'speed': 168, 'pitch': 18},
}

# 큐별 색깔 — BANG만 확실히 낮고 두껍게 터뜨린다.
CUE_SHAPE = {
    'ready': {'pitch_ratio': 0.86, 'drive': 1.7, 'echo': 0.14},
    'steady': {'pitch_ratio': 0.84, 'drive': 1.9, 'echo': 0.14},
    'bang': {'pitch_ratio': 0.78, 'drive': 2.8, 'echo': 0.22},
}


def read_wav(path):
    with wave.open(path) as w:
        n, sr, sw, ch = w.getnframes(), w.getframerate(), w.getsampwidth(), w.getnchannels()
        raw = w.readframes(n)
    fmt = {1: 'b', 2: 'h', 4: 'i'}[sw]
    data = struct.unpack('<' + fmt * (n * ch), raw)
    peak = float(1 << (8 * sw - 1))
    mono = [data[i * ch] / peak for i in range(n)] if ch > 1 else [s / peak for s in data]
    return mono, sr


def trim_silence(sig, sr, thresh=0.02, pad_ms=12):
    """앞뒤 무음 제거 — 큐가 즉시 터져야 반응 신호로 쓸 수 있다."""
    win = max(1, int(sr * 0.005))
    loud = [
        i for i in range(0, len(sig) - win, win)
        if max(abs(v) for v in sig[i:i + win]) > thresh
    ]
    if not loud:
        return sig
    pad = int(sr * pad_ms / 1000)
    start = max(0, loud[0] - pad)
    end = min(len(sig), loud[-1] + win + pad * 3)
    return sig[start:end]


def resample(sig, ratio, src_sr, dst_sr):
    """선형 보간 리샘플. ratio<1이면 길어지고 피치가 내려간다(= 목소리가 굵어짐)."""
    step = (src_sr / dst_sr) * ratio
    out, pos = [], 0.0
    while pos < len(sig) - 1:
        i = int(pos)
        f = pos - i
        out.append(sig[i] * (1 - f) + sig[i + 1] * f)
        pos += step
    return out


def highpass(sig, sr, cutoff=110.0):
    """저역 럼블 제거 — 임팩트 사운드의 서브베이스와 자리를 안 뺏도록."""
    rc = 1.0 / (2 * math.pi * cutoff)
    a = rc / (rc + 1.0 / sr)
    out, prev_in, prev_out = [], 0.0, 0.0
    for v in sig:
        prev_out = a * (prev_out + v - prev_in)
        prev_in = v
        out.append(prev_out)
    return out


def presence(sig, sr, amount=0.35, cutoff=2200.0):
    """자음 또렷하게 — 고역을 살짝 더한다(총성·BGM 위에서 묻히지 않도록)."""
    rc = 1.0 / (2 * math.pi * cutoff)
    a = (1.0 / sr) / (rc + 1.0 / sr)
    low, out = 0.0, []
    for v in sig:
        low += a * (v - low)
        out.append(v + (v - low) * amount)
    return out


def saturate(sig, drive):
    return [math.tanh(v * drive) / math.tanh(drive) for v in sig]


def slapback(sig, sr, delay_ms=52.0, gain=0.18):
    """짧은 반사음 — 허허벌판에서 외치는 공간감."""
    d = int(sr * delay_ms / 1000)
    out = list(sig) + [0.0] * d
    for i, v in enumerate(sig):
        out[i + d] += v * gain
    return out


def fade_edges(sig, sr, ms=6.0):
    n = max(1, int(sr * ms / 1000))
    for i in range(min(n, len(sig))):
        sig[i] *= i / n
        sig[len(sig) - 1 - i] *= i / n
    return sig


def normalize(sig, peak=0.92):
    m = max((abs(v) for v in sig), default=0.0) or 1.0
    return [v * peak / m for v in sig]


def write_wav(path, sig, sr=OUT_SR):
    with wave.open(path, 'w') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(b''.join(
            struct.pack('<h', max(-32768, min(32767, int(v * 32767)))) for v in sig
        ))


def synth(text, cfg, tmp_path):
    subprocess.run(
        ['espeak-ng', '-v', cfg['voice'], '-s', str(cfg['speed']),
         '-p', str(cfg['pitch']), '-a', '200', '-w', tmp_path, text],
        check=True, capture_output=True,
    )


def build(lang, cue, text, tmpdir):
    cfg = VOICES[lang]
    shape = CUE_SHAPE[cue]
    raw = os.path.join(tmpdir, f'{lang}_{cue}.wav')
    synth(text, cfg, raw)

    sig, sr = read_wav(raw)
    sig = trim_silence(sig, sr)
    sig = resample(sig, shape['pitch_ratio'], sr, OUT_SR)
    sig = highpass(sig, OUT_SR)
    sig = saturate(sig, shape['drive'])
    sig = presence(sig, OUT_SR)
    sig = slapback(sig, OUT_SR, gain=shape['echo'])
    sig = fade_edges(normalize(sig), OUT_SR)

    name = f'voice_{lang}_{cue}.wav'
    out = os.path.join(OUT_DIR, name)
    write_wav(out, sig)
    print(f'{name:24} {len(sig)/OUT_SR:.2f}s  {os.path.getsize(out)//1024}KB  "{text}"')


def main():
    if subprocess.run(['which', 'espeak-ng'], capture_output=True).returncode != 0:
        sys.exit('espeak-ng가 필요합니다: apt-get install -y espeak-ng')
    os.makedirs(OUT_DIR, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmpdir:
        for lang in VOICES:
            with open(os.path.join(LOCALES_DIR, f'{lang}.json'), encoding='utf-8') as f:
                speech = json.load(f).get('speech', {})
            for cue in CUES:
                text = speech.get(cue)
                if not text:
                    print(f'! {lang}.{cue} 문구 없음 — 건너뜀')
                    continue
                build(lang, cue, text, tmpdir)


if __name__ == '__main__':
    main()
