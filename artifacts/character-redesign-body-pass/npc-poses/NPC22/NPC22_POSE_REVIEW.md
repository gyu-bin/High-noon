# PHASE 3B-6: NPC22 combat set review (2026-10-01)

## Inputs
- **Idle:** the locked master (round 2), unchanged.
- **Poses:** 6 lossless PNGs from ~/Downloads/high-noon, all single figures. DOWN is 1653×952 landscape (`…09_08_52.png`).

## Normalization (`build_npc_poses.py NPC22`, chin_to_ground)
- **Body scale:** 1.0 (wanted ×1.007).
- **x anchor:** skull belt-buckle centre.
- **rel:** 1.0, except DOWN 0.9 (lying body ≈1400 px long vs ≈1200 standing).
- **Common canvas:** 1684², displayScale 1.3429, frameGroundY 1231. All 7 inside (minimum 8 px).
- Staged files written. **`REDESIGN_ART_META` / preview not updated** (pending the decision below). Protected files unchanged.

| Check | Result |
| --- | --- |
| WEAPON | PASS — 1 long-barrel revolver in every pose (low → raised → aimed → gripped off-aim → barrel on ground → falling → on the ground); tube holster empty |
| GROUND / CANVAS / CLIPPING | PASS |
| POSE CONTINUITY (6 poses among themselves) | PASS — DRAW (raise) → FIRE (level aim); HIT keeps the gun; HIT→KNEEL→FALL→DOWN with the horse sinking and fading |
| IDENTITY ELEMENTS | PASS — pale body/legs/boots, thorn hat with cross charm, void face, pale hair, cobweb cape, skull buckle in all 7 |
| SMALL SIZE on dark (night duel) | PASS — the pale figure reads strongly at 160 |
| **STYLE vs locked IDLE** | **PARTIAL (visible drift)** — the idle is a warmer bone/tan with denser dark folds and a small **bare horse skull** close to the shoulder. The 6 poses are whiter/cooler with a large **full ghost horse head and flowing mane** rising behind the rider, and a bigger, lacier cape. At 160–241 px, IDLE→DRAW and HIT→IDLE change the horse and the overall brightness (`review/F_dark_background.png`) |

```
NPC22_COMBAT_SET=NOT_LOCK_READY (pending decision: idle ↔ pose-set drift, mainly the horse and brightness)
LIVE_MAPPING_CHANGED=NO  PRODUCTION_CHANGED=NO  DATABASE_CHANGED=NO
```

## Options
- **A (recommended; same as P04/NPC09/NPC19):** adopt the pose-set style. Generate one `NPC22_IDLE_V2.png` with DRAW + FIRE as references (white-ash palette, the full spectral horse head with mane behind the rider, the same cape, revolver held low, empty holster). Then re-normalize, and re-derive the staged poster and the locked silhouette from the new idle.
- **B:** accept as is. The rider is consistent; only the horse and brightness jump.

---
# Re-review with IDLE_V2 (2026-10-01): decision A applied
- **New idle:** `intake/NPC22_IDLE_V2.png` = ~/Downloads/high-noon `…09_15_31.png` (1254² lossless; opaque diff 3.0, alpha agree 100%; no edge contact). The old idle is retired (`anchors.json → retired_idle`).
- **IDLE_V2 anchors:** chin 250, boot sole 1239, skull-buckle x 805, rel 1.0.
- **Re-normalization:** body scale 1.0 (wanted ×1.013, clamped: ≈1% smaller than production). Common canvas **1684²**, displayScale **1.3429**, frameGroundY 1231. All 7 inside (minimum 8 px, DOWN).
- **Metadata:** `REDESIGN_ART_META.NPC22.canvasSize` 1642 → 1684. The DEV preview has draw/fire/hit/down(KNEEL); combat_fall/combat_down are staged.
- **Staged poster re-derived** from the new idle: `staged/redesign-v2/npc/22/identity_poster.png` (1254², uniform fit 0.981, no crop).
- **Staged locked silhouette re-derived:** `staged/redesign-v2/hidden/pale_rider_locked_silhouette.png` (256², black, binary alpha). It now shows the horse head, mane and cape. See `review/poster_and_silhouette_v2.png` (poster | live silhouette | new staged silhouette).
- Protected production files unchanged.

| Check | Result |
| --- | --- |
| IDENTITY (idle ↔ 6 poses) | PASS — the same white-ash palette, thorn hat with cross charm, void face, pale hair, cobweb cape, spectral horse head with mane behind the rider, skull buckle, empty tube holster, pale wrapped legs/boots |
| WEAPON | PASS — 1 long-barrel revolver in every pose; IDLE holds it low |
| GROUND / CANVAS / CLIPPING | PASS |
| CONTINUITY | PASS — IDLE→DRAW→FIRE, IDLE→HIT→IDLE, HIT→KNEEL→FALL→DOWN; no palette or horse jump at 160–241 on dark |
| Minor | The horse stays fairly visible in DOWN. The new locked silhouette is a wide horse+cape mass, less "gunslinger" than the live one; judge at integration |

```
NPC22_COMBAT_SET=LOCK_READY
LIVE_MAPPING_CHANGED=NO  PRODUCTION_CHANGED=NO  DATABASE_CHANGED=NO  TYPECHECK=PASS
```
