"""신규 플레이어 캐릭터 디자인(마젠타 배경 AI 생성분)을 게임 스프라이트 규격으로 설치.

- 구버전 assets/sprites/player/player_XX_*.png 전부 삭제 후 신규로 교체
- player_XX_idle/aim/shoot/defeat = 신규 AI 포즈 (이미 우향 조준이라 반전 없음)
- player_XX_shoot_00 = shoot / player_XX_shoot_01 = shoot 기반 반동 프레임
- down 프레임은 scripts/make_down_sprites.py 로 별도 베이크

사용법: .venv-tools/bin/python scripts/install_new_player_sprites.py <raw_dir>
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image

PLAYER_DIR = Path("assets/sprites/player")
SIZE = 256

NAMES = {
    1: "nameless",
    2: "iron_sheriff",
    3: "red_rosa",
    4: "phantom",
}
POSES = ["idle", "aim", "shoot", "defeat"]


def key_magenta(img: Image.Image) -> Image.Image:
    a = np.array(img.convert("RGBA"), dtype=np.int16)
    r, g, b, alpha = a[..., 0], a[..., 1], a[..., 2], a[..., 3]

    hard = (r - g > 110) & (b - g > 110) & (r > 140) & (b > 140)
    alpha[hard] = 0

    soft = (r - g > 55) & (b - g > 55) & (r > 110)
    for _ in range(3):
        transparent = alpha == 0
        near = np.zeros_like(transparent)
        near[1:, :] |= transparent[:-1, :]
        near[:-1, :] |= transparent[1:, :]
        near[:, 1:] |= transparent[:, :-1]
        near[:, :-1] |= transparent[:, 1:]
        fringe = soft & near & (alpha > 0)
        if not fringe.any():
            break
        alpha[fringe] = 0

    a[..., 3] = alpha
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def trim_alpha(img: Image.Image, pad: int = 6) -> Image.Image:
    bbox = img.getbbox()
    if bbox is None:
        return img
    x0, y0, x1, y1 = bbox
    return img.crop((
        max(0, x0 - pad), max(0, y0 - pad),
        min(img.width, x1 + pad), min(img.height, y1 + pad),
    ))


def to_square(img: Image.Image, size: int) -> Image.Image:
    side = max(img.width, img.height)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
    return canvas.resize((size, size), Image.LANCZOS)


def recoil_frame(shoot: Image.Image) -> Image.Image:
    scale = 1.02
    lift = 5
    w = round(shoot.width * scale)
    h = round(shoot.height * scale)
    scaled = shoot.resize((w, h), Image.LANCZOS)
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    x = (SIZE - w) // 2
    y = (SIZE - h) // 2 - lift
    canvas.alpha_composite(scaled, (max(x, -w), y))
    return canvas


def main() -> None:
    raw_dir = Path(sys.argv[1])
    PLAYER_DIR.mkdir(parents=True, exist_ok=True)

    removed = 0
    for old in PLAYER_DIR.glob("player_*.png"):
        old.unlink()
        removed += 1
    print(f"removed {removed} old sprites")

    for pid, name in NAMES.items():
        for pose in POSES:
            src = raw_dir / f"player_{pid:02d}_{name}_{pose}.png"
            img = Image.open(src).convert("RGBA")
            img = to_square(trim_alpha(key_magenta(img)), SIZE)
            img.save(PLAYER_DIR / f"player_{pid:02d}_{pose}.png")
            if pose == "shoot":
                img.save(PLAYER_DIR / f"player_{pid:02d}_shoot_00.png")
                recoil_frame(img).save(PLAYER_DIR / f"player_{pid:02d}_shoot_01.png")
        print(f"player_{pid:02d} ({name}): installed 6 poses")

    print("done")


if __name__ == "__main__":
    main()
