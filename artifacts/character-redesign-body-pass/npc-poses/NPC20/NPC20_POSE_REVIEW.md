# PHASE 3B-5: NPC20 combat set review (2026-10-01)

## Inputs
- **Idle:** the locked master, **horizontally mirrored** (approved option M; pure flip via `idle.mirror=true`).
- **Poses:** 6 lossless 1254² PNGs from ~/Downloads/high-noon, all single figures, each compared with the mirrored reference at intake (`candidates/REVIEW.md`).

## Normalization (`build_npc_poses.py NPC20`, chin_to_ground)
- **Scale:** body scale 1.0 (wanted ×1.0404, clamped; NPC20 renders ≈4% smaller than production, as in PHASE 1). Pose rel = 1.0: hat-crown width and boot length match the reference in every pose. My earlier note that KNEEL/FALL looked enlarged was foreshortening.
- **Canvas:** common **1778²**, displayScale **1.4179**, frameGroundY 1214. All 7 inside the canvas, minimum 8 px (the idle echo gun).
- **Metadata:** `REDESIGN_ART_META.NPC20.canvasSize` 1712 → 1778. The DEV preview has draw/fire/hit/down(KNEEL); combat_fall/combat_down are staged.
- **Poster:** the staged `identity_poster.png` for NPC20 still faces image-right (PHASE 2, made before the mirror). Regenerate it mirrored at integration.
- **Production:** protected files unchanged.

| Check | Result |
| --- | --- |
| IDENTITY | PASS — the same dark hat with gold star badge, pale hair, masked face with pale eyes, quilted tattered duster with star pins, bullet belt with compass buckle, tube holsters, star spurs, and dark solid main body in all 7 |
| ECHO | PASS — echoes trail image-right in every pose, always fainter than the main body, pale blue-grey. Count: idle 2, DRAW 2, FIRE 3–4, HIT 3, KNEEL 2, FALL 2, DOWN 1 |
| WEAPON | PASS — 2 revolvers in every pose (both in hand → gripped off-aim → lowered → falling → on the ground); holsters empty |
| DIRECTION | PASS — all poses face/aim image-left |
| GROUND / CANVAS / CLIPPING | PASS |
| CONTINUITY | PASS — IDLE→DRAW→FIRE, IDLE→HIT→IDLE, HIT→KNEEL→FALL→DOWN |
| SMALL SIZE (160–241, dark bg) | PASS — the dark body in front of pale echoes reads at 160 |
| Notes | The idle is itself a lunging aim pose (as locked), so IDLE and FIRE are similar. The poses' echo mass is denser than the idle's. Integration QA: the runtime `echoReady` afterimage over baked echoes |

```
NPC20_COMBAT_SET=LOCK_READY
LIVE_MAPPING_CHANGED=NO  PRODUCTION_CHANGED=NO  DATABASE_CHANGED=NO  TYPECHECK=PASS
```
