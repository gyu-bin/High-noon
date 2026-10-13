# Locked viewport-boundary acceptance

Independently checked actual amended isolated `*-faceoff.png` assets and recomputed the frozen portrait helper placement. No production files or images were changed by this reviewer. The prior source acceptance confirmed canvas/identity/ground, while native evidence and later viewport-boundary checks identified extra outer extents; this follow-up verifies those extents after asset-only containment corrections.

## Actual source measurements

| Asset | Final canvas | Alpha>20 bounds [left, top, right-exclusive, bottom-exclusive] | Correction verified |
| --- | --- | --- | --- |
|P02_FIRE|1254×1254|[32, 15, 1060, 1224]|33px source-left transparent-canvas translation; no resampling/Y change|
|P03_FIRE|1254×1254|[10, 10, 995, 1216]|width1192/1254 X-only resampling then23px left translation; Y unchanged|
|NPC15_DRAW|1624×1624|[59, 200, 1404, 1375]|previous body-landmark normalization retained|
|NPC19_DRAW|1682×1682|[33, 190, 1378, 1446]|7px source-left translation; Y unchanged|
|NPC22_DRAW|1684×1684|[127, 164, 1396, 1450]|28px source-left translation; Y unchanged|

P02 crown/sole Y remains15/1224; P03 remains10/1216. NPC19/NPC22 Y bounds remain unchanged, with the previously accepted body/ground normalization. Source-facing direction, quiet muzzle, held-weapon count and identity are retained. No hat, boot, barrel, shadow/cosmic fragment, cape or horse was clipped at source canvas.

P03 cannot fit by translation alone: source max1071→996 needs−75px, which moves its min35 and muzzle39 outside the source canvas. The selected4.94% X-only containment preserves full body height/ground and all art. New exact affine muzzle sample39*(1192/1254)−23=14.0717703px; normalized x=.0112215074, y=.1722488038. The helper's rounded14px tip differs by less than.02source pixels and is harmless at actual display size. P02 muzzle is37/1254=.0295055821, y199/1254=.1586921850.

## Frozen helper/guard result

Independent math copied the existing standing-union fit, portrait8% size, outward placement and source flips without modifying them. Tested P02 and P03 against every NPC01–22, in READY/STEADY/actual-FIRE, with402pt viewport width and both12pt native and16pt capture original insets. Complete standing opaque extents were read from actual source alpha, including the tall P01/NPC01 faceoff contain convention and expanded NPC canvas padding. Total264combinations.

- No alpha>20 viewport clipping: **True**.
- All original actor guards retained: **True**. Native12pt inset maps to2pt outer actor guard;16pt capture inset maps to5.95pt.
- Minimum player left clearance: **2.1326pt**.
- Minimum NPC right clearance: **2.0001pt**.
- Minimum complete opaque silhouette gap: **19.9683pt**; no opaque overlap.

The results rely on the current locked alpha>20 convention. Soft low-alpha fringes and final visual VFX/shot behavior remain native1× checks. This source/math guard PASS does not certify the whole runtime, gameplay or defeat sequence.

The pre-containment native `P03-NPC15-before-containment.png` was independently viewed: the left boot/coat touched the viewport edge. Root must recapture after these corrections to confirm that visible defect is gone. NPC22 colored/white fine fringe caution also remains for normal native background inspection.
