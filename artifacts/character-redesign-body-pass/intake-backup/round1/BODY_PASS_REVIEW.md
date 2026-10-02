# HIGH NOON — Body Differentiation Pass review

2026-10-01 · `dev-2.0` · review only. No production, runtime, code, DB, pose or VFX changes.

## Intake

The ChatGPT exports were copied (originals kept) to the exact filenames using the human-confirmed mapping.
`review_body_pass.py` was run unmodified. Identification was by filename only.
Production idle SHA-256: 7/7 identical before and after the run (`production_unchanged: true`).

| File | Source export |
| --- | --- |
| NPC18_RED_EYE_ORACLE.png | …08_40_30.png |
| NPC22_PALE_RIDER.png | …08_40_36.png |
| P04_GHOST_GUNSLINGER.png | …08_42_13.png |
| NPC15_SHADOW_HUNTER.png | …08_42_27.png |
| NPC19_VOID_WALKER.png | …08_42_36.png |
| NPC20_ECHO_PHANTOM.png | …08_42_44.png |
| NPC09_GOLDEN_SKULL.png | …08_42_52.png |

## File checks (`review/file_checks.json`)

All 7: PNG, RGBA, 1254×1254, true alpha (37–48% alpha=0, max 255), no black matte (≤0.15%).

| ID | Edge contact (alpha>24) | White fringe | Red/orange fringe | Sharpness | Note |
| --- | --- | --- | --- | --- | --- |
| P04 | none; 107px within 8px | 1.7% | 0.0% | 3268 | tight |
| NPC15 | none; 330px within 8px | 0.07% | 0.0% | 1493 | tight; softest (smoke) |
| NPC19 | **76px**: hat crown top (x682–688), cloak tatters bottom, 2px right | 0.5% | 0.0% | 2882 | hat crown clipped a few px |
| NPC20 | none; 125px within 8px | **4.2%** | 0.1% | 2201 | white = semi-transparent echo figures, not a halo (clean on dark sheet) |
| NPC09 | 8px: cape tip, right | 1.5% | 9.5% | 2222 | red/orange = worn-gold palette, no rim visible |
| NPC18 | 1px: halo spike, top | 0.4% | 29.6% | 1966 | red = crimson palette/eyes, no rim visible |
| NPC22 | **51px**: boot sole bottom (x776–802), cloth right | 3.0% | 0.0% | 2886 | **ground point clipped** |

Every figure fills the canvas edge to edge (bbox ≈ 1240px wide). This is tighter than production idle (≈600px wide body),
because of large cloaks/effects. See Normalization.

## Weapon check (visual, holster crops)

| ID | In hand | Holster | Total | Rule |
| --- | --- | --- | --- | --- |
| P04 | 2 | empty tube | 2 | B OK |
| NPC15 | 1 | 1 (grip visible) | 2 | A OK |
| NPC19 | 1 | empty tube | 1 | OK |
| NPC20 | 2 (1 aimed, 1 low) | empty tube | 2 | B OK (brief asked A; within rule) |
| NPC09 | 2 | 2 empty tubes | 2 | B OK (brief asked C "2 holstered"; within rule) |
| NPC18 | 1 (raised) | empty tube cluster | 1 | OK |
| NPC22 | 1 long barrel | empty tube | 1 | OK |

WEAPON_COUNT_VIOLATIONS=NONE. Caveat: the "empty" holsters are closed capped tubes on every character (same prop), so
emptiness reads by absence of a grip. Keep that consistent in poses.

## Body-template overlap (`review/E_body_overlap.png`, `body_overlap_iou.json`)

- Pairwise solid-core IoU mean **0.623** (previous batch mean 0.667, range 0.541–0.742). Max **NPC15~NPC22 0.725**,
  then NPC09~NPC18 0.702, NPC09~NPC22 0.701.
- Same-ID vs previous candidate: NPC19 0.536, NPC20 0.534 (changed the most); NPC22 0.676, NPC09 0.667, NPC15 0.643
  (changed the least in outline).
- IoU is dominated by the big cloaks, which all trail to the left. The visual read decides.

**Visually, what changed:** stance and posture now differ (P04 open dual-gun stance, NPC15 crouched claw-reach,
NPC19 reaching arm with orbiting fragments, NPC20 lunging aim, NPC09 planted wide with pauldrons, NPC18 frontal robe with
raised gun and halo, NPC22 tall still). **What is still shared:** the diamond-quilt material on coat/pants/boots of all 7,
the same tall-crown wide-brim hat mold on 6 of 7 (NPC18 has a hood under the hat), the same belt/buckle/bullet loops/
capped-tube holster/spur hardware, and every cloak trailing to the left.

## Per-character review

