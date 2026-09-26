#!/usr/bin/env python3
"""Build the three approved high-resolution NPC poster pilot candidates.

The source is the existing 1254px clarity idle master. No resize, AI process,
quantization, blur, sharpening, or alpha rewrite is performed. Only the approved
poster C exterior red/orange rim mask is replaced with nearby original dark
material. Production write is limited to NPC 07, 12 and 15 pilot derivatives.
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
WORK = ROOT / "output/npc-high-res-pilot"
QA = ROOT / "artifacts/npc-high-res-pilot"
PILOT_IDS = (7, 12, 15)
FONT = "/Library/Fonts/Arial Unicode.ttf"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def composite_character(array: np.ndarray, size: int, background: str) -> Image.Image:
    image = Image.fromarray(array, "RGBA")
    bounds = image.getchannel("A").getbbox() or (0, 0, 1, 1)
    crop = image.crop(bounds)
    crop.thumbnail((size, size), Image.Resampling.NEAREST)
    result = Image.new("RGBA", (size, size), background)
    result.alpha_composite(crop, ((size - crop.width) // 2, size - crop.height))
    return result.convert("RGB")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="Promote only the three reviewed pilot derivatives")
    args = parser.parse_args()
    WORK.mkdir(parents=True, exist_ok=True)
    QA.mkdir(parents=True, exist_ok=True)
    records: list[dict[str, object]] = []
    previews: list[tuple[int, np.ndarray, np.ndarray, np.ndarray]] = []

    for npc_id in PILOT_IDS:
        source = ROOT / f"assets/images/characters/clarity/npc/{npc_id:02}/idle.png"
        current = ROOT / f"assets/images/characters/enemy/{npc_id:02}/identity_poster.png"
        target = source.with_name("identity_poster_pilot.png")
        original_source_hash = sha(source)
        source_array = np.array(Image.open(source).convert("RGBA"))
        current_array = np.array(Image.open(current).convert("RGBA"))
        poster, selected, unresolved = remove_rim(source_array, "npc", npc_id)
        assert source_array.shape == poster.shape == (1254, 1254, 4)
        assert np.array_equal(source_array[:, :, 3], poster[:, :, 3])
        assert unresolved == 0
        assert sha(source) == original_source_hash
        working = WORK / f"npc-{npc_id:02}-identity-poster.png"
        Image.fromarray(poster, "RGBA").save(working)
        Image.fromarray((selected * 255).astype("uint8"), "L").save(WORK / f"npc-{npc_id:02}-rim-mask.png")
        if args.write:
            assert target != source and target.name == "identity_poster_pilot.png"
            target.write_bytes(working.read_bytes())
        records.append({
            "id": npc_id,
            "identityMatch": "HIGH — visually reviewed hat, mask, coat, weapon, accessories, silhouette and palette",
            "currentPoster": str(current.relative_to(ROOT)),
            "currentPosterResolution": list(Image.open(current).size),
            "highResSource": str(source.relative_to(ROOT)),
            "highResSourceResolution": list(Image.open(source).size),
            "pilotPoster": str(target.relative_to(ROOT)),
            "pilotPosterResolution": list(Image.open(working).size),
            "sourceSha256": original_source_hash,
            "pilotSha256": sha(working),
            "rimPixelsReplaced": int(selected.sum()),
            "unresolvedCandidatePixels": unresolved,
            "alphaChangedPixels": int(np.count_nonzero(source_array[:, :, 3] != poster[:, :, 3])),
            "unselectedVisiblePixelChanges": int(np.count_nonzero(np.any(source_array[:, :, :3] != poster[:, :, :3], axis=2) & (source_array[:, :, 3] > 0) & ~selected)),
            "transparentRgbSanitized": int(np.count_nonzero((source_array[:, :, 3] == 0) & np.any(source_array[:, :, :3] != 0, axis=2))),
            "alphaPolicy": "Source alpha preserved exactly; NPC 15 intentional transparency retained",
            "rasterMethod": "native_1254_source_no_resize_no_resampling",
            "status": "PILOT_ONLY",
        })
        previews.append((npc_id, current_array, source_array, poster))
        print(f"NPC {npc_id:02}: rim {selected.sum()}, alpha changed 0, unresolved 0", flush=True)

    manifest = {
        "status": "PILOT_3_ONLY_AWAITING_HUMAN_APPROVAL",
        "ids": list(PILOT_IDS),
        "batch22Executed": False,
        "assets": records,
    }
    (WORK / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    if args.write:
        (QA / "pilot-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")

    font = ImageFont.truetype(FONT, 23)
    small = ImageFont.truetype(FONT, 17)
    for background, suffix, ink in [("#d5b47e", "parchment", "#382116"), ("#17120f", "dark", "#ead3a8")]:
        sheet = Image.new("RGB", (1500, 3 * 560), background)
        draw = ImageDraw.Draw(sheet)
        for row, (npc_id, current, source, poster) in enumerate(previews):
            y = row * 560
            for column, (label, array) in enumerate((("CURRENT 512 / effective 256", current), ("HIGH-RES SOURCE 1254", source), ("HIGH-RES CLEAN POSTER 1254", poster))):
                x = column * 500
                sheet.paste(composite_character(array, 450, background), (x + 25, y + 50))
                draw.text((x + 20, y + 15), f"NPC {npc_id:02} · {label}", font=font, fill=ink)
            draw.text((20, y + 520), "Native source preserved · alpha unchanged · external rim mask only", font=small, fill=ink)
        sheet.save(QA / f"pilot-current-source-clean-{suffix}.png")


if __name__ == "__main__":
    main()
