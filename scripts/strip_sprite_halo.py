#!/usr/bin/env python3
"""스프라이트 머리 주변의 반투명 회색 후광만 지운다. 발밑 먼지·본체는 남긴다."""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "assets" / "sprites"


def dilate(mask: np.ndarray, radius: int) -> np.ndarray:
    if radius <= 0:
        return mask
    h, w = mask.shape
    out = mask.copy()
    ys, xs = np.where(mask)
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            if dx * dx + dy * dy > radius * radius:
                continue
            yy = ys + dy
            xx = xs + dx
            ok = (yy >= 0) & (yy < h) & (xx >= 0) & (xx < w)
            out[yy[ok], xx[ok]] = True
    return out


def strip_halo(path: Path) -> int:
    im = Image.open(path).convert("RGBA")
    a = np.array(im)
    h, w = a.shape[:2]
    rgb = a[:, :, :3].astype(np.int16)
    alpha = a[:, :, 3].astype(np.int16)

    core = alpha >= 180
    near_core = dilate(core, 1)
    protect = near_core.copy()

    # 발밑 접지 먼지·그림자
    protect[int(h * 0.82) :, :] = True

    # 유령 불꽃 등 채도 있는 반투명은 후광이 아님
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    protect |= (chroma > 40) & (alpha > 18)

    mean = rgb.mean(axis=2)
    gray = chroma < 40
    # 검정에 알파만 있는 픽셀도 배경 위에선 회색 후광으로 보인다
    halo = (~protect) & (alpha > 0) & gray
    faint = (~protect) & (alpha > 0) & (alpha < 90)

    drop = halo | faint

    # 모자 바로 위 검정+알파 잔광 — 본체 AA가 아니라 후광
    soot = (
        (np.arange(h)[:, None] < int(h * 0.78))
        & (alpha > 0)
        & (alpha < 140)
        & (chroma < 22)
        & (rgb.mean(axis=2) < 20)
    )
    drop |= soot
    n = int(drop.sum())
    if n == 0:
        return 0
    a[drop, 3] = 0
    a[drop, :3] = 0
    Image.fromarray(a).save(path)
    return n


def main() -> None:
    files = sorted(ROOT.glob("**/*.png"))
    total = 0
    changed = 0
    for p in files:
        n = strip_halo(p)
        if n:
            changed += 1
            total += n
            print(f"{p.relative_to(ROOT)}  -{n}")
    print(f"done files={changed}/{len(files)} pixels={total}")


if __name__ == "__main__":
    main()
