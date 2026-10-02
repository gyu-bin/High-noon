# NPC09 candidates review

## fire_candidate1.webp (2026-10-01): REJECT (identity drift)
1133×1388 lossy WebP, no PNG in ~/Downloads. Read as FIRE: one gun aimed image-left at shoulder height, the other held low.
Compared directly against the locked idle (P04 lesson):

| Element | Locked idle | Candidate |
| --- | --- | --- |
| Hat | wide stiff brim, gold skull band | taller crown, torn ragged brim, bullet band + compass star |
| Skull | dark eye sockets | **glowing red/orange eyes** (forbidden: NPC18 motif) |
| Chest | gold ribcage | ribcage + **new bullet bandolier** across chest and shoulder |
| Cape | black with worn-gold edging/lace | ragged black with **dark red lining** |
| Pauldrons | large ornate skull pauldrons with spikes | smaller skull pauldrons |
| Belt / holsters / knee skulls | skull buckle, tube holsters | similar ✓ |
| Weapons | 2 in hand, holsters empty | 2 in hand, holsters empty ✓ |

The pose also aims only one gun, at shoulder height. The brief asks for both guns aimed image-left at hip–chest height (runtime flash anchor).

## fire_candidate2.webp (2026-10-01): NEEDS_MINOR_REVISION (hat) + PNG needed
1133×1388 lossy WebP; no PNG in ~/Downloads.
- **Fixed:** dark eye sockets (no glow); no bandolier; large spiked skull pauldrons are back; both revolvers aimed image-left at chest height; holsters empty; 2 guns. The red cape lining is almost gone (a faint hint at the hem).
- **Remaining hat drift:** taller crown, and a **torn, ragged brim** with a row of gold skulls. The idle has a smooth wide stiff brim. The hat is a locked element and changes the silhouette at duel size.

## fire_candidate3 (2026-10-01): NEEDS_REVISION (hat overcorrected, coat detail lost)
A lossless PNG exists: ~/Downloads `…01_05_20.png` (1254² RGBA, same image). Not intaken.
- **Hat:** now a flat-topped gambler hat with a flat disc brim and a row of 5 skulls. The idle is a cowboy hat with a pinched crown, an up-swept curled brim and a single ornate gold skull badge.
- **Coat:** the idle coat/pauldrons are covered in gold filigree/etching and the waist bullet belt has rows of rounds. The candidate coat is plain black with gold-dusted edges, and the pauldrons are simplified. The idle's hair strands are missing.
- **OK:** dark eye sockets, gold ribcage, spiked skull pauldrons, skull buckle, tube holsters empty, knee skulls, both guns aimed image-left at chest height, 2 guns.
- **Recommendation:** use ChatGPT *image edit* on the idle itself ("edit this image: same character, change only the pose to …") instead of fresh generation, so the costume detail is preserved.

## fire_candidate4 (2026-10-01): ACCEPTED → intake/NPC09_FIRE.png
Lossless ~/Downloads `…01_18_45.png`, 1254² RGBA (same image, diff 2.0).
Matches the idle:
- cowboy hat with pinched crown and curled brim, single gold skull badge;
- pale hair strands; dark eye sockets; gold ribcage;
- spiked skull pauldrons with filigree; gold filigree on the coat edges;
- skull buckle + bullet belt; empty tube holsters; knee skulls; spurs.

Both guns are aimed image-left at chest height (2 guns).
Minor: the coat filigree is a lighter lace pattern than the idle's dense etching, and the hat crown is a little taller. Acceptable.
Bbox top 6 px / bottom 4 px from the edge: tight, but nothing touches.

## sheet_7poses (2026-10-01): not intaken (contact sheet)
1536×1024 sheet with 7 labelled figures (PNG copy ~/Downloads `…01_24_18.png`). Each figure is ≈450 px tall vs ≈1240 px for the idle, so it would need ≈2.8× upscale. It also has text labels and is a sheet; both are forbidden.
Content review (design target for the single-pose requests):
- **Identity:** consistent with the idle (hat badge, hair, filigree coat, ribcage, spiked pauldrons, knee skulls).
- **DRAW:** one gun raised high, the other still in the holster? (the right hand is near the hip). Should be 2 in hand rising toward image-left.
- **HIT:** good. Recoils, one hand thrown up, gun still held in the other; the second gun appears holstered → needs 2 in hand, or both visible.
- **KNEEL:** ⚠ still **aiming a gun** while kneeling. It reads as "kneeling shot", not defeat. Both guns must be lowered.
- **FALL:** good: tipping backward, guns slipping.
- **DOWN:** good: lying flat, guns on the ground.
- **IDLE in the sheet** is a redraw; the locked idle stays the source.

## Singles HIT / KNEEL / FALL / DOWN (2026-10-01): content APPROVED, PNG not yet available
Attachments are 1254² lossy WebP (single_56…59). No matching PNG exists in ~/Downloads (the newest PNG is the 01:24 sheet).
- **56 HIT:** recoils back, both guns still held (one thrown up, one out to the side), holsters empty ✓. Identity ✓ (hat badge, hair, filigree, ribs, spiked pauldrons, knee skulls).
- **57 KNEEL:** one knee down, head bowed, **both guns lowered toward the ground, not aiming** ✓. The fix from the sheet is applied.
- **58 FALL:** tipping backward mid-air, both guns flying from the hands ✓ (2 visible).
- **59 DOWN:** lying flat, both guns on the ground ✓.
All four show 2 guns and consistent identity. Only the PNG downloads are needed. DRAW is still missing.

## single_60 DRAW (2026-10-01): NEEDS_MINOR_REVISION
1254² WebP, no PNG in ~/Downloads.
- **Identity:** OK.
- **Weapons:** 2 in hand, rising toward image-left; holsters empty ✓.
- **Issues:**
  1. The guns are fully extended at head height. That is already a FIRE-like aim, almost identical to FIRE, so DRAW→FIRE has no visible motion. It should be mid-raise: elbows bent, guns at belt-to-chest height.
  2. The hair and cloak touch the left/right canvas edges (bbox x 0…1253), so the image is clipped.

## single_61 DRAW 2 (2026-10-01): content APPROVED, PNG needed
- **Pose:** mid-raise; elbows bent, both guns at chest height angled up toward image-left, not fully extended. Clearly between idle and FIRE ✓.
- **Margin:** 43 px on every side ✓.
- **Identity and weapons:** identity ✓; 2 guns, holsters empty ✓.
