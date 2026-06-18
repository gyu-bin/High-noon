#!/usr/bin/env python3
"""기존 SVG 캐릭터를 Expo용 PNG 스프라이트(idle)로 내보냅니다."""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CHAR_DIR = ROOT / "assets" / "images" / "characters"
OUT_NPC = ROOT / "assets" / "sprites" / "npc"
OUT_PLAYER = ROOT / "assets" / "sprites" / "player"
SIZE = 128

NPC_SVG_BY_ID: dict[int, str] = {
    1: "npc_01_clay.svg",
    2: "npc_02_doug.svg",
    3: "npc_03_betty.svg",
    4: "npc_04_billy.svg",
    5: "npc_05_sam.svg",
    6: "npc_06_rosa.svg",
    7: "npc_07_jack.svg",
    8: "npc_08_colt.svg",
    9: "npc_09_rider_boss.svg",
    10: "npc_10_eagle.svg",
    11: "npc_11_daisy.svg",
    12: "npc_12_sybil_boss.svg",
    13: "npc_13_seth.svg",
    14: "npc_14_doc.svg",
    15: "npc_15_lace_boss.svg",
    16: "npc_16_angel.svg",
    17: "npc_17_dryden_boss.svg",
    18: "npc_18_unknown.svg",
    19: "npc_19_unknown.svg",
    20: "npc_20_whiteman_finalboss.svg",
    21: "npc_20_whiteman_finalboss.svg",
    22: "npc_18_unknown.svg",
}


def svg_to_png(svg_path: Path, out_path: Path) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        subprocess.run(
            ["qlmanage", "-t", "-s", "512", "-o", str(tmp_dir), str(svg_path)],
            check=True,
            capture_output=True,
        )
        thumb = tmp_dir / f"{svg_path.name}.png"
        img = Image.open(thumb).convert("RGBA")
        img = img.resize((SIZE, SIZE), Image.NEAREST)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(out_path, "PNG")
        print(f"  {out_path.relative_to(ROOT)}")


def main() -> None:
    print("SVG → PNG 스프라이트 내보내기")
    for npc_id, svg_name in NPC_SVG_BY_ID.items():
        svg_path = CHAR_DIR / svg_name
        if not svg_path.exists():
            print(f"[건너뜀] {svg_path}")
            continue
        out = OUT_NPC / f"npc_{npc_id:02d}_idle.png"
        svg_to_png(svg_path, out)

    player_svg = CHAR_DIR / "player.svg"
    if player_svg.exists():
        for pid in range(1, 5):
            out = OUT_PLAYER / f"player_{pid:02d}_idle.png"
            svg_to_png(player_svg, out)

    print("완료")


if __name__ == "__main__":
    main()
