# NPC15 candidates review

## c1 (2026-10-01): read as DRAW; NEEDS_REVISION (identity drift)
A PNG exists: ~/Downloads `…02_19_07.png` (1254², same image, diff 1.2). Not intaken.
Compared directly with the locked idle:

| Element | Locked idle | c1 |
| --- | --- | --- |
| Hat | flat-topped crown, wide drooping torn brim, round plate on band | **pointed witch-like crown**, compass plate |
| Shadow | dense black smoke tendrils swallow the whole left side and wrap the body | smoke only as thin wisps trailing right; left side fully visible → the "half swallowed by shadow" identity is weak |
| Palette | near-black soot | brown/tan torn cloak with light holes; much lighter |
| Cloak | heavy black layered cape | lighter tattered cape |
| Ornaments | skull/key chest pendant | compass medallions (hat, chest, knees, holster) |
| Posture | hunched forward ✓ | lunging, legs wide; hunch is partial |
| Weapons | 1 in hand + 1 holstered | 1 in hand + 1 holstered ✓ |
| Face | black with two pale eyes ✓ | ✓ |

Pose: the gun is low/raising toward image-left. As DRAW the motion is fine.

## c2 (2026-10-01): ACCEPTED as DRAW → intake/NPC15_DRAW.png
Lossless ~/Downloads `…02_23_29.png` (1254², same image, diff 1.1).
- **Identity fixed:** flat-topped crown with wide drooping torn brim; dense black smoke swallows the whole image-left side; near-black soot palette; skull/key chest pendant; black face with two pale eyes; hunched forward.
- **Weapons:** 1 in hand + 1 holstered ✓.
- **Pose:** the gun hand angles forward/down-left while the other hand grips the holstered gun's handle. It reads as a draw cue.
- **Minor:** the motion delta from IDLE is small (the gun stays low). FIRE carries the raise.
- **Edge:** smoke top reaches y=2 (no contact).

## fire_c1 (2026-10-01): ACCEPTED → intake/NPC15_FIRE.png
Lossless ~/Downloads `…05_46_04.png` (1254² RGBA, same image, diff 1.2). True alpha (38% zero). Bbox 24,7–1250,1235: no edge contact, right cloak 4 px from the edge.
- **Identity vs locked idle:** flat crown with wide drooping torn brim; black void face with two pale eyes; skull+key chest pendant; dense black smoke swallowing the image-left body; near-black soot palette; same belt, holster and spurs. No blue/purple/echo, no compass ✓.
- **Weapons:** 1 in hand aimed image-left; 1 holstered (grip visible) ✓.
- **Scale:** hat top 24 / boot 1233 vs idle 46 / 1246. Similar overall height; the crouch is lower and the hat higher. Fine-tuned at normalization with manual anchors.
- **Minor:** the aim is at shoulder height (brief: hip–chest), and there is a small grey smoke puff at the muzzle (not a flash). The runtime flash may sit slightly below the barrel; check at integration.

## hit_c1 (2026-10-01): ACCEPTED → intake/NPC15_HIT.png
Lossless ~/Downloads/high-noon `…05_48_58.png` (exports now land in this subfolder; same image, diff 1.4). Bbox 27,7–1246,1242: no edge contact.
- **Identity vs locked idle:** flat crown with drooping torn brim; void face with pale eyes; skull+key pendant; image-left smoke mass; soot palette; same belt, holster, spurs ✓. No blue/purple/echo/compass.
- **Pose:** jolted upright and back; head turned away; gun arm flung up off-aim (still held); the other hand clawed out; both feet down; smoke and cloth flecks burst from the impact. Reads as non-final HIT and can recover ✓.
- **Weapons:** 1 in hand + 1 holstered ✓.

## kneel_c1 (2026-10-01): ACCEPTED → intake/NPC15_KNEEL.png
Lossless ~/Downloads/high-noon `…05_54_12.png` (same image, diff 0.8). Bbox 12,256–1248,1202: no edge contact.
- **Identity vs locked idle:** flat crown with drooping torn brim; void face with pale eyes; skull+key pendant; image-left smoke mass; soot palette; same straps and spurs ✓.
- **Pose:** down on one knee, folded forward, head bowed; the gun hand sags with the barrel pointing at the ground (held, not aiming); the other forearm rests on the raised knee. The figure top is at y≈256 vs ≈12–46 standing, so the drop is clear (unlike NPC09's tall kneel) and the body was not enlarged ✓.
- **Weapons:** 1 in hand + 1 in the thigh holster ✓.

## fall_c1 (2026-10-01): ACCEPTED → intake/NPC15_FALL.png
Lossless ~/Downloads/high-noon `…05_56_51.png` (same image, diff 0.9). Bbox 30,287–1250,1177: no edge contact (right cloak tip 4 px).
- **Identity vs locked idle:** flat crown with torn brim; void face with pale eyes; skull+key pendant; soot palette; smoke mass; straps/spurs ✓.
- **Pose:** toppling backward from the kneel, torso tipping to the image left, low centre of mass, not yet flat; the revolver slipping out of the reaching hand (visible, falling at lower left); smoke and cloth flecks trailing ✓.
- **Weapons:** 1 falling + 1 holstered ✓.
- **Note:** the body leans toward image-left, so it falls *toward* the opponent's side. The arm pose suggests a backward fall; acceptable, judge in sheet C.
