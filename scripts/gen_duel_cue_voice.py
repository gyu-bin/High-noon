#!/usr/bin/env python3
"""결투 신호(READY / STEADY / BANG) 음성 파일 생성기.

기기 TTS 대신 미리 구운 파일을 쓰는 이유: expo-speech는 발화 시작 지연이
기기·엔진마다 수십~수백 ms씩 흔들리는데, 이 게임은 그 신호를 보고 반응 속도를
재기 때문에 그 편차가 그대로 기록에 섞인다. 파일 재생은 지연이 일정하다.

문구는 `locales/*.json`의 `speech.*`에서 읽는다 (문구를 바꾸면 다시 실행).
출력은 `assets/sounds/voice_{lang}_{cue}.wav` — 44.1kHz / 16bit / 모노.

백엔드 3종:

  say (macOS 내장, 기본값) — 지금 쓰는 영어 클립(Eddy)과 같은 방식. 무료.
      python3 scripts/gen_duel_cue_voice.py --backend say
      목소리 목록: say -v '?'

  elevenlabs — 품질이 가장 좋다. API 키 필요(유료).
      export ELEVENLABS_API_KEY=sk_...
      python3 scripts/gen_duel_cue_voice.py --backend elevenlabs
      PCM 출력은 유료 플랜 전용이다. 무료 플랜이면 mp3만 나오므로
      ffmpeg로 변환해야 한다(스크립트가 알려준다).

  espeak — 어디서나 되지만 로봇 소리에 가깝다. 최후의 수단.
      apt-get install -y espeak-ng   /   brew install espeak-ng

특정 언어만 다시 굽고 싶으면: --langs ko ja
"""
import argparse
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

# macOS `say` 목소리. 영어는 현재 쓰는 클립과 맞춰 Eddy.
SAY_VOICES = {'en': 'Eddy', 'ko': 'Yuna', 'ja': 'Kyoko'}
SAY_RATE = {'ready': 165, 'steady': 165, 'bang': 185}

# ElevenLabs 기본 보이스(Adam) — 낮고 단단한 남성. 바꾸려면 --voice-id.
ELEVEN_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'
ELEVEN_MODEL = 'eleven_multilingual_v2'

ESPEAK_VOICES = {'en': 'en-us+m3', 'ko': 'ko+m3', 'ja': 'ja+m3'}

# 큐별 마감 — BANG만 확실히 두껍게 터뜨린다.
CUE_SHAPE = {
    'ready': {'drive': 1.3, 'gain': 0.88},
    'steady': {'drive': 1.4, 'gain': 0.90},
    'bang': {'drive': 2.0, 'gain': 0.96},
}


# ─────────────────────────────── 오디오 유틸 ───────────────────────────────

def read_wav(path):
    with wave.open(path) as w:
        n, sr, sw, ch = w.getnframes(), w.getframerate(), w.getsampwidth(), w.getnchannels()
        raw = w.readframes(n)
    fmt = {1: 'b', 2: 'h', 4: 'i'}[sw]
    data = struct.unpack('<' + fmt * (n * ch), raw)
    peak = float(1 << (8 * sw - 1))
    mono = [data[i * ch] / peak for i in range(n)] if ch > 1 else [s / peak for s in data]
    return mono, sr


def write_wav(path, sig, sr=OUT_SR):
    with wave.open(path, 'w') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(b''.join(
            struct.pack('<h', max(-32768, min(32767, int(v * 32767)))) for v in sig
        ))


def resample(sig, src_sr, dst_sr):
    if src_sr == dst_sr:
        return list(sig)
    step = src_sr / dst_sr
    out, pos = [], 0.0
    while pos < len(sig) - 1:
        i = int(pos)
        f = pos - i
        out.append(sig[i] * (1 - f) + sig[i + 1] * f)
        pos += step
    return out


def trim_silence(sig, sr, thresh=0.02, pad_ms=10):
    """앞뒤 무음 제거 — 큐가 즉시 터져야 반응 신호로 쓸 수 있다."""
    win = max(1, int(sr * 0.005))
    loud = [i for i in range(0, len(sig) - win, win)
            if max(abs(v) for v in sig[i:i + win]) > thresh]
    if not loud:
        return sig
    pad = int(sr * pad_ms / 1000)
    return sig[max(0, loud[0] - pad):min(len(sig), loud[-1] + win + pad * 3)]


def highpass(sig, sr, cutoff=95.0):
    """임팩트음의 서브베이스와 자리를 나눠 갖도록 저역 정리."""
    rc = 1.0 / (2 * math.pi * cutoff)
    a = rc / (rc + 1.0 / sr)
    out, prev_in, prev_out = [], 0.0, 0.0
    for v in sig:
        prev_out = a * (prev_out + v - prev_in)
        prev_in = v
        out.append(prev_out)
    return out


def saturate(sig, drive):
    if drive <= 1.0:
        return list(sig)
    return [math.tanh(v * drive) / math.tanh(drive) for v in sig]


def fade_edges(sig, sr, ms=5.0):
    n = max(1, int(sr * ms / 1000))
    for i in range(min(n, len(sig))):
        sig[i] *= i / n
        sig[len(sig) - 1 - i] *= i / n
    return sig


def normalize(sig, peak):
    m = max((abs(v) for v in sig), default=0.0) or 1.0
    return [v * peak / m for v in sig]


def finish(sig, sr, cue):
    shape = CUE_SHAPE[cue]
    sig = trim_silence(sig, sr)
    sig = resample(sig, sr, OUT_SR)
    sig = highpass(sig, OUT_SR)
    sig = saturate(sig, shape['drive'])
    return fade_edges(normalize(sig, shape['gain']), OUT_SR)


