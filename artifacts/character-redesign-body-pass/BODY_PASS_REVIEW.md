# HIGH NOON — Body Differentiation Pass review (round 2)

2026-10-01 · `dev-2.0` · review only. No production, runtime, code, DB, normalization, pose or VFX changes.
Round 1 report, the 3 replaced intake files and the round 1 review outputs are kept in `intake-backup/round1/`.

## Intake (round 2)

Chat attachments were compressed WebP (1254² / 1125² / 1125²). The same three images exist as lossless
1254² RGBA PNG exports in `~/Downloads`, so those were used. The originals were copied into `intake/` under their
export names, then copied to exact names. The mapping is visual and unambiguous:

| Export | Read | Exact name |
| --- | --- | --- |
| …08_57_12.png | pale/ash body, faceless, horse skull, one long barrel | `NPC22_PALE_RIDER.png` |
| …08_57_21.png | black-hole head, starfield body, fragments | `NPC19_VOID_WALKER.png` |
| …08_57_38.png | many red eyes, halo, crimson robes | `NPC18_RED_EYE_ORACLE.png` |

P04, NPC15, NPC20 and NPC09 are unchanged (SHA-256 verified before replacement). `review_body_pass.py` was run unmodified.
Production idle SHA-256: 7/7 identical before and after.

## Revised three — file checks

| ID | PNG/RGBA/1254² | Alpha | Edge | Fringe | Sharpness |
| --- | --- | --- | --- | --- | --- |
| NPC22 | yes | true (37% zero) | **no contact**; boot sole ends 1px above the bottom (full boots present, margin minimal) | white 2.9%, black 0.14%, red 0% | 3061 |
| NPC19 | yes | true (42% zero) | **no contact**; topmost pixel is the raised gun muzzle (row 1). Hat top is no longer clipped | white 0.65%, black 0.01%, red 0% | 3375 |
| NPC18 | yes | true (43% zero) | **halo spike tip touches the top (3px)**; rest is clear | red 47% = crimson palette (no extraction rim visible), white 0.3% | 2209 |

## Revised three — review

### NPC22 — Pale Rider
```
DECISION=APPROVE_WITH_NORMALIZATION
FILE_QUALITY=good
PNG_ALPHA=PASS
CROP=PASS (tight; boots complete, 1px bottom margin)
BODY_DIFFERENTIATION=good — torso, pants, boots, gloves and hat are now ash/bone; no dark common cowboy body. Upright, straight-legged, still
SILHOUETTE=tall upright figure with a large left-trailing cloak and a spectral horse skull at upper left
FANTASY_READ=PALE RIDER / DEATH — faceless, horse skull rider motif, no lanterns/ravens/crosses
160PX_READABILITY=PASS — the only pale figure in the set; reads pale/death at 160. Final-boss presence moderate (no bigger than the others after canvas fit)
WEAPON_COUNT=1 (long-barrel in hand, holster empty)
NORMALIZATION_REQUIRED=YES — downscale for bottom margin
REVISION_GOAL_MET=YES (pale body, no props, no clip); partly for "tallest/thinnest" — not measurably taller once fitted to the canvas
MAIN_RISK=outline still close to NPC15 (IoU 0.706) and NPC18 (0.711); separation relies on value + upright stance + horse skull
```

### NPC19 — Void Walker
```
DECISION=NEEDS_MINOR_REVISION
FILE_QUALITY=good (sharpest of the set)
PNG_ALPHA=PASS
CROP=PASS — hat clipping fixed
BODY_DIFFERENTIATION=REGRESSED — the pose changed from "low gun + reaching hand" to "revolver raised in one hand + open palm extended", which is the same pose as NPC18
SILHOUETTE=raised gun + wide cloak + open hand; NPC19~NPC18 IoU 0.602 → 0.694, NPC19~NPC09 0.637 → 0.727 (the highest pair)
FANTASY_READ=VOID kept — black-hole face, starfield body, broken fragments
160PX_READABILITY=PASS by color and fragments; NPC18 vs NPC19 pose rhyme visible at 200–241
WEAPON_COUNT=1 (raised; holster empty)
NORMALIZATION_REQUIRED=YES
REVISION_GOAL_MET=PARTIAL — crop fixed and identity kept, but it was redesigned beyond a crop cleanup
MAIN_RISK=pose duplication with NPC18, which is the problem this pass is meant to remove
```
Fix options (human choice):
1. Regenerate the round 1 NPC19 design with top margin only: low or disconnected gun arm, no raised gun.
2. Accept the round 1 file (`intake-backup/round1/NPC19_VOID_WALKER.png`). It has better pose differentiation, but its hat crown is clipped by about 7px, which normalization cannot restore.

