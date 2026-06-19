#!/usr/bin/env python3
"""
npc_01·02 기준 — 마젠타 배경 Pollinations → flood chroma → idle/aim/shoot/defeat.

  .venv/bin/python scripts/regenerate_npc_sprites_magenta.py npc_03
  .venv/bin/python scripts/regenerate_npc_sprites_magenta.py npc_03 npc_04 --regen-ts
  .venv/bin/python scripts/regenerate_npc_sprites_magenta.py --from 3 --to 22 --regen-ts
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from highnoon_sprite_generator import (  # noqa: E402
    NPC_DATA,
    _magenta_fraction_at_edges,
    fit_center_sprite,
    remove_sprite_background,
    trim_alpha,
    SPRITE_SIZE,
)
from scripts.generate_duel_animation import (  # noqa: E402
    char_paths,
    content_bbox_metrics,
    defeat_prompt,
    pollinations_image,
    regenerate_sprite_assets_ts,
    short_duel_prompt,
)

SKIP_IDS = {1, 2}
MAGENTA_SUFFIX = (
    "solid flat bright magenta #FF00FF background only, no floor shadow, no text, "
    "no border, crisp pixel art SNES western duel game sprite, full body centered, "
    "single character only, one gunslinger, NO duo, NO multiple people"
)
FULL_BODY_GUARD = (
    "full body head to boots entirely visible, NOT portrait, NOT bust, NOT face closeup, "
    "character SMALL occupying only 50-58% of frame height, wide magenta margins on all sides, "
    "NOT zoomed in, NOT filling the frame"
)
POSE_HINTS = {
    "idle": (
        f"{FULL_BODY_GUARD}, READY idle pose standing three-quarter view facing RIGHT, "
        "right hand resting on holstered silver revolver, left hand at side"
    ),
    "aim": (
        f"{FULL_BODY_GUARD}, STEADY aim pose facing RIGHT, both hands gripping silver revolver "
        "aimed diagonally upper-RIGHT toward opponent"
    ),
    "shoot": (
        f"{FULL_BODY_GUARD}, BANG shoot pose facing RIGHT, right arm extended firing silver revolver "
        "diagonally upper-RIGHT with bright orange yellow muzzle flash at barrel"
    ),
}


def mass_center_x(img: Image.Image, ymin_ratio: float, ymax_ratio: float) -> float:
    import numpy as np

    a = np.array(img.convert("RGBA"))
    m = a[:, :, 3] > 40
    ys, xs = np.where(m)
    if len(xs) == 0:
        return img.width / 2
    y0, y1 = ys.min(), ys.max()
    lo = y0 + int((y1 - y0) * ymin_ratio)
    hi = y0 + int((y1 - y0) * ymax_ratio)
    band = m[lo:hi, :]
    col = band.sum(axis=0).astype(float)
    if col.sum() == 0:
        return float((xs.min() + xs.max()) / 2)
    return float((col * np.arange(img.width)).sum() / col.sum())


def bbox_center_x(img: Image.Image) -> float:
    import numpy as np

    a = np.array(img.convert("RGBA"))
    ys, xs = np.where(a[:, :, 3] > 40)
    if len(xs) == 0:
        return img.width / 2
    return float((xs.min() + xs.max()) / 2)


def png_faces_right(img: Image.Image) -> bool:
    """먼지바람·녹슨총구 기준 — PNG에서 캐릭터가 오른쪽(→) 조준."""
    import numpy as np

    a = np.array(img.convert("RGBA"))
    m = a[:, :, 3] > 40
    ys, xs = np.where(m)
    if len(xs) == 0:
        return True
    y0 = int(ys.min())
    bh = int(ys.max() - ys.min())
    y1 = y0 + int(bh * 0.5)
    band = m[y0:y1, :]
    top_band = band[: max(1, int(band.shape[0] * 0.45)), :]
    cols = np.where(top_band.sum(axis=0) > 0)[0]
    if len(cols) == 0:
        return True
    cx = (xs.min() + xs.max()) / 2
    left_extent = float(cx - cols[0])
    right_extent = float(cols[-1] - cx)
    return right_extent >= left_extent


def ensure_png_faces_right(img: Image.Image) -> Image.Image:
    """결투 PNG는 오른쪽(→) 조준 — NPC scaleX 반전 후 플레이어 방향."""
    out = fit_center_sprite(img.convert("RGBA"), SPRITE_SIZE)
    if png_faces_right(out):
        return out
    return fit_center_sprite(ImageOps.mirror(out), SPRITE_SIZE)


def mirror_if_faces_left(img: Image.Image) -> Image.Image:
    """이미 센터된 PNG — 방향만 맞춤 (재센터 없음)."""
    out = img.convert("RGBA")
    if png_faces_right(out):
        return out
    return ImageOps.mirror(out)


def align_aim_with_idle(idle: Image.Image, aim: Image.Image) -> Image.Image:
    """STEADY/BANG을 READY와 같이 PNG 오른쪽(→) 조준으로."""
    del idle
    return ensure_png_faces_right(aim)


def is_valid_full_body(img: Image.Image) -> bool:
    _cy, w, h = content_bbox_metrics(img)
    return h >= 0.52 and w <= 0.85


def interior_hole_count(img: Image.Image) -> int:
    import numpy as np

    a = np.array(img.convert("RGBA"))
    m = a[:, :, 3] > 32
    h, w = a.shape[:2]
    holes = 0
    for y in range(8, h - 8):
        for x in range(8, w - 8):
            if not m[y, x] and m[y - 1 : y + 2, x - 1 : x + 2].sum() >= 5:
                holes += 1
    return holes


def is_valid_sprite(img: Image.Image, *, defeat: bool = False) -> bool:
    _cy, w, h = content_bbox_metrics(img)
    if defeat:
        if w > 0.95:
            return False
        if h < 0.35 and w < 0.55:
            return False
    elif h < 0.50 or w > 0.92:
        return False
    limit = 200 if defeat else 120
    return interior_hole_count(img) < limit


def normalize_sprite_bbox(
    img: Image.Image,
    *,
    max_w: float,
    max_h: float = 0.90,
    size: int = SPRITE_SIZE,
) -> Image.Image:
    """npc_01~03 크기 — Pollinations 확대본 축소."""
    from scripts.generate_duel_animation import content_bbox_metrics

    fitted = fit_center_sprite(img.convert("RGBA"), size)
    _cy, w, h = content_bbox_metrics(fitted)
    if w <= max_w and h <= max_h:
        return fitted
    scale = min(
        max_w / w if w > max_w else 1.0,
        max_h / h if h > max_h else 1.0,
    )
    trimmed = trim_alpha(img.convert("RGBA"))
    if trimmed.width == 0 or trimmed.height == 0:
        return fitted
    nw = max(1, int(trimmed.width * scale))
    nh = max(1, int(trimmed.height * scale))
    scaled = trimmed.resize((nw, nh), Image.LANCZOS)
    return fit_center_sprite(scaled, size)


def process_raw_frame(
    img: Image.Image,
    *,
    defeat: bool = False,
    pose: str = "idle",
) -> Image.Image:
    out = fit_center_sprite(remove_sprite_background(img), SPRITE_SIZE)
    limits = {
        "idle": (0.56, 0.90),
        "aim": (0.74, 0.90),
        "shoot": (0.88, 0.90),
        "defeat": (0.95, 0.78),
    }
    max_w, max_h = limits.get(pose, limits["idle"])
    if defeat:
        max_w, max_h = limits["defeat"]
    out = normalize_sprite_bbox(out, max_w=max_w, max_h=max_h)
    holes = interior_hole_count(out)
    if not is_valid_sprite(out, defeat=defeat):
        bg = "magenta" if _magenta_fraction_at_edges(img) >= 0.3 else "solid"
        raise ValueError(f"bad sprite ({bg} bg, holes={holes})")
    return out


def process_frame(img: Image.Image, *, aim_pose: bool = False) -> Image.Image:
    del aim_pose
    return process_raw_frame(img)


def _pose_from_hint(hint: str) -> str:
    if hint == POSE_HINTS["aim"]:
        return "aim"
    if hint == POSE_HINTS["shoot"]:
        return "shoot"
    return "idle"


def gen_frame(char_id: str, hint: str, seed: int, *, idle_ref: Image.Image | None = None) -> Image.Image:
    prompt = f"{short_duel_prompt(char_id, hint)}, {MAGENTA_SUFFIX}"
    pose = _pose_from_hint(hint)
    best: Image.Image | None = None
    for attempt in range(6):
        try:
            raw = pollinations_image(prompt, SPRITE_SIZE, SPRITE_SIZE, seed=seed + attempt * 23)
            out = process_raw_frame(raw, pose=pose)
            if idle_ref is None or hint == POSE_HINTS["idle"]:
                return out
            from scripts.generate_duel_animation import is_valid_shoot_pose

            if is_valid_shoot_pose(out, idle_ref):
                if attempt:
                    print(f"      ✓ {hint} 포즈 {attempt + 1}회차")
                return out
            best = out
        except Exception as exc:
            print(f"      ↻ {hint} 재시도 ({attempt + 1}/6): {exc}")
            time.sleep(5)
    if best is not None:
        return best
    raise RuntimeError(f"{hint} 생성 실패")


def gen_defeat(char_id: str, seed: int, idle_ref: Image.Image) -> Image.Image:
    from scripts.generate_duel_animation import is_valid_defeat_pose, procedural_defeat_from_idle

    defeat_prompt_text = defeat_prompt(char_id) + f", {MAGENTA_SUFFIX}"
    for attempt in range(8):
        try:
            defeat_raw = pollinations_image(
                defeat_prompt_text,
                int(SPRITE_SIZE * 1.5),
                SPRITE_SIZE,
                seed=seed + attempt * 19,
            )
            defeat = process_raw_frame(defeat_raw, defeat=True)
            if is_valid_defeat_pose(defeat, idle_ref):
                if attempt:
                    print(f"      ✓ defeat 포즈 {attempt + 1}회차")
                return defeat
        except Exception as exc:
            print(f"      ↻ defeat 재시도 ({attempt + 1}/8): {exc}")
            time.sleep(5)

    print("      ↻ defeat API 실패 — idle 기반 누운 포즈 폴백")
    nid = int(char_id.split("_")[1]) if char_id.startswith("npc_") else 99
    if nid <= 4:
        raise RuntimeError(
            f"{char_id} defeat — Pollinations 실패. GenerateImage raw → install_npc_raw_sprites.py 사용"
        )
    fallback = procedural_defeat_from_idle(idle_ref, SPRITE_SIZE)
    if is_valid_defeat_pose(fallback, idle_ref):
        return fallback
    raise RuntimeError("defeat 생성 실패")


def audit_poses(char_id: str) -> list[str]:
    """품질·방향 검사 후 재생성이 필요한 포즈 이름."""
    from scripts.generate_duel_animation import is_valid_defeat_pose

    idle_path, assets_dir, prefix = char_paths(char_id)
    bad: list[str] = []
    idle_ref = Image.open(idle_path).convert("RGBA") if idle_path.exists() else None
    for pose in ("idle", "aim", "shoot", "defeat"):
        path = assets_dir / f"{prefix}_{pose}.png"
        if not path.exists():
            bad.append(pose)
            continue
        img = Image.open(path).convert("RGBA")
        defeat = pose == "defeat"
        if not is_valid_sprite(img, defeat=defeat):
            bad.append(pose)
        elif defeat and idle_ref is not None and not is_valid_defeat_pose(img, idle_ref):
            bad.append(pose)
        elif pose in ("idle", "aim", "shoot") and not png_faces_right(img):
            bad.append(pose)
    return bad


def align_duel_poses(char_id: str) -> int:
    """aim/shoot 방향 정렬 — idle 기준 PNG 오른쪽(→) 조준."""
    idle_path, assets_dir, prefix = char_paths(char_id)
    if not idle_path.exists():
        return 0
    idle = Image.open(idle_path).convert("RGBA")
    fixed = 0
    for name in ("aim.png", "shoot.png", "shoot_00.png", "shoot_01.png"):
        pose_path = assets_dir / f"{prefix}_{name}"
        if not pose_path.exists():
            continue
        before = Image.open(pose_path).convert("RGBA")
        aligned = mirror_if_faces_left(before)
        if aligned.tobytes() != before.tobytes():
            aligned.save(pose_path, "PNG")
            fixed += 1
    return fixed


def despeckle_alpha(img: Image.Image) -> Image.Image:
    """회전·리사이즈로 생긴 내부 투명 구멍 제거."""
    from PIL import ImageFilter

    r, g, b, a = img.split()
    a = a.filter(ImageFilter.MaxFilter(3))
    return Image.merge("RGBA", (r, g, b, a))


def procedural_pose(idle: Image.Image, pose: str) -> Image.Image:
    """idle 기반 aim/shoot/defeat — API 없이 품질 안정."""
    from scripts.duel_sprite_library import POSE_SPECS, render_pose

    if pose == "shoot":
        spec = POSE_SPECS["shoot"]
    elif pose == "aim":
        spec = POSE_SPECS["aim"]
    elif pose == "defeat":
        spec = POSE_SPECS["defeat"]
    else:
        raise ValueError(pose)
    out = render_pose(idle, spec)
    if pose in ("aim", "shoot"):
        out = mirror_if_faces_left(out)
    return despeckle_alpha(out)


def repair_character(char_id: str, seed: int, *, regen_idle: bool = False) -> int:
    """깨진 포즈만 선택 재생성 + 방향 정렬."""
    bad_poses = audit_poses(char_id)
    if not bad_poses:
        return 0

    idle_path, assets_dir, prefix = char_paths(char_id)
    print(f"  수리: {', '.join(bad_poses)}")
    fixed = 0

    # idle API는 rate limit — aim/shoot/defeat 먼저, idle은 regen_idle 시에만
    pose_order = [p for p in ("aim", "shoot", "defeat") if p in bad_poses]
    if "idle" in bad_poses and regen_idle:
        pose_order.insert(0, "idle")

    if "idle" in bad_poses and not regen_idle:
        print("      (idle 유지 — API 생성은 --regen-idle)")

    if "idle" in pose_order:
        try:
            idle = gen_frame(char_id, POSE_HINTS["idle"], seed)
            idle = ensure_png_faces_right(idle)
            idle.save(idle_path, "PNG")
            fixed += 1
            time.sleep(4)
        except Exception as exc:
            print(f"      ⚠ idle Pollinations 실패 — 기존 유지 ({exc})")
            if not idle_path.exists():
                raise

    idle_ref = fit_center_sprite(Image.open(idle_path).convert("RGBA"), SPRITE_SIZE)

    if "aim" in bad_poses:
        aim = gen_frame(char_id, POSE_HINTS["aim"], seed + 11, idle_ref=idle_ref)
        aim = align_aim_with_idle(idle_ref, aim)
        aim.save(assets_dir / f"{prefix}_aim.png", "PNG")
        fixed += 1
        time.sleep(4)

    if "shoot" in bad_poses:
        shoot = gen_frame(char_id, POSE_HINTS["shoot"], seed + 22, idle_ref=idle_ref)
        shoot = align_aim_with_idle(idle_ref, shoot)
        for name in (f"{prefix}_shoot.png", f"{prefix}_shoot_00.png", f"{prefix}_shoot_01.png"):
            shoot.save(assets_dir / name, "PNG")
        fixed += 1
        time.sleep(4)

    if "defeat" in bad_poses:
        defeat = gen_defeat(char_id, seed + 40, idle_ref)
        defeat.save(assets_dir / f"{prefix}_defeat.png", "PNG")
        fixed += 1

    fixed += align_duel_poses(char_id)
    if idle_path.exists() and not png_faces_right(Image.open(idle_path)):
        idle = ensure_png_faces_right(Image.open(idle_path).convert("RGBA"))
        idle.save(idle_path, "PNG")
        fixed += 1
    return fixed


def export_character(
    char_id: str,
    seed: int,
    *,
    keep_idle: bool = False,
    poses_only: str | None = None,
) -> bool:
    idle_path, assets_dir, prefix = char_paths(char_id)
    print(f"\n[{char_id}] 마젠타 스프라이트 생성")

    if keep_idle and idle_path.exists():
        idle = Image.open(idle_path).convert("RGBA")
        print(f"  (idle 유지) {idle_path.relative_to(ROOT)}")
    else:
        idle = gen_frame(char_id, POSE_HINTS["idle"], seed)
        idle = ensure_png_faces_right(idle)
        idle.save(idle_path, "PNG")
        print(f"  → {idle_path.relative_to(ROOT)}")
        time.sleep(4)

    idle_ref = fit_center_sprite(idle, SPRITE_SIZE)
    do_aim = poses_only in (None, "aim", "duel")
    do_shoot = poses_only in (None, "shoot", "duel")
    do_defeat = poses_only in (None, "defeat", "duel")

    if do_aim:
        aim = gen_frame(char_id, POSE_HINTS["aim"], seed + 11, idle_ref=idle_ref)
        aim = align_aim_with_idle(idle_ref, aim)
        aim.save(assets_dir / f"{prefix}_aim.png", "PNG")
        print(f"  → {prefix}_aim.png")
        time.sleep(4)

    if do_shoot:
        shoot = gen_frame(char_id, POSE_HINTS["shoot"], seed + 22, idle_ref=idle_ref)
        shoot = align_aim_with_idle(idle_ref, shoot)
        for name in (f"{prefix}_shoot.png", f"{prefix}_shoot_00.png", f"{prefix}_shoot_01.png"):
            shoot.save(assets_dir / name, "PNG")
        print(f"  → {prefix}_shoot*.png")
        time.sleep(4)

    if do_defeat:
        defeat = gen_defeat(char_id, seed + 40, idle_ref)
        defeat.save(assets_dir / f"{prefix}_defeat.png", "PNG")
        print(f"  → {prefix}_defeat.png")

    if do_aim and idle_path.exists() and (assets_dir / f"{prefix}_aim.png").exists():
        aim_path = assets_dir / f"{prefix}_aim.png"
        aligned = align_aim_with_idle(Image.open(idle_path), Image.open(aim_path))
        if aligned.tobytes() != Image.open(aim_path).convert("RGBA").tobytes():
            aligned.save(aim_path, "PNG")
            print(f"  → {prefix}_aim.png (방향 정렬)")
        if do_shoot:
            for name in (f"{prefix}_shoot.png", f"{prefix}_shoot_00.png", f"{prefix}_shoot_01.png"):
                shoot_path = assets_dir / name
                if shoot_path.exists():
                    shoot_aligned = align_aim_with_idle(Image.open(idle_path), Image.open(shoot_path))
                    if shoot_aligned.tobytes() != Image.open(shoot_path).convert("RGBA").tobytes():
                        shoot_aligned.save(shoot_path, "PNG")
            print(f"  → {prefix}_shoot*.png (방향 정렬)")
    return True


def npc_ids_from_args(args: argparse.Namespace) -> list[str]:
    if args.from_id is not None:
        lo, hi = args.from_id, args.to_id or args.from_id
        return [f"npc_{i:02d}" for i in range(lo, hi + 1) if i not in SKIP_IDS]
    return [t if t.startswith("npc_") else f"npc_{int(t):02d}" for t in args.targets]


def main() -> None:
    parser = argparse.ArgumentParser(description="NPC 3+ 마젠타 배경 결투 스프라이트 재생성")
    parser.add_argument("targets", nargs="*", help="npc_03 …")
    parser.add_argument("--from", dest="from_id", type=int, help="시작 NPC 번호 (포함)")
    parser.add_argument("--to", dest="to_id", type=int, help="끝 NPC 번호 (포함)")
    parser.add_argument("--regen-ts", action="store_true", help="constants/spriteAssets.ts 갱신")
    parser.add_argument(
        "--keep-idle",
        action="store_true",
        help="기존 idle 유지 (컨셉 시트 추출본 등)",
    )
    parser.add_argument(
        "--poses-only",
        choices=("aim", "shoot", "defeat", "duel"),
        help="지정 포즈만 재생성 (idle 유지). duel=aim+shoot+defeat",
    )
    parser.add_argument(
        "--repair",
        action="store_true",
        help="검사 후 깨진 포즈만 재생성 (idle/aim/shoot/defeat)",
    )
    parser.add_argument(
        "--regen-idle",
        action="store_true",
        help="깨진 idle도 Pollinations로 재생성 (rate limit 주의)",
    )
    parser.add_argument(
        "--align-only",
        action="store_true",
        help="aim/shoot 방향만 정렬 (재생성 없음)",
    )
    args = parser.parse_args()

    ids = npc_ids_from_args(args)
    if not ids:
        ids = [f"npc_{n['id']:02d}" for n in NPC_DATA if n["id"] not in SKIP_IDS]

    if args.align_only:
        aligned = 0
        for char_id in ids:
            nid = int(char_id.split("_")[1])
            if nid in SKIP_IDS:
                continue
            n = align_duel_poses(char_id)
            if n:
                print(f"  {char_id}: {n}개 정렬")
                aligned += n
        print(f"\n방향 정렬: {aligned}개")
        if args.regen_ts and aligned:
            regenerate_sprite_assets_ts()
        return

    ok = 0
    repaired = 0
    for char_id in ids:
        nid = int(char_id.split("_")[1])
        if nid in SKIP_IDS:
            print(f"[skip] {char_id} — 기준 캐릭터")
            continue
        idle_path, _, _ = char_paths(char_id)
        if not idle_path.parent.exists():
            print(f"[skip] {char_id} — assets 없음")
            continue
        try:
            if args.repair:
                bad = audit_poses(char_id)
                if not bad:
                    print(f"[ok] {char_id} — 수리 불필요")
                    align_duel_poses(char_id)
                    continue
                print(f"\n[{char_id}] 수리 ({', '.join(bad)})")
                n = repair_character(char_id, 9000 + nid, regen_idle=args.regen_idle)
                if n:
                    repaired += 1
                    ok += 1
            else:
                keep_idle = args.keep_idle or args.poses_only is not None
                if export_character(
                    char_id,
                    9000 + nid,
                    keep_idle=keep_idle,
                    poses_only=args.poses_only,
                ):
                    ok += 1
        except Exception as exc:
            print(f"  [실패] {char_id}: {exc}")
        time.sleep(5)

    label = "수리" if args.repair else "완료"
    print(f"\n{label}: {ok}/{len(ids)}")
    if args.regen_ts and (ok or repaired):
        regenerate_sprite_assets_ts()


if __name__ == "__main__":
    main()
