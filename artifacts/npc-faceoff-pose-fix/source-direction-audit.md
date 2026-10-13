# Existing source direction audit

Read-only source-image inspection. This does not certify runtime behavior. No source pixels or production files changed. Existing current clarity/redesign identities remain the baseline. Old clarity and 256 px legacy images were inspected but are ineligible rollback identities.

P01 and NPC01 existing faceoff cutouts are transparent RGBA, not background cards. They have coherent body/head/gun axes and clean barrels, and may be reused unflipped for READY, STEADY and actual-shot presentation with runtime VFX only at firing. P01 muzzle is near abdomen height; NPC01 barrel pitches slightly down-left, still toward the opponent abdomen at this layout. Metadata uses a tall 1024×1536 image contained in a square frame, with 256 source-equivalent pixels of horizontal padding on each side. Muzzle samples are visual estimates within 2 source pixels; sole bottoms and alpha bounds are measured at alpha >20.

| ID | READY source/flip | STEADY source/flip | Clean aim and strict-facing assessment |
| --- | --- | --- | --- |
| P01 | existing faceoff / no | existing faceoff / no | Coherent inward body/head/barrel. Source PASS; runtime pending. |
| P02 | 02-v2 draw / no | 02-v2 fire / yes | Clean torso aim, but head and body face away after barrel flip. NEEDS_ADJUSTMENT. |
| P03 | 03 draw / no | 03 fire / yes | Clean waist aim, but head/body face away after barrel flip. NEEDS_ADJUSTMENT. |
| P04 | 04-v2 draw / no | 04-v2 fire / yes | Clean torso aim and body/arm twist follows barrels. Featureless face remains front/down; strict directional gaze cannot be certified. NEEDS_ADJUSTMENT. |
| NPC01 | existing faceoff / no | existing faceoff / no | Coherent inward body/head/barrel. Source PASS; runtime pending. |
| NPC09 | 09-v2 draw / no | 09-v2 fire / no | Clean left dual torso aim. Skull/eyes remain front or three-quarter; strict gaze cannot be certified. NEEDS_ADJUSTMENT. |
| NPC15 | 15-v2 draw / yes | 15-v2 draw / yes | Draw points down; FIRE includes painted muzzle smoke and cannot be used as clean hold. NEEDS_ADJUSTMENT. |
| NPC18 | 18-v2 draw / yes | 18-v2 fire / no | Clean horizontal left torso aim; patterned face is front/ambiguous. NEEDS_ADJUSTMENT. |
| NPC19 | 19-v2 draw / no | 19-v2 draw / no | Draw points down; FIRE contains painted flash. Single front-facing eye gives no coherent left gaze. NEEDS_ADJUSTMENT. |
| NPC20 | 20-v2 draw / no | 20-v2 draw / no | Clean horizontal left torso aim with left-turn head/body. Existing echoes remain identity art. Source PASS; runtime pending. FIRE includes painted flash. |
| NPC22 | 22-v2 draw / no | 22-v2 draw / no | Draw gun points upward; FIRE includes painted flash. Masked face remains ambiguous. NEEDS_ADJUSTMENT. |

The table describes best available clean presentation choices, not a claim that every row satisfies the stricter rule. Mirroring changes all source axes together; it cannot repair a barrel/head disagreement or remove baked shot VFX. Ordinary P01/P02/P03/NPC01 production clarity FIRE has source-left barrel with source-right face/body. P01/NPC01 have eligible existing faceoff alternatives; P02/P03 do not have a current-identity clean coherent substitute. Legacy P03 fire is coherent but 256 px orange-rim style; legacy P02 and old clarity FIRE still disagree and are not eligible.

Defeat: current clarity down is KNEEL. All seven audited NPCs have dedicated FALL and final DOWN registered in NPC_COMBAT_POSES and visually consistent with their current identity. NPC01 FALL is hands-to-ground collapse; final DOWN lies prone. Redesign FALL frames show downward collapse and dedicated DOWN lies on ground. Player P01–P04 only have current production kneel/down frames, without registered dedicated full prone FALL/DOWN; preserve the supported kneeling terminal pose and do not fabricate a player prone sequence.
