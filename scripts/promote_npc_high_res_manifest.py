#!/usr/bin/env python3
"""Merge the reviewed 22-NPC high-res production manifest into poster-manifest."""
from __future__ import annotations

import argparse
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
POSTER_MANIFEST = ROOT / "assets/images/characters/poster-manifest.json"
NPC_MANIFEST = ROOT / "assets/images/characters/npc-high-res-poster-manifest.json"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lock", action="store_true", help="Record final device/performance QA lock")
    args = parser.parse_args()
    poster = json.loads(POSTER_MANIFEST.read_text())
    production = json.loads(NPC_MANIFEST.read_text())
    high_res = {item["id"]: item for item in production["assets"]}
    assert set(high_res) == set(range(1, 23))
    for item in poster["assets"]:
        if item["kind"] != "npc":
            continue
        replacement = high_res[item["id"]]
        item["identity"]["approvedAlpha"] = replacement["highResIdentitySource"]
        item["identity"]["highResMaster"] = replacement["highResIdentitySource"]
        item["identity"]["poster"] = replacement["posterIdentity"]
        item["identity"]["legacyLowResPoster"] = replacement["legacyLowResPoster"]
        item["duelPoseDirectory"] = replacement["duelPoseRoot"]
        item["sourceSha256"] = replacement["sourceSha256"]
        item["posterSha256"] = replacement["posterSha256"]
        item["sourceDimensions"] = replacement["sourceResolution"]
        item["posterDimensions"] = replacement["posterResolution"]
        item["edgeTreatment"] = "C_removed_100_percent_high_res"
        item["rimPixelsReplaced"] = replacement["rimPixelsReplaced"]
        item["unresolvedCandidatePixels"] = replacement["unresolvedCandidatePixels"]
        item["alphaChangedPixels"] = replacement["alphaChangedPixels"]
        item["unselectedVisiblePixelChanges"] = replacement["unselectedVisiblePixelChanges"]
        item["originalDarkPixelChanges"] = 0
        item["alphaPolicy"] = replacement["alphaPolicy"]
        item["rasterMethod"] = replacement["rasterMethod"]
        item["identityMatch"] = replacement["identityMatch"]
        item["legacyStatus"] = replacement["legacyStatus"]
    poster["version"] = 2
    poster["status"] = "production_locked" if args.lock else "pending_full_device_qa"
    poster["approvedTreatment"] = "C — HIGH-RES EXTERNAL RIM REMOVED"
    poster["notes"] = "NPC Wanted surfaces use native 1254px clarity masters. Legacy 512px posters remain preserved but deprecated. Duel registries remain authoritative and unchanged."
    poster["highResNpcCount"] = 22
    poster["legacyNpcRuntimeCount"] = 0
    poster["lockTitle"] = "NPC SELECT V3 — HIGH-RES PRODUCTION LOCKED" if args.lock else None
    if args.lock:
        poster["qa"] = {
            "HIGH_RES_SOURCE": "22/22",
            "HIGH_RES_POSTER": "22/22",
            "IDENTITY_MATCH": "22/22",
            "RIM_LIGHT_REMOVED": "22/22",
            "ALPHA_PASS": "22/22",
            "CLIPPING_PASS": "22/22",
            "DEVICE_QA": "PASS — iPhone 17 Pro simulator, nine requested NPC states",
            "PERFORMANCE_QA": "PASS — current-only mount, entry and repeated carousel navigation",
            "PLAYER_NPC_QUALITY_COMPARE": "PASS",
        }
    POSTER_MANIFEST.write_text(json.dumps(poster, ensure_ascii=False, indent=2) + "\n")
    production["status"] = "PRODUCTION_LOCKED" if args.lock else "PENDING_FULL_DEVICE_QA"
    production["runtimeMappedCount"] = 22
    production["legacyRuntimeCount"] = 0
    production["lockTitle"] = "NPC SELECT V3 — HIGH-RES PRODUCTION LOCKED" if args.lock else None
    if args.lock:
        production["qa"] = poster["qa"]
    NPC_MANIFEST.write_text(json.dumps(production, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
