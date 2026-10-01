# NPC18 candidates review

## c1 (2026-10-01): read as FIRE; NEEDS_REVISION
PNG: ~/Downloads/high-noon `…06_05_24.png` (1247×1261 non-square, same image, diff 1.5). Not intaken.
Compared directly with the locked idle:

| Element | Locked idle | c1 |
| --- | --- | --- |
| Hat | wide flat brim, rounded crown, **red eye on the crown band** | pointed crown, drooping brim, red sash band, **no eye on the hat** |
| Eyes | 2 eyes on the face + eyes on the scarf, hood and robes (≈6 visible) | a 4-eye cluster on the face only; one embroidered eye on the robe panel |
| Halo | thin ring, small spikes, round cross pendants | heavier ring, long spikes, rectangular talisman tags (similar language) |
| Belt | red-eye medallion + **empty tube holster** | red medallion ✓, **no holster visible** |
| Robes / talismans / beads / palette | ✓ | ✓ |
| Weapon | 1 | 1 ✓ |

- **Pose:** aimed image-left at shoulder height (brief: hip–chest).
- **Canvas:** halo spike at y=1, right robe 4 px from the edge. Non-square and touching the edge.

## c_77 → FIRE, c_76 → DRAW (2026-10-01): ACCEPTED
- **Files:** FIRE = ~/Downloads/high-noon `…06_09_27.png` (diff 1.8). DRAW = `…06_11_59.png` (diff 1.7). Both 1254² RGBA, no edge contact (top 11 px).
- **Fixed vs c1:** wide flat brim with a **red eye on the hat band**; red eyes spread down the hood/scarf plus eyes on the robes; the **empty tube holster** is back on the belt; square canvas with the halo inside.
- **Matches the idle:** spiked halo with cross pendants, talisman strips, red beads, red-eye belt medallion, black/crimson robes, 1 revolver ✓.
- **FIRE:** aimed image-left at shoulder height (brief: hip–chest; minor).
- **DRAW:** gun brought down to the hip, angled forward-down toward image-left, other hand at the chest. It reads as the transition from the raised idle gun to the aim.
- **Minor:** the hat crown is flatter/more cylindrical than the idle's rounded crown.

## c_78 (2026-10-01): read as HIT; NEEDS_REVISION (weapon continuity)
PNG ~/Downloads/high-noon `…06_16_07.png` (diff 1.6). 1254², no edge contact.
- **Identity:** ✓ same flat-brim hat with the band eye, halo, eye column, talismans, beads, medallion, empty holster, robes.
- **Pose:** reels back with a hand on the chest and both feet down; a good HIT body.
- **Weapon issue:** the revolver is **flying out of the open hand**. HIT is the non-final hit that RECOVERs to idle 440 ms later. Idle has the gun back in hand, so the gun would vanish and reappear. As FALL it is too upright. Fix: keep the revolver gripped in the outflung hand, off-aim.

## c_79 → HIT (2026-10-01): ACCEPTED → intake/NPC18_HIT.png
~/Downloads/high-noon `…06_18_41.png` (diff 1.9). 1254², bbox 15,5–1241,1223 (no contact; halo spike 5 px from the top).
- **Identity:** same as c_78 ✓.
- **Pose:** reels back, hand clutching the chest, both feet down.
- **Weapon:** the revolver is now **gripped** in the outflung hand, off-aim ✓, so it can RECOVER to idle.

## c_80 → KNEEL (2026-10-01): ACCEPTED → intake/NPC18_KNEEL.png
~/Downloads/high-noon `…06_21_09.png` (diff 1.4). Bbox 13,87–1237,1191: no contact.
- **Identity:** band eye, halo, eye column, talismans, beads, medallion, empty holster, robes ✓.
- **Pose:** one knee down, head bowed under the hat, robes pooling; the revolver is held with the barrel pointing at the ground ✓.
- **Drop:** the figure top is at y≈87 (halo) vs ≈11 standing, so the head/hat drops ≈200 px. Clearly lower than HIT, not enlarged ✓.
- **Minor:** the halo is not visibly tilted or dimmed.

## c_81 → FALL (2026-10-01): ACCEPTED → intake/NPC18_FALL.png
~/Downloads/high-noon `…06_23_03.png` (1388×1133 landscape single, diff 1.6). Bbox 84,47–1381,1110: right robe tip 6 px from the edge, no contact.
- **Identity:** ✓.
- **Pose:** toppling backward from the kneel, torso tipped low, halo askew behind the head, the revolver falling from the open hand (visible), talismans/robes trailing ✓. Not flat yet.
- **Note:** the body extends to the right of the image (head image-left, feet image-right). The script handles landscape sources. Check the body scale (rel) at anchors: the hat brim looks similar in size to the idle.
