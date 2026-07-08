#!/usr/bin/env python3
"""
player_01 포즈별 후보 생성 → output/player_candidates/.
NPC 파이프라인(regenerate_npc_sprites_magenta)과 같은 프롬프트 구조:
마젠타 배경 + 포즈 힌트 + 아웃핏 락. 육안 검수 후 install_player_final.py 로 설치.

포즈: idle / aim / shoot / defeat(피격 휘청) / dead(완전히 죽어 누움)

  .venv/bin/python scripts/gen_player_candidates.py idle aim shoot defeat dead --count 3
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.generate_duel_animation import pollinations_image  # noqa: E402

OUT = ROOT / "output" / "player_candidates"

HERO_DESC = (
    "handsome young hero gunslinger protagonist, weathered dark brown leather "
    "duster coat, chocolate brown cowboy hat with bronze band, cream shirt with "
    "dark red neckerchief, ornate leather gun belt with silver star buckle, "
    "dark blue jeans, brown leather boots, polished silver revolver"
)

OUTFIT_LOCK = (
    "EXACT same character in every image, identical outfit colors and accessories"
)

MAGENTA_SUFFIX = (
    "solid flat bright magenta #FF00FF background only, no floor shadow, no text, "
    "no border, crisp detailed pixel art SNES western duel game sprite, "
    "rich pixel shading, full body centered, single character only, one gunslinger, "
    "NO duo, NO multiple people"
)

FULL_BODY_GUARD = (
    "full body head to boots entirely visible, boot soles visible, "
    "NOT portrait, NOT bust, NOT face closeup, character occupying only 55-65% "
    "of frame height, wide magenta margins on all sides, NOT zoomed in"
)

POSE_PROMPTS = {
    "idle": (
        f"{FULL_BODY_GUARD}, READY idle duel pose standing three-quarter view "
        "facing RIGHT, right hand resting on holstered silver revolver, "
        "left hand at side"
    ),
    "aim": (
        f"{FULL_BODY_GUARD}, STEADY aim pose facing RIGHT, both hands gripping "
        "silver revolver aimed diagonally upper-RIGHT toward opponent"
    ),
    "shoot": (
        f"{FULL_BODY_GUARD}, BANG shoot pose facing RIGHT, right arm extended "
        "firing silver revolver diagonally upper-RIGHT with bright orange yellow "
        "muzzle flash at barrel"
    ),
    "defeat": (
        f"{FULL_BODY_GUARD}, SHOT IN THE CHEST hit reaction, body arched reeling "
        "backward, arms flailing outward, hat flying off his head, grimacing, "
        "knees buckling, dramatic knockback, NOT standing straight"
    ),
    "dead": (
        "DEAD BODY lying completely FLAT on his back on the ground, "
        "corpse viewed from the side, body fully HORIZONTAL across the image, "
        "head on the LEFT, boots on the RIGHT, arms sprawled limp, "
        "eyes closed, hat fallen off next to him, motionless, "
        "entire horizontal body visible with magenta margins above and below"
    ),
}

SIZES = {
    "idle": (512, 704),
    "aim": (576, 704),
    "shoot": (640, 704),
    "defeat": (640, 704),
    "dead": (896, 512),
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("poses", nargs="*", default=list(POSE_PROMPTS))
    parser.add_argument("--count", type=int, default=3)
    parser.add_argument("--seed", type=int, default=1200)
    args = parser.parse_args()
    poses = args.poses or list(POSE_PROMPTS)

    OUT.mkdir(parents=True, exist_ok=True)
    for pose in poses:
        w, h = SIZES[pose]
        for k in range(args.count):
            seed = args.seed + k * 37 + hash(pose) % 100
            prompt = (
                f"{MAGENTA_SUFFIX}, {HERO_DESC}, {OUTFIT_LOCK}, {POSE_PROMPTS[pose]}"
            )
            path = OUT / f"{pose}_{k}.png"
            try:
                img = pollinations_image(prompt, w, h, seed=seed)
                img.save(path)
                print(f"→ {path.relative_to(ROOT)}")
            except Exception as exc:
                print(f"✗ {pose}_{k}: {exc}")
            time.sleep(4)


if __name__ == "__main__":
    main()