# ─────────────────────────────── 백엔드 ───────────────────────────────

def synth_say(text, lang, cue, tmpdir):
    voice = SAY_VOICES.get(lang)
    if not voice:
        raise RuntimeError(f'{lang}용 say 목소리가 정의되지 않음')
    aiff = os.path.join(tmpdir, 'out.aiff')
    wav = os.path.join(tmpdir, 'out.wav')
    subprocess.run(['say', '-v', voice, '-r', str(SAY_RATE[cue]), '-o', aiff, text],
                   check=True, capture_output=True)
    # afconvert도 macOS 내장 — ffmpeg 불필요
    subprocess.run(['afconvert', '-f', 'WAVE', '-d', f'LEI16@{OUT_SR}', '-c', '1', aiff, wav],
                   check=True, capture_output=True)
    return read_wav(wav)


def synth_espeak(text, lang, cue, tmpdir):
    voice = ESPEAK_VOICES.get(lang)
    if not voice:
        raise RuntimeError(f'{lang}용 espeak 목소리가 정의되지 않음')
    wav = os.path.join(tmpdir, 'out.wav')
    speed = 168 if cue != 'bang' else 185
    subprocess.run(['espeak-ng', '-v', voice, '-s', str(speed), '-p', '18',
                    '-a', '200', '-w', wav, text], check=True, capture_output=True)
    return read_wav(wav)


def synth_elevenlabs(text, lang, cue, tmpdir, voice_id):
    """PCM 16bit/44.1kHz를 직접 받아 쓴다 — 디코더(ffmpeg) 불필요."""
    import urllib.error
    import urllib.request

    key = os.environ.get('ELEVENLABS_API_KEY')
    if not key:
        raise RuntimeError('ELEVENLABS_API_KEY 환경변수가 필요합니다')

    body = json.dumps({
        'text': text,
        'model_id': ELEVEN_MODEL,
        # 짧은 외침이라 표현을 세게, 안정성은 낮게
        'voice_settings': {'stability': 0.35, 'similarity_boost': 0.8, 'style': 0.65},
    }).encode()
    url = (f'https://api.elevenlabs.io/v1/text-to-speech/{voice_id}'
           f'?output_format=pcm_{OUT_SR}')
    req = urllib.request.Request(url, data=body, headers={
        'xi-api-key': key,
        'Content-Type': 'application/json',
        'Accept': 'audio/pcm',
    })
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            raw = resp.read()
    except urllib.error.HTTPError as e:
        detail = e.read().decode('utf-8', 'replace')[:300]
        if e.code in (401, 403):
            raise RuntimeError(f'인증 실패({e.code}). API 키를 확인하세요. {detail}')
        if 'output_format' in detail or e.code == 422:
            raise RuntimeError(
                f'PCM 출력이 거부됐습니다({e.code}). PCM은 유료 플랜 전용입니다.\n'
                f'  무료 플랜이면 output_format을 mp3_44100_128로 바꾸고\n'
                f'  ffmpeg로 wav 변환이 필요합니다. 응답: {detail}')
        raise RuntimeError(f'HTTP {e.code}: {detail}')

    n = len(raw) // 2
    data = struct.unpack('<' + 'h' * n, raw[:n * 2])
    return [s / 32768.0 for s in data], OUT_SR


BACKENDS = {'say': synth_say, 'espeak': synth_espeak, 'elevenlabs': synth_elevenlabs}


# ─────────────────────────────── 실행 ───────────────────────────────

def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--backend', choices=sorted(BACKENDS), default='say')
    ap.add_argument('--langs', nargs='*', default=['en', 'ko', 'ja'])
    ap.add_argument('--voice-id', default=ELEVEN_VOICE_ID,
                    help='elevenlabs 백엔드의 보이스 ID')
    args = ap.parse_args()

    if args.backend == 'say' and sys.platform != 'darwin':
        sys.exit('say 백엔드는 macOS에서만 됩니다. --backend espeak 또는 elevenlabs를 쓰세요.')

    os.makedirs(OUT_DIR, exist_ok=True)
    made = 0
    with tempfile.TemporaryDirectory() as tmpdir:
        for lang in args.langs:
            path = os.path.join(LOCALES_DIR, f'{lang}.json')
            if not os.path.exists(path):
                print(f'! locales/{lang}.json 없음 — 건너뜀')
                continue
            with open(path, encoding='utf-8') as f:
                speech = json.load(f).get('speech', {})
            for cue in CUES:
                text = speech.get(cue)
                if not text:
                    print(f'! {lang}.{cue} 문구 없음 — 건너뜀')
                    continue
                try:
                    if args.backend == 'elevenlabs':
                        sig, sr = synth_elevenlabs(text, lang, cue, tmpdir, args.voice_id)
                    else:
                        sig, sr = BACKENDS[args.backend](text, lang, cue, tmpdir)
                except Exception as e:  # noqa: BLE001 — 백엔드별 실패를 그대로 보여준다
                    print(f'! {lang}.{cue} 실패: {e}')
                    continue
                out = os.path.join(OUT_DIR, f'voice_{lang}_{cue}.wav')
                write_wav(out, finish(sig, sr, cue))
                made += 1
                print(f'voice_{lang}_{cue}.wav'.ljust(24)
                      + f'{os.path.getsize(out)//1024:>4}KB  "{text}"')

    if made:
        print(f'\n{made}개 생성 완료 → assets/sounds/')
        print('앱에 연결하려면 utils/audioService.ts의 DUEL_VOICE_NAMES를 언어별로 갈라야 합니다.')
    else:
        sys.exit('생성된 파일이 없습니다.')


if __name__ == '__main__':
    main()
