# P04 FIRE candidate review (2026-10-01): not intaken

Input: one attachment, 1125×1125 lossy WebP. No matching lossless PNG was found in ~/Downloads.
Read as FIRE: both revolvers extended at shoulder height, aimed image-left.

## Improvements over the 2×2 sheet
- Both guns aim image-left, the single-opponent direction ✓.
- No baked muzzle blast ✓.
- Same hat (tall crown, spiked band, tattered brim), blue-cracked void face, scarf, tattered duster, compass belt buckle ✓.
- Weapons: 2 in hand, holster tubes empty, total 2 ✓.
- Torso turned into the shot, wide braced stance: a believable FIRE.

## Blocking
1. **Format/resolution:** a lossy WebP at 1125², not a 1254² lossless PNG.
2. **Body scale drift:** at the same pixel scale the hat brim matches the idle (≈350 vs ≈360 px), but the body is ≈15–20% smaller. Shoulder→belt is ≈250 px vs ≈300 px in the idle, and hat→boot is ≈1030 px vs ≈1240 px. Matching the idle body would need upscaling (forbidden). Matching the hat instead leaves a big-hat/small-body proportion change.
3. **Spectral leg:** in the locked idle, the image-right leg dissolves into mist below the knee (no boot). Here both boots are solid; mist only wraps the image-left shin.

## For the regeneration
Lossless 1254² PNG, with the locked idle attached as the reference. Body as large in the frame as the reference (hat top ≈ y20, boots ≈ y1240). Image-right leg dissolving into mist below the knee with no boot. Keep this pose and gun direction.

---
# Candidate 2 (2026-10-01): not intaken

Input: 1125×1125 lossy WebP; there is no PNG in ~/Downloads. Alpha bbox (3, 2, 1120, 1118): the mist sits 2–3 px from the edges.

## Fixed from candidate 1
- **Spectral leg:** the image-right leg now dissolves into blue mist with no boot, matching the idle ✓.
- **Body scale:** relative to the canvas it now matches the idle. Hat→boot ≈ 1100/1125 vs 1220/1254. The remaining gap is only the smaller canvas.
- Guns aim image-left, no muzzle blast, 2 guns, empty holster ✓.

## Remaining
1. **Format:** lossy 1125² WebP. Matching the idle body would need ×1.11 upscale (forbidden). This needs a native 1254² lossless PNG.
2. **Hat drift (minor):** compared at the same body scale, the hat brim is ≈15% wider and the crown taller. The band ornament also differs: a compass wheel with spikes, where the idle has small star rosettes. The shoulder ornaments are compass charms instead of the idle's skull/cross pins.

---
# Candidate 3 (2026-10-01): ACCEPTED into intake as `p04-poses/intake/P04_FIRE.png`

- **Source file:** lossless `~/Downloads/ChatGPT 이미지 2026년 10월 1일 오전 10_23_04.png`, 1254² RGBA (same image as the attachment; mean diff 3.8 is WebP loss). The original export is kept next to it.
- **File checks:** true alpha, no edge contact (bbox 13,10–1248,1247), no red/orange rim.
- **Scale vs the locked idle** (same 1254 canvas): hat top 16 vs 19, ground 1246 vs 1244, solid hat-brim width 225 vs 229 (ratio 1.02, inside the 3% tolerance). It will get **the same transform as the idle** (0.9844), with no correction.
- **Identity:**
  - star-rosette hat band restored; skull pin on the shoulder;
  - void face with blue cracks;
  - image-right leg dissolves with no boot;
  - 2 guns aimed image-left, holster empty, no muzzle blast.
- **Remaining minor:** one small spike on the hat crown; the belt sits ≈60 px lower than in the idle because of the braced stance (pose-driven, acceptable).
- **Normalization/staging:** waits until all 4 poses are in (the script requires the full set).
