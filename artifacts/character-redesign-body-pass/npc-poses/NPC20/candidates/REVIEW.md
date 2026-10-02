# NPC20 candidates review (reference = reference/NPC20_ECHO_PHANTOM_MIRRORED.png)

## c_91 (2026-10-01): this is the reference itself
Opaque diff 4.5 and alpha agree 100% vs the mirrored reference. Not a new pose.

## c_90 (2026-10-01): read as DRAW; NEEDS_REVISION (weapon continuity)
PNG ~/Downloads/high-noon `…07_47_53.png` (1254², opaque diff 3.8). Bbox 16,72–1248,1233: no edge contact. Not intaken.
- **Identity:** ✓ tall dark hat with gold star badge, pale hair, masked face with pale eyes, quilted tattered duster with star pins, bullet belt, tube holsters, star spurs.
- **Echoes:** 2 pale blue-grey echoes trailing image-right, fainter than the main body ✓. No forbidden motifs.
- **Weapon:** 1 revolver held low in the image-left hand, plus the other hand **pulling the second revolver out of a holster**. The reference/idle has both guns already in hand and the holster empty, so IDLE→DRAW would put a gun back in a holster.
- **Fix:** both revolvers stay in hand; the aim hand rises from low toward image-left, elbow bent; holsters empty.
- **Note:** an unattached export `…07_24_11.png` is also in the folder; it was not reviewed.

## c_92 → DRAW (2026-10-01): ACCEPTED → intake/NPC20_DRAW.png
~/Downloads/high-noon `…07_50_44.png` (1254², opaque diff 3.5, alpha agree 100%). Bbox 11,46–1243,1222: no contact.
- **Identity:** ✓ hat with gold star badge, pale hair, masked face with pale eyes, quilted duster with star pins, bullet belt with compass buckle, star spurs.
- **Echoes:** 2 pale echoes trailing image-right, fainter than the main body ✓.
- **Weapon:** both revolvers in hand (one raised toward image-left, one low); **both tube holsters empty** ✓ (fixed).
- **Minor:** the aim arm is almost fully extended and slightly raised, which is close to a FIRE aim. FIRE should differ clearly: forward lunge as in the reference, level at hip–chest height, recoil.

## c_93 → FIRE (2026-10-01): ACCEPTED → intake/NPC20_FIRE.png
~/Downloads/high-noon `…07_56_26.png` (1254², opaque diff 2.3, alpha agree 100%). Bbox 20,89–1238,1216: no contact.
- **Identity:** ✓ same as DRAW.
- **Pose:** forward lunge, aim arm fully extended and level toward image-left (≈chest/shoulder height), small muzzle spark. Clearly lower and longer than DRAW's upright stance ✓.
- **Weapon:** both revolvers in hand; 2 tube holsters empty ✓.
- **Echoes:** 3–4 stacked hat/cloak echoes behind (image-right), fainter than the main body. This is a denser echo mass than the reference (2) and DRAW (2). Acceptable for the shot frame; watch the runtime afterimage doubling at integration.

## c_94 (2026-10-01): read as HIT; NEEDS_REVISION (blood)
Not intaken.
- **Identity:** ✓.
- **Pose:** ✓ jolted back, head snapping away, both feet down, both revolvers still gripped off-aim, holsters empty. Echoes: 3 behind, fainter than the main body.
- **Issue:** a **dark red blood splatter** at the image-right shoulder with flying red-brown flecks. Blood/gore is forbidden in every brief.
- **Fix:** replace it with torn cloth scraps and pale echo wisps only. No red.

## c_95 → HIT (2026-10-01): ACCEPTED → intake/NPC20_HIT.png
Blood removed: the impact is now only dark cloth scraps and pale echo wisps ✓.
- **Identity:** ✓.
- **Pose:** jolted back, head away, both feet down.
- **Weapon:** both revolvers gripped off-aim; 2 holsters empty ✓.
- **Echoes:** 3 behind (image-right), fainter than the main body.

## c_96 → KNEEL (2026-10-01): ACCEPTED → intake/NPC20_KNEEL.png
- **Identity:** ✓.
- **Pose:** one knee down, body folded forward, head bowed.
- **Weapon:** both revolvers held with the barrels pointing at the ground; holster empty ✓.
- **Echoes:** 2 behind (image-right), fainter than the main body ✓. No blood.
- **Scale note:** the kneeling figure looks **enlarged** (hat, boots and guns visibly bigger than in DRAW/FIRE). Set `rel` < 1 at anchors (downscale-only) so it sits lower than HIT.

## c_97 → FALL (2026-10-01): ACCEPTED → intake/NPC20_FALL.png
- **Identity:** ✓.
- **Pose:** toppling backward, torso tipped, legs kicking up, not yet flat.
- **Weapon:** both revolvers out of the open hands and falling (2 visible); holster empty ✓.
- **Echoes:** 2 behind (image-right), fainter than the main body ✓. No blood.
- **Scale note:** the figure looks enlarged, like KNEEL (large hat/boots). Set `rel` at anchors.
