# Cinematic landscape presentation pass — 2026-09-17

## User decision
Menus remain portrait. NPC and local duels lock to landscape. Existing gameplay rules and accepted V3 originals are preserved.

## Implemented
- Menu route portrait lock; duel focus awaits landscape lock alongside asset preloading before starting the engine. Game status bar hidden.
- NPC distant opponent framing, clean first-person weapon overlay, animated recoil and short separate muzzle flash.
- Shared bronze/leather buttons, restrained panel borders and menu backdrop shading.
- Local duel compact top-corner hearts, inward character placement, one landscape result heading, no overlapping score footer.

## Generated asset
- Built-in image generation, not CLI.
- Saved: `assets/images/weapons/cinematic/revolver-ready.png` (1254 × 1254 PNG, alpha channel present).
- Original V3 weapon assets retained. The new single image uses procedural recoil instead of switching to mismatched old firing artwork.
- Prompt: Generate a production game asset, not a mockup: a single first-person right hand holding a period western Colt-style revolver aimed AWAY FROM THE VIEWER toward a distant opponent at upper left. Cinematic premium hand-painted realistic game illustration matching the user's orange-sunset Western duel reference. NOT pixel art, no bright red/orange outline, no speckled transparency, no posterization. Dark worn leather glove and coat cuff, polished dark gunmetal barrel, very restrained amber reflected light. View from directly behind and slightly above the gun; show rear cylinder and foreshortened barrel, convincing first-person aiming perspective rather than a side-on gun product shot. Right forearm enters/crops cleanly at bottom-right canvas corner; muzzle located near (35% width,30% height), hand around (65%,65%). Keep all other edges contained, no cut off barrel. Square 1024 master with true transparent alpha background. No ground, no shadows outside subject, no smoke, no muzzle flash, no text, no UI, no background scenery. This will overlay a 2D game scene and be animated with recoil. Smooth clean opaque materials inside silhouette, physically coherent one hand, one revolver.

## Verification and limitations
- TypeScript passes; targeted lint has no errors (existing local matchType memo warning remains).
- iPhone simulator: actual NPC and local route entry rotates to landscape; menu returns to portrait; NPC no-input loss reaches result. Static capture route inspected for weapon framing.
- No Android device verification or physical two-player touch verification in this pass.
- NOT a completed full cinematic art replacement. Existing 256px NPC V3 sprites and legacy local-duel player sprites still differ from the illustrated reference. Full character pose replacement and identity QA remain, rather than claiming layout changes have repaired their underlying art.
