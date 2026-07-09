#!/usr/bin/env python3
"""
플레이어 캐릭터(1~4) 포즈별 후보 생성 → output/player_candidates/pXX/.
NPC 파이프라인과 같은 마젠타 프롬프트 구조. 육안 검수 후 install_player_final.py 로 설치.

포즈: idle / aim / shoot / defeat(피격 휘청) / dead(완전히 죽어 누움)

  .venv/bin/python scripts/gen_player_candidates.py --char 2 --count 3
  .venv/bin/python scripts/gen_player_candidates.py --char 2 --poses aim shoot --count 5
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.generate_duel_animation import pollinations_image  # noqa: E402

OUT_BASE = ROOT / "output" / "player_candidates"

CHAR_DESCS: dict[int, str] = {
    1: (
        "handsome young hero gunslinger protagonist, weathered dark brown leather "
        "duster coat, chocolate brown cowboy hat with bronze band, cream shirt with "
        "dark red neckerchief, ornate leather gun belt with silver star buckle, "
        "dark blue jeans, brown leather boots, polished silver revolver"
    ),
    2: (
        "iron sheriff lawman gunslinger, heavy polished STEEL GRAY silver metal "
        "pauldron armor on both shoulders with gold trim, cool silver metallic "
        "tones, shining gold sheriff star badge on chest, long slate gray duster "
        "coat, dark charcoal hat, black gloves, dark pants, brown leather boots, "
        "ornate silver revolver, armor is silver gray steel NOT purple NOT "
        "magenta NOT pink"
    ),
    3: (
        "beautiful female gunslinger, long flowing wavy crimson red hair, "
        "red cowboy hat with white feather, elegant crimson red long coat with "
        "gold embroidery trim, white blouse with brown corset vest, "
        "dark brown pants, red leather boots, twin silver revolvers on belt"
    ),
    4: (
        "supernatural phantom gunslinger, dark purple hooded cloak covering face, "
        "two glowing cyan eyes inside pitch black hood shadow, wisps of cyan "
        "ghost flame around shoulders and hands, tattered black coat, "
        "black pants and boots, ghostly silver revolver"
    ),
}

# 캐릭터별 크로마 배경 — 의상색과 겹치면(예: 2번 회색 강판 ↔ 마젠타 물듦) 교체
BG_COLORS: dict[int, str] = {
    2: "bright pure green #00FF00",
    4: "bright pure green #00FF00",  # 보라 망토가 마젠타 배경에 묻힘
}
DEFAULT_BG = "bright magenta #FF00FF"


def chroma_suffix(char: int) -> str:
    bg = BG_COLORS.get(char, DEFAULT_BG)
    return (
        f"solid flat {bg} background only, no floor shadow, no text, "
        "no border, crisp detailed pixel art SNES western duel game sprite, "
        "rich pixel shading, full body centered, single character only, "
        "one gunslinger, NO duo, NO multiple people"
    )

FULL_BODY_GUARD = (
    "full body head to boots entirely visible, boot soles visible, "
    "NOT portrait, NOT bust, NOT face closeup, character occupying only 55-65% "
    "of frame height, wide magenta margins on all sides, NOT zoomed in"
)

POSE_PROMPTS = {
    "idle": (
        f"{FULL_BODY_GUARD}, READY idle duel pose standing three-quarter view "
        "facing RIGHT, right hand resting on holstered revolver, left hand at side"
    ),
    "aim": (
        f"{FULL_BODY_GUARD}, side profile duel AIM stance: right arm raised "
        "straight and fully extended horizontally to the RIGHT at shoulder height, "
        "holding revolver level aimed RIGHT, sharp eyes along the barrel, "
        "legs in wide gunfight stance, arm extended NOT at side"
    ),
    "shoot": (
        f"{FULL_BODY_GUARD}, side profile FIRING pose: right arm fully extended "
        "to the RIGHT shooting revolver, huge bright orange yellow MUZZLE FLASH "
        "burst at the barrel tip, recoil, coat tails swinging, "
        "dynamic action NOT neutral standing"
    ),
    "defeat": (
        f"{FULL_BODY_GUARD}, SHOT IN THE CHEST hit reaction, body arched reeling "
        "backward, arms flailing outward, hat flying off, grimacing, "
        "knees buckling, dramatic knockback, NOT standing straight"
    ),
    "dead": (
        "pixel art side-scroller death sprite of a defeated gunslinger lying on "
        "the ground, knocked out flat on his back, completely horizontal "
        "silhouette, head on the LEFT, boots on the RIGHT, limbs limp on the "
        "floor, hat off, eyes closed, single character"
    ),
}

SIZES = {
    "idle": (512, 704),
    "aim": (704, 704),
    "shoot": (704, 704),
    "defeat": (640, 704),
    "dead": (896, 448),
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--char", type=int, required=True, choices=(1, 2, 3, 4))
    parser.add_argument("--poses", nargs="*", default=list(POSE_PROMPTS))
    parser.add_argument("--count", type=int, default=3)
    parser.add_argument("--seed", type=int, default=4100)
    args = parser.parse_args()

    desc = CHAR_DESCS[args.char]
    out_dir = OUT_BASE / f"p{args.char:02d}"
    out_dir.mkdir(parents=True, exist_ok=True)

    suffix = chroma_suffix(args.char)
    bg = BG_COLORS.get(args.char, DEFAULT_BG)
    for pose in args.poses:
        w, h = SIZES[pose]
        for k in range(args.count):
            seed = args.seed + args.char * 991 + k * 37 + hash(pose) % 100
            pose_prompt = POSE_PROMPTS[pose]
            if pose == "dead":
                prompt = f"{pose_prompt}, {desc}, solid flat {bg} background, no text"
            else:
                prompt = f"{suffix}, {desc}, {pose_prompt}"
            path = out_dir / f"{pose}_{k}.png"
            try:
                img = pollinations_image(prompt, w, h, seed=seed)
                img.save(path)
                print(f"→ {path.relative_to(ROOT)}")
            except Exception as exc:
                print(f"✗ p{args.char:02d} {pose}_{k}: {exc}")
            time.sleep(4)


if __name__ == "__main__":
    main()
