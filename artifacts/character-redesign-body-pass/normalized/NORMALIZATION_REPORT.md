# HIGH NOON — PHASE 1 Identity Master normalization

2026-10-01 · `dev-2.0` · artifacts only. No production, runtime mapping, code, DB, pose or VFX changes.
Script: `../normalize_masters.py`. Transforms: `transforms.json`. Intake originals untouched.

## Method
- **Reference:** each character's own current production idle (`constants/clarityCharacterAssets.ts` → `assets/images/characters/clarity/<id>/idle.png`, 1254² RGBA).
- **Anchors:** read manually from 50px-grid views for both the production idle and the new master: HEAD_TOP, CHIN, both shoulders, BELT_CENTER, both feet, GROUND_Y. They are in `transforms.json`, with about ±7px reading precision. Cloaks, smoke, echoes, fragments, halos and the horse skull were excluded.
- **Scale** = production span ÷ new span, clamped to ≤1 (never upscaled).
  - chin→ground (torso + legs) for 6 characters.
  - belt→ground for NPC15, so the hunch is not scaled away.
- **Placement:** the new GROUND_Y goes to the production GROUND_Y, and the new belt-centre X goes to the production belt-centre X.
- **Allowed operations only:** uniform LANCZOS downscale, X/Y translation, symmetric transparent padding. No crop, warp or repaint.

## Canvas policy and the runtime consequence
After the bodies are re-centred, every cloak extends past the 1254 frame (the new designs place the body right of centre with the cloak trailing left). To avoid cropping, each canvas was expanded symmetrically to C = 1254 + 2·pad, with the production frame centred in it.
**All runtime surfaces use `contentFit="contain"` in a square box.** So:
- **Without a runtime change,** the bodies render 1254/C smaller: 13–27% smaller (see the `raw` rows in C/D).
- **To keep the production body size,** PHASE 2 must scale each character's render box by `RUNTIME_BOX_SCALE` (C/1254) around the same centre. The `comp` rows in C/D show that result.
This is a PHASE 2 code decision; nothing was changed now.

## Per character
| ID | RESULT | UNIFORM_SCALE | TRANSLATE_X / Y (frame) | CANVAS_SIZE | RUNTIME_BOX_SCALE | GROUND_Y (frame / canvas) | SMALL_SIZE_READ | MAIN_NOTE |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P04 | NORMALIZATION_PASS | 0.9844 | −88 / −12 | 1446² (pad 96) | 1.1531 | 1211 / 1307 | ghost PASS (comp 160) | ground = remaining physical left boot; the dissolved leg is not used |
| NPC15 | NORMALIZATION_PASS | 0.9704 (belt→ground) | −177 / −24 | 1622² (pad 184) | 1.2935 | 1185 / 1369 | shadow PASS on light, weak on dark (as before) | the hunch is preserved: head sits lower than the production head line; the cloak did not drive the scale |
| NPC19 | NORMALIZATION_PASS | 0.9930 | −207 / −27 | 1654² (pad 200) | 1.3190 | 1211 / 1411 | void PASS | all fragments inside (margin ≥7px) |
| NPC20 | NORMALIZATION_PASS | 1.0000 (wanted 1.0404, upscale refused) | −221 / −26 | 1712² (pad 229) | 1.3652 | 1214 / 1443 | echo PASS; main body readable | the lunge shortens chin→ground; the body is ≈2.5–4% smaller than its production counterpart (no upscale allowed) |
| NPC09 | NORMALIZATION_PASS | 0.9557 | −140 / +31 | 1548² (pad 147) | 1.2344 | 1221 / 1368 | golden skull PASS | the pauldron width is kept, so the boss mass stays the broadest |
| NPC18 | NORMALIZATION_PASS | 0.9969 | −219 / −27 | 1708² (pad 227) | 1.3620 | 1207 / 1434 | oracle/red eyes PASS | the halo and raised gun are fully inside; the earlier 3px top-edge contact is gone |
| NPC22 | NORMALIZATION_PASS | 1.0000 (wanted 1.0070, clamp negligible) | −186 / −14 | 1642² (pad 194) | 1.3094 | 1231 / 1425 | pale/death PASS | the belt sits lower than production's (longer torso), so the elongated identity is kept |

Output: `*_normalized.png`, lossless PNG, RGBA true alpha, minimum edge margin 7–8px.

## Visual checks (E_alignment_guide)
- **Heads:** no character's head is clearly too large or too small. The new hat crowns land within a few px of the production head lines, except NPC15 (intentionally lower, hunched) and NPC18 (the hat is lower; the halo goes above).
- **Belts:** belts land within about ±20px of the production belt line. NPC22 sits lower by design.
- **Feet:** all boots stand on the production ground line.
- **NPC09:** the boss mass is preserved. **NPC22:** the tall reading is preserved. **NPC20:** the main body is readable.
- **P04/NPC15:** the smoke and cloak did not drive the scale.
- **NPC18 / NPC19:** NPC18's halo is inside the canvas, and all of NPC19's fragments are inside the canvas.

## Summary
```
NORMALIZATION_PASS_COUNT=7
NEEDS_ADJUSTMENT_COUNT=0
PRODUCTION_HASH_CHECK=7/7 SAME (before and after)
PRODUCTION_CHANGED=NO
CODE_CHANGED=NO
DATABASE_CHANGED=NO
REVIEW_SHEETS=A_current_vs_normalized_{dark,light}, B_normalized_lineup_{dark,light}, C_select256_{dark,light} (comp + raw), D_duel_241_200_160_{dark,light} (comp + raw 160), E_alignment_guide, F_before_after
```

## Next steps (plan only, not started)
**PHASE 2 — Production IDLE / poster integration**
1. Decide the canvas handling:
   - (a) a per-character runtime box scale (C/1254) in `CharacterSprites` / `CharacterSelector` / `NpcPreDuelScreen` / `local-setup`, recommended so body sizes are kept.
   - (b) accept the 13–27% smaller render.
   Option (a) is a code change and needs approval.
2. Back up the current `clarity/<id>/idle.png` hashes for rollback, then replace the 7 idles with the normalized files.
3. NPC Select uses `identity_poster.png` (not idle): make new posters for NPC09/15/18/19/20/22 from the locked masters.
4. NPC22 also has `assets/images/hidden/pale_rider_locked_silhouette.png` (the hidden-unlock silhouette); regenerate it from the new NPC22.
5. draw/fire/hit/down still point at the old designs. Until PHASE 4 poses exist, a mixed old/new set will appear in duels. Decide whether to swap the idle only or hold the integration until poses are ready.

**PHASE 3 — NPC Select + Duel simulator QA**
- Capture each surface (player select for P04, NPC Wanted posters, pre-duel, duel at device sizes, dark and light).
- Check ground contact, the duel-corner flip, and the body size against neighbouring unchanged characters.
- Check the NPC15 dark-background readability and the NPC20 aim-pose width in the duel framing.