### P04 — Ghost Gunslinger
```
DECISION=APPROVE_WITH_NORMALIZATION
FILE_QUALITY=good (sharpest of the 7)
PNG_ALPHA=PASS
CROP=PASS (tight to the edge, no contact)
BODY_DIFFERENTIATION=moderate — open dual-gun stance, asymmetric duster, right leg dissolves into blue mist; hat mold and quilt material still shared
SILHOUETTE=tall, arms held out with two guns, ragged left cloak
FANTASY_READ=GHOST — void face with blue cracks, cold blue-white dissolve; no afterimages (NPC20 collision solved)
SMALL_SIZE=PASS at 256/241/200/160 (blue dissolve leg + dual guns)
WEAPON_COUNT=2 (2 in hands, holster empty)
NORMALIZATION_REQUIRED=YES — downscale so the cloak fits with margin
MAIN_RISK=body underneath is still the most "standard cowboy" of the set; identity leans on the blue dissolve
```

### NPC15 — Shadow Hunter
```
DECISION=APPROVE_WITH_NORMALIZATION
FILE_QUALITY=good; softest (smoke), acceptable
PNG_ALPHA=PASS
CROP=PASS (tight)
BODY_DIFFERENTIATION=good — crouched/bent knees, forward lean, clawed empty hand reaching, one-sided huge shadow mass
SILHOUETTE=widest dark mass of the set
FANTASY_READ=SHADOW — near-black, achromatic, small pale eyes, living smoke tendrils; clearly not P04
SMALL_SIZE=PASS on light; on dark backgrounds the body merges with the background (check in the duel scene)
WEAPON_COUNT=2 (1 in hand + 1 holstered)
NORMALIZATION_REQUIRED=YES — large downscale; the smoke mass dominates the canvas
MAIN_RISK=outline overlaps NPC22 (IoU 0.725); separated mainly by value (black vs pale)
```

### NPC19 — Void Walker
```
DECISION=APPROVE_WITH_NORMALIZATION (minor crop note)
FILE_QUALITY=good
PNG_ALPHA=PASS
CROP=MINOR — hat crown touches the top edge (~7px), tatters touch the bottom
BODY_DIFFERENTIATION=good — torso is an open starfield with a black hole, reaching arm, orbiting spheres, broken fragments
SILHOUETTE=scattered fragments and holes around the body; the most changed vs previous (IoU 0.536)
FANTASY_READ=VOID — reads from structure (holes, fragments, orbiting spheres), not only purple
SMALL_SIZE=PASS at all sizes, including toned-down
WEAPON_COUNT=1
NORMALIZATION_REQUIRED=YES — downscale; accept the few clipped hat pixels or regenerate with margin
MAIN_RISK=the clipped crown is visible only at full size
```

### NPC20 — Echo Phantom
```
DECISION=APPROVE_WITH_NORMALIZATION
FILE_QUALITY=good
PNG_ALPHA=PASS (white fringe flag = semi-transparent echo figures, intended)
CROP=PASS (tight; aimed barrel near the right edge)
BODY_DIFFERENTIATION=strong — lunging aim pose, extended gun arm, 3 trailing echoes of hat/arm/gun following the motion
SILHOUETTE=the only horizontal/diagonal silhouette of the set
FANTASY_READ=ECHO — immediately; main body opaque and dominant
SMALL_SIZE=PASS at 160
WEAPON_COUNT=2 (both in hands, holster empty; echo guns are afterimages)
NORMALIZATION_REQUIRED=YES — the aim pose is wide; foot baseline and duel framing need a check
MAIN_RISK=not "slimmer" than others as briefed; the jacket is still a long duster
```

### NPC09 — Golden Skull
```
DECISION=APPROVE_WITH_NORMALIZATION
FILE_QUALITY=good
PNG_ALPHA=PASS (red/orange flag = gold palette)
CROP=MINOR — cape tip touches the right edge (8px)
BODY_DIFFERENTIATION=strong — broad shoulders with skull pauldrons, gold ribcage armor, wide planted stance
SILHOUETTE=heaviest, most grounded
FANTASY_READ=GOLDEN SKULL + boss — immediately
SMALL_SIZE=PASS; skull face readable at 200, gold/ribs at 160
WEAPON_COUNT=2 (2 in hands, 2 empty holsters)
NORMALIZATION_REQUIRED=YES
MAIN_RISK=cape is long, not the short heavy cape briefed; outline overlaps NPC18/NPC22 (IoU ~0.70)
```

### NPC18 — Red Eye Oracle
```
DECISION=APPROVE_WITH_NORMALIZATION (minor detail note)
FILE_QUALITY=good
PNG_ALPHA=PASS (red flag = crimson palette/eyes, no rim)
CROP=MINOR — halo spike touches the top edge (1px)
BODY_DIFFERENTIATION=strong — hood under the hat, layered robes to the ground, raised revolver, spiked halo, talismans
SILHOUETTE=frontal robe triangle + halo + raised gun; unique
FANTASY_READ=ORACLE first, gunslinger second — eyes on hat, hood, scarf, robes and belt
SMALL_SIZE=PASS at all sizes (red eyes + halo)
WEAPON_COUNT=1
NORMALIZATION_REQUIRED=YES
MAIN_RISK=a small skull on the left shoulder (brief said no skulls; minor overlap with NPC09)
```

