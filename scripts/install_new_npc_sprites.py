"""신규 enemy 디자인(assets/images/characters/enemy)을 게임 스프라이트 규격으로 설치.

- 구버전 assets/sprites/npc/npc_XX_*.png 전부 삭제 후 신규로 교체
- npc_XX_idle/aim/shoot/defeat = 신규 AI 포즈 그대로
- npc_XX_shoot_00 = shoot(발사 순간)
- npc_XX_shoot_01 = shoot 기반 반동 프레임(위로 5px 점프 + 1.02 스케일)

사용법: .venv-tools/bin/python scripts/install_new_npc_sprites.py
"""

from pathlib import Path

from PIL import Image

ENEMY_DIR = Path("assets/images/characters/enemy")
HIDDEN_DIR = Path("assets/images/hidden")
NPC_DIR = Path("assets/sprites/npc")
SIZE = 256

NAMES = {
    1: "dust_wind",
    2: "rusty_muzzle",
    3: "wasteland_crow",
    4: "desert_fox",
    5: "iron_mask",
    6: "rachel",
    7: "cactus_sting",
    8: "lorenzo",
    9: "golden_skull",
    10: "steel_eagle",
    11: "silent_locomotive",
    12: "black_iron",
    13: "mirror_jack",
    14: "thunderbolt",
    15: "shadow_hunter",
    16: "venom_spike",
    17: "dryden",
    18: "red_eye_oracle",
    19: "void_walker",
    20: "echo_phantom",
    21: "undertaker",
    22: "pale_rider",
}


def src_path(npc_id: int, suffix: str) -> Path:
    base = HIDDEN_DIR if npc_id == 22 else ENEMY_DIR
    tail = f"_{suffix}" if suffix else ""
    return base / f"enemy_{npc_id:02d}_{NAMES[npc_id]}{tail}.png"


def flip_face_right(img: Image.Image) -> Image.Image:
    """게임 규격: PNG는 오른쪽(→) 조준. AI 생성분은 좌향이라 수평 반전."""
    return img.transpose(Image.FLIP_LEFT_RIGHT)


def recoil_frame(shoot: Image.Image) -> Image.Image:
    """반동 프레임: 살짝 확대 + 위로 5px 점프한 뒤 256 캔버스에 재배치."""
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
    NPC_DIR.mkdir(parents=True, exist_ok=True)
    removed = 0
    for old in NPC_DIR.glob("npc_*.png"):
        old.unlink()
        removed += 1
    print(f"removed {removed} old sprites")

    for npc_id in range(1, 23):
        idle = flip_face_right(Image.open(src_path(npc_id, "")).convert("RGBA"))
        aim = flip_face_right(Image.open(src_path(npc_id, "aim")).convert("RGBA"))
        shoot = flip_face_right(Image.open(src_path(npc_id, "shoot")).convert("RGBA"))
        defeat = flip_face_right(Image.open(src_path(npc_id, "defeat")).convert("RGBA"))

        prefix = f"npc_{npc_id:02d}"
        idle.save(NPC_DIR / f"{prefix}_idle.png")
        aim.save(NPC_DIR / f"{prefix}_aim.png")
        shoot.save(NPC_DIR / f"{prefix}_shoot.png")
        defeat.save(NPC_DIR / f"{prefix}_defeat.png")
        shoot.save(NPC_DIR / f"{prefix}_shoot_00.png")
        recoil_frame(shoot).save(NPC_DIR / f"{prefix}_shoot_01.png")
        print(f"{prefix}: installed 6 poses")

    print("done")


if __name__ == "__main__":
    main()
