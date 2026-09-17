# Character clarity replacement — 130 poses connected

Scope: all 4 players and 22 NPCs, five poses each (130 PNGs). Existing source art is preserved. Idle also serves as the full-body selection identity so the menu and duel do not use conflicting artwork.

Method: built-in image generation, one transparent image per call. Use the original identity as character reference, then the cleaned idle as the identity reference for subsequent poses. Save at native resolution, without 256px reduction, palette quantization or automatic sharpening.

Style prompt: clean high-resolution cinematic Western game illustration, readable leather/cloth forms, natural dark edges, subdued warm lighting. Preserve face, hat, scarf, coat, belt, boots, signature accessories, proportions and pose. Remove glowing orange/red contours and harsh pixel noise. Genuine square RGBA cutout, full-body margins, consistent anatomical scale and baseline. No background, ground shadow, text/UI, blood, smoke or baked muzzle flash. A drawn revolver must leave an empty holster.

Pose prompts: idle ready stance; draw with bent elbow and gun leaving holster; fire at belt height toward opponent; hit with clear torso recoil and soft knees; down with slumped torso and knee collapse, same head size/baseline with empty space above.

QA: inspect each output for identity, hand/gun anatomy, empty holster, edges, pose readability and alpha. Incomplete sets must not replace a complete gameplay set. This directory is NOT evidence that all 130 poses are complete.

Player 02: five poses visually inspected. First idle rejected for duplicate gun; first fire rejected for chest-high aim. Corrected versions retained. Gameplay/device visual validation pending.
Player 01: five poses visually inspected and registered. First fire rejected for high aim.
Player 03: five poses visually inspected and registered. Idle corrected to preserve face-covering bandana.
Player 04: five poses visually inspected and registered.

Final asset checkpoint (2026-09-18): all 4 players and 22 NPCs, 130/130 poses, visually reviewed and registered. No remaining production poses. All delivered PNGs retain native high resolution and genuine alpha. Original assets remain untouched. This is asset review completion, not device/gameplay sign-off.

Targeted corrections: NPC 06 fire, NPC 20 down and NPC 21 hit had duplicate gun remnants removed. NPC 13 idle/draw, NPC 19 idle/draw/fire, NPC 20 idle and NPC 22 idle/draw/fire received hat-edge or composition corrections. Idle corrections that inadvertently moved/removed the holstered gun were rejected and corrected again. Rejected candidates are preserved under rejected/ and are not referenced by the game registry. Very low-alpha fringe pixels in generation previews were distinguished from the opaque silhouette rather than aggressively thresholding the artwork.

Open contact-sheet.html to compare all 26 five-pose sets at equal canvas size and open full-resolution originals. The native image generation prompt set and pose instructions are documented above; no quantization, enlargement or sharpening filter was used as a substitute for detailed artwork.

Integration: clarityCharacterAssets.ts registers complete five-pose sets. v3UiAssets.ts, v3DuelAssets.ts and spriteAssets.ts select the new images; CharacterSelector and NpcPortrait use the same identities as the duel. Legacy shoot frames are bypassed for these characters to avoid mixing old and new art.

Runtime screenshots remain pending: the computer-use skill requires the Orca CLI, which is unavailable in this environment. Portrait-only settings are applied in Expo, route orientation locks, iOS Info.plist and Android manifest; native launch masks require a rebuilt app.
