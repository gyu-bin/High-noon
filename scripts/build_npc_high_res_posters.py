#!/usr/bin/env python3
"""Build all 22 native-resolution NPC Wanted poster derivatives.

Input is always the existing 1254x1254 clarity idle master. The approved C
poster treatment replaces only exterior red/orange rim pixels with nearby
original dark material. Alpha and every unselected visible pixel are preserved.
No resize, resampling, AI operation, blur, sharpening, or quantization is used.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from build_poster_character_assets import remove_rim


ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / "output/npc-high-res-production"
QA = ROOT / "artifacts/npc-high-res-production"
FONT = "/Library/Fonts/Arial Unicode.ttf"
NAMES = (
    "먼지바람", "녹슨 총구", "황야의 까마귀", "사막의 여우", "철가면", "냉혈한 레이첼",
    "독침 선인장", "쌍권총 로렌조", "황금 해골", "강철 독수리", "침묵의 기관차", "블랙 아이언",
    "미러 잭", "썬더 볼트", "그림자 사냥꾼", "베놈 스파이크", "사막의 악마 드라이든",
    "레드 아이 오라클", "보이드 워커", "에코 팬텀", "장의사", "창백한 기수",
)


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def composite(array: np.ndarray, size: int, background: str) -> Image.Image:
    image = Image.fromarray(array, "RGBA")
    bounds = image.getchannel("A").getbbox() or (0, 0, 1, 1)
    crop = image.crop(bounds)
    crop.thumbnail((size, size), Image.Resampling.NEAREST)
    result = Image.new("RGBA", (size, size), background)
    result.alpha_composite(crop, ((size - crop.width) // 2, size - crop.height))
    return result.convert("RGB")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="Write all 22 reviewed production derivatives")
    args = parser.parse_args()
    WORK.mkdir(parents=True, exist_ok=True)
    QA.mkdir(parents=True, exist_ok=True)
    records: list[dict[str, object]] = []
    previews: list[tuple[int, np.ndarray, np.ndarray]] = []
    source_hashes: dict[str, str] = {}

    for npc_id in range(1, 23):
        source = ROOT / f"assets/images/characters/clarity/npc/{npc_id:02}/idle.png"
        target = source.with_name("identity_poster.png")
        legacy = ROOT / (f"assets/images/characters/enemy/{npc_id:02}/identity_poster.png" if npc_id != 22 else "assets/images/hidden/pale_rider_identity_poster.png")
        source_hashes[str(source)] = sha(source)
        source_array = np.array(Image.open(source).convert("RGBA"))
        poster, selected, unresolved = remove_rim(source_array, "npc", npc_id)
        assert source_array.shape == poster.shape == (1254, 1254, 4)
        assert np.array_equal(source_array[:, :, 3], poster[:, :, 3])
        assert unresolved == 0
        working = WORK / f"npc-{npc_id:02}-identity-poster.png"
        Image.fromarray(poster, "RGBA").save(working)
        Image.fromarray((selected * 255).astype("uint8"), "L").save(WORK / f"npc-{npc_id:02}-rim-mask.png")
        assert sha(source) == source_hashes[str(source)]
        if args.write:
            assert target != source and target.name == "identity_poster.png"
            target.write_bytes(working.read_bytes())
        alpha_bounds = Image.fromarray(poster, "RGBA").getchannel("A").getbbox()
        records.append({
            "id": npc_id,
            "name": NAMES[npc_id - 1],
            "identityMatch": "HIGH — approved full-roster visual audit",
            "highResIdentitySource": str(source.relative_to(ROOT)),
            "posterIdentity": str(target.relative_to(ROOT)),
            "legacyLowResPoster": str(legacy.relative_to(ROOT)),
            "legacyStatus": "deprecated_runtime_preserved_repository_asset",
            "duelPoseRoot": f"assets/images/characters/clarity/npc/{npc_id:02}",
            "sourceResolution": [1254, 1254],
            "posterResolution": [1254, 1254],
            "sourceSha256": source_hashes[str(source)],
            "posterSha256": sha(working),
            "rimPixelsReplaced": int(selected.sum()),
            "unresolvedCandidatePixels": unresolved,
            "alphaChangedPixels": int(np.count_nonzero(source_array[:, :, 3] != poster[:, :, 3])),
            "unselectedVisiblePixelChanges": int(np.count_nonzero(np.any(source_array[:, :, :3] != poster[:, :, :3], axis=2) & (source_array[:, :, 3] > 0) & ~selected)),
            "transparentRgbSanitized": int(np.count_nonzero((source_array[:, :, 3] == 0) & np.any(source_array[:, :, :3] != 0, axis=2))),
            "alphaBounds": list(alpha_bounds) if alpha_bounds else None,
            "alphaPolicy": "source alpha preserved exactly; intentional special transparency retained",
            "rasterMethod": "native_1254_source_no_resize_no_resampling",
        })
        previews.append((npc_id, source_array, poster))
        print(f"NPC {npc_id:02}: rim {selected.sum()}, alpha 0, unresolved 0", flush=True)

    assert all(sha(Path(path)) == digest for path, digest in source_hashes.items())
    manifest = {
        "status": "PENDING_FULL_DEVICE_QA",
        "sourceCount": 22,
        "posterCount": 22,
        "sourceResolution": [1254, 1254],
        "posterResolution": [1254, 1254],
        "treatment": "C — external red/orange cinematic rim fully removed",
        "batch22Executed": True,
        "assets": records,
    }
    (WORK / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    if args.write:
        (ROOT / "assets/images/characters/npc-high-res-poster-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")

    font = ImageFont.truetype(FONT, 21)
    for background, suffix, ink in [("#d5b47e", "parchment", "#382116"), ("#17120f", "dark", "#ead3a8")]:
        for start in range(0, 22, 6):
            subset = previews[start:start + 6]
            sheet = Image.new("RGB", (1200, 3 * 400), background)
            draw = ImageDraw.Draw(sheet)
            for index, (npc_id, source, poster) in enumerate(subset):
                row, column = divmod(index, 2)
                x, y = column * 600, row * 400
                sheet.paste(composite(source, 330, background), (x + 10, y + 45))
                sheet.paste(composite(poster, 330, background), (x + 260, y + 45))
                draw.text((x + 10, y + 10), f"NPC {npc_id:02} SOURCE", font=font, fill=ink)
                draw.text((x + 330, y + 10), "CLEAN POSTER", font=font, fill=ink)
            sheet.save(QA / f"npc-{start + 1:02}-{suffix}.png")


if __name__ == "__main__":
    main()