### NPC18 — Red Eye Oracle
```
DECISION=APPROVE_WITH_NORMALIZATION
FILE_QUALITY=good
PNG_ALPHA=PASS
CROP=MINOR — halo spike tip touches the top edge (3px); figure otherwise complete
BODY_DIFFERENTIATION=good — hood under the hat, robes to the ground, raised revolver, halo, talisman strips
SILHOUETTE=frontal robe + spiked halo; unique among the set except the raised-gun pose now shared with NPC19
FANTASY_READ=ORACLE FIRST — eyes on hat, hood, scarf, belt, robes; gunslinger second
160PX_READABILITY=PASS (red eyes + halo)
WEAPON_COUNT=1 (raised; holster empty)
NORMALIZATION_REQUIRED=YES
REVISION_GOAL_MET=YES — left shoulder skull removed; no skull motif left, so the NPC09 undead overlap is gone
MAIN_RISK=halo tip 3px clip (acceptable); NPC09~NPC18 outline IoU unchanged at 0.697 (cloak mass, not motif)
```

## Priority comparisons

| Check | Result |
| --- | --- |
| NPC15 vs NPC22 | IoU 0.725 → **0.706** (slightly lower). Body structure now differs: NPC15 is crouched, black and smoke-edged; NPC22 is upright, straight-legged and pale. Distinct |
| NPC09 vs NPC18 | IoU 0.702 → **0.697**. Skull/undead motif overlap removed. Distinct in read; similar cloak mass |
| NPC19 old vs revised | Identity kept, crop fixed, **but the pose now copies NPC18** (IoU vs NPC18 0.694) |

## All 7

```
P04=APPROVE_WITH_NORMALIZATION (unchanged)
NPC15=APPROVE_WITH_NORMALIZATION (unchanged)
NPC19=NEEDS_MINOR_REVISION (pose duplicates NPC18)
NPC20=APPROVE_WITH_NORMALIZATION (unchanged)
NPC09=APPROVE_WITH_NORMALIZATION (unchanged)
NPC18=APPROVE_WITH_NORMALIZATION
NPC22=APPROVE_WITH_NORMALIZATION

BODY_TEMPLATE_DUPLICATION=REDUCED_NOT_ELIMINATED — stances differ, but the diamond-quilt material, hat mold, belt/capped-tube holster/spur hardware and left-trailing cloaks are shared; core IoU mean 0.640 (round 1 0.623, previous batch 0.667)
SILHOUETTE_DIFFERENTIATION=PASS_WITH_NOTES — NPC20, NPC09, NPC18, NPC22 distinct; NPC19 now rhymes with NPC18
TOO_SIMILAR_PAIRS=NPC19~NPC18 (pose), NPC19~NPC09 (outline 0.727), NPC15~NPC22 (outline 0.706, separated by value/stance)
NPC15_NPC22_IOU=0.706 (round 1: 0.725)
NPC09_NPC18_IOU=0.697 (round 1: 0.702)
DUEL_160PX=all 7 concepts readable; NPC15 weak on dark backgrounds
WEAPON_COUNT_VIOLATIONS=NONE

APPROVED=—
APPROVE_WITH_NORMALIZATION=P04, NPC15, NPC20, NPC09, NPC18, NPC22
NEEDS_MINOR_REVISION=NPC19
REJECTED=—

IDENTITY_MASTER_STATUS=NOT_LOCK_READY (6/7) — blocker: NPC19 pose; becomes LOCK_READY if fix option 1 or 2 is chosen

A_LINEUP=review/A_lineup_{dark,light}.png
B_SILHOUETTES=review/B_silhouette.png
C_NPC_SELECT=review/C_select256_{dark,light}.png
D_DUEL=review/D_duel_160_200_241_{dark,light}.png
E_OVERLAP=review/E_body_overlap.png, review/body_overlap_iou.json
F_EFFECTS_REDUCED=review/F_effects_toned_down_{dark,light}.png

PRODUCTION_HASH_CHECK=7/7 SAME
PRODUCTION_CHANGED=NO
CODE_CHANGED=NO
DATABASE_CHANGED=NO
```

STOP.
