#!/usr/bin/env python3
"""
duel_sprite_library 래퍼 — idle 기준 aim/shoot 일괄 동기화.

  .venv/bin/python scripts/sync_duel_poses_from_idle.py
  .venv/bin/python scripts/sync_duel_poses_from_idle.py npc_03
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

SKIP_CHAR_IDS = {"npc_01", "player_01"}


def char_id_from_idle(idle_path: Path) -> str | None:
    name = idle_path.stem
    if name.startswith("npc_") and name.endswith("_idle"):
        return f"npc_{name.split('_')[1]}"
    if name.startswith("player_") and name.endswith("_idle"):
        return f"player_{name.split('_')[1]}"
    return None


def sync_one(char_id: str) -> bool:
    if char_id in SKIP_CHAR_IDS:
        print(f"  [skip] reference {char_id}")
        return False

    from scripts.duel_sprite_library import export_character

    return export_character(char_id, skip_reference=True)


def discover_char_ids() -> list[str]:
    ids: list[str] = []
    for p in sorted((ROOT / "assets" / "sprites" / "player").glob("player_*_idle.png")):
        cid = char_id_from_idle(p)
        if cid:
            ids.append(cid)
    for p in sorted((ROOT / "assets" / "sprites" / "npc").glob("npc_*_idle.png")):
        cid = char_id_from_idle(p)
        if cid:
            ids.append(cid)
    return ids


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("targets", nargs="*", help="npc_03 player_01 (비우면 전체)")
    args = parser.parse_args()

    targets = args.targets or discover_char_ids()
    ok = sum(1 for t in targets if sync_one(t))
    print(f"\n완료: {ok}/{len(targets)}")


if __name__ == "__main__":
    main()