### NPC22 — Pale Rider
```
DECISION=NEEDS_MINOR_REVISION
FILE_QUALITY=good
PNG_ALPHA=PASS
CROP=FAIL (minor) — boot sole touches the bottom edge: the ground point is clipped
BODY_DIFFERENTIATION=weak — tall and still, but the body under the cloak is the shared dark quilt coat/pants/boots
SILHOUETTE=large left-trailing cloak; closest outline to NPC15 (0.725)
FANTASY_READ=pale/death rider partly — ash cloak, pale hat, absent face, spectral horse skull (a good restrained rider motif); no gravekeeper props
SMALL_SIZE=PARTIAL — reads "pale ghost" at 160, but final-boss presence is weaker than NPC09/NPC18
WEAPON_COUNT=1
NORMALIZATION_REQUIRED=YES, but regenerate first
MAIN_RISK=pale is only the cloth overlay; the torso, legs and boots stay dark brown-black
```
Revision: bleach the torso, pants and boots to ash/bone (minimal black), make it taller/narrower than the others,
keep the horse skull and absent face, and leave margin under the boots.

## Cross-character pairs

| Pair | Verdict |
| --- | --- |
| P04 vs NPC15 | DISTINCT — blue dissolve and open dual stance vs crouched black mass |
| P04 vs NPC20 | DISTINCT — previous collision solved (no afterimages on P04; NPC20 lunges and aims) |
| NPC15 vs NPC20 | DISTINCT |
| NPC19 vs NPC20 | DISTINCT |
| NPC09 vs NPC18 | DISTINCT in read (skull/gold vs robe/eyes); outline IoU 0.70; small shoulder-skull overlap |
| NPC09 vs NPC22 | DISTINCT in color; similar dark body under the cloak |
| NPC18 vs NPC22 | DISTINCT |
| NPC15 vs NPC22 | **closest outline** (0.725); separated by value only |

## Normalization (not applied)

Production idle bodies are ≈1190–1216px tall and ≈600px wide on 1254². The new figures are 1200–1245px tall
with cloaks spanning the full canvas. Matching body height needs roughly a 0.96–0.99 uniform downscale.
The cloaks would then still touch the canvas. Options for PHASE 1: (a) a larger downscale to recover margin,
which makes the body smaller than production, or (b) a wider runtime canvas. The body must not be upscaled.
Automatic hat/foot estimates are unreliable here because cloaks reach the bottom; mark them manually in PHASE 1.

## Summary

```
BODY_TEMPLATE_DUPLICATION=REDUCED_NOT_ELIMINATED — pose/stance now differs, but quilt material, hat mold (6/7), belt/holster/spur hardware and left-trailing cloaks are still shared
SILHOUETTE_DIFFERENTIATION=PASS_WITH_NOTES — NPC20, NPC18, NPC19, NPC09 distinct; P04/NPC15/NPC22 rely partly on value/color
TOO_SIMILAR_PAIRS=NPC15~NPC22 (outline), NPC09~NPC18 (outline and shoulder skull, minor)
DUEL_160PX=P04 ghost PASS · NPC15 shadow PASS (light) / weak on dark · NPC19 void PASS · NPC20 echo PASS · NPC09 golden skull PASS · NPC18 oracle PASS · NPC22 pale PASS, final-boss read PARTIAL
WEAPON_COUNT_VIOLATIONS=NONE
APPROVED=—
APPROVE_WITH_NORMALIZATION=P04, NPC15, NPC19, NPC20, NPC09, NPC18
NEEDS_MINOR_REVISION=NPC22
REJECTED=—
REGENERATE=NPC22 only (pale body, not only a pale cloak; boot clipped). Optional touch-ups: NPC19 hat crown margin, NPC18 shoulder skull.

A_LINEUP=review/A_lineup_{dark,light}.png
B_SILHOUETTES=review/B_silhouette.png
C_NPC_SELECT=review/C_select256_{dark,light}.png
D_DUEL=review/D_duel_160_200_241_{dark,light}.png
E_OVERLAP=review/E_body_overlap.png, review/body_overlap_iou.json
F_EFFECTS_REDUCED=review/F_effects_toned_down_{dark,light}.png

PRODUCTION_HASH_CHECK=PASS 7/7 before and after
PRODUCTION_CHANGED=NO
CODE_CHANGED=NO
DATABASE_CHANGED=NO
```

STOP — human approval required before production integration.
