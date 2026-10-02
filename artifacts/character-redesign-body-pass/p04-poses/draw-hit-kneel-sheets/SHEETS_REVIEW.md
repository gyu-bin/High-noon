# P04 DRAW / HIT / KNEEL sheets (2026-10-01): not intaken

Input: 4 variant sheets, each 1×3 (DRAW | HIT | KNEEL). Lossless copies are in ~/Downloads as `ChatGPT 이미지 … 10_37_12-1 / 17-2 / 20-3 / 23-4.png`, about 2180×720 each.

## Blocking: resolution
Each figure is only ≈680–714 px tall (standing). The locked idle and FIRE are ≈1225 px, so matching them would need **≈1.75× upscale**, which is forbidden. Each pose must be a separate native 1254² PNG.

## Variant read (for picking the one to re-export)
| Sheet | DRAW | HIT | KNEEL |
| --- | --- | --- | --- |
| 1 | guns raised up/out; right leg mist ✓ | hand to chest, gun pointing image-right | good; guns lowered, mist leg |
| 2 | guns raised; **two solid boots ✗** | gun thrown image-left, other low; debris | good |
| 3 | guns raised; right leg mist ✓ | **best:** gun still held toward image-left, other hand to chest, recoil | good; mist leg ✓ |
| 4 | guns raised; mist ✓ | baked blue impact burst on the chest (extra effect) | good |

Recommendation: sheet 3 for all three poses.

DRAW note (all sheets): both guns point straight up, as a flourish. That works as a "raise" step between the low idle and the left-aimed FIRE. Angling the guns slightly toward image-left would read even more like one motion. Minor; not blocking.
Identity across all sheets: hat with star band, void face, scarf, duster, compass belt, empty holsters, 2 guns ✓.

---
# Sheet 5 (2026-10-01): content APPROVED, file not intaken
Lossless copy: ~/Downloads `ChatGPT 이미지 … 10_43_01.png`, 2172×724. The figures are ≈700 px tall, so it is still a sheet that would need ≈1.75× upscale.

- **DRAW:** both guns raised; image-right leg dissolves (no boot); star hat band; empty holsters ✓.
- **HIT:** gun still aimed image-left, other hand clutching the chest, recoil, both feet down; can RECOVER ✓.
- **KNEEL:** one knee down, both guns lowered toward the ground, mist leg, clearly different from HIT ✓.
- 2 guns in every pose ✓.

These three are the target designs. Only native single-pose 1254² PNGs are needed.

---
# Round (2026-10-01): DRAW single 1254 candidate + sheets 6–8
- **DRAW_single_candidate.webp:** a single pose, 1254² RGBA, but lossy WebP; no PNG export in ~/Downloads.
  - Content approved: both guns raised, mist leg, star hat band, empty holsters, 2 guns.
  - Scale: shoulder→ground ≈930 px vs FIRE ≈980 px, so the body is ≈5% smaller than FIRE. Within tolerance only if accepted without upscale (it would render ≈5% smaller).
- **Sheets 6–8** (2000×667): still multi-pose; HIT/KNEEL figures ≈650 px. Not usable as files. Sheet 8 adds a 4-pose row (DRAW/FIRE/HIT/KNEEL) with consistent identity.

---
# DRAW candidate 2 (2026-10-01)
1254² lossy WebP; no PNG in ~/Downloads. Content approved (raised guns, mist leg, star band, skull pins, empty holsters, 2 guns). Body ≈3–4% smaller than FIRE (shoulder→ground ≈945 vs ≈980), within tolerance. Blocked only by the file format.

---
# DRAW candidate 3: INTAKEN as intake/P04_DRAW.png (lossless ~/Downloads …11_02_20.png, 1254² RGBA; same image as attachment, diff 3.9 = WebP loss)

---
# HIT/KNEEL pairs 1–4 (2026-10-01): not intaken
2-pose sheets 1774×887 (PNG copies in ~/Downloads …11_11_27-1…38-4). The standing HIT figure is ≈860 px tall vs ≈1225 px for the idle, so it would need ≈1.4× upscale. Content OK in all 4 (HIT: aims image-left, hand on chest; KNEEL: one knee down, both guns lowered, mist leg). Best: pair 3 (clearest one-knee KNEEL, HIT stance closest to FIRE).

---
# HIT single candidate (2026-10-01)
Single pose, 1254² lossy WebP; no PNG in ~/Downloads (newest are the 11:11 pair sheets). Content approved: aims image-left, hand on chest, mist leg, star band, skull pins, holsters empty. **Weapon issue: only 1 revolver visible.** The chest hand is empty and the holsters are empty, so the second gun has vanished; DRAW/FIRE/KNEEL show 2. Fix: the chest hand still grips the second revolver (pointing down). The same issue exists in every HIT on the earlier sheets; it was missed in the earlier sheet reviews. Pair 5 = sheet again.

---
# HIT(2nd gun)/KNEEL pairs 1–4, 12:06 (2026-10-01): not intaken
Two-pose sheets 1774×887 (PNG copies in ~/Downloads …12_06_42-1…53-4); the HIT figure is ≈860 px, so it would need ≈1.4× upscale. **Weapon fix confirmed:** the chest hand now holds the 2nd revolver in all HIT variants (2 guns). Best: pair 3 (HIT: 2nd gun clearly in the chest hand; KNEEL: left knee down, image-right leg dissolves, 2 guns lowered). Pair 2 KNEEL has two solid boots (leg-dissolve lost).

---
# HIT 12:15 singles (2026-10-01): INTAKEN 12_15_19-4 as intake/P04_HIT.png
All 4 are lossless 1254² PNGs in ~/Downloads (matched to the attachments, diff ≈3). Chosen: -4. It has the narrowest hat brim of the 4 (closest to FIRE), the chest hand holds the 2nd gun, the image-right leg dissolves, and nothing touches the edge.
Notes: the hat brim is still ≈10–15% wider than FIRE, and the mist is a more saturated blue than FIRE (DRAW shares the HIT tone). Judge in the continuity sheets.
Script fix: build_p04_poses.py auto hat-width measurement breaks when a gun is raised near the hat (DRAW measured brim 46 px, HIT 325–430). It would have mis-scaled HIT by ≈0.7, so scale/x now come from manual anchors (MANUAL dict, downscale-only).
