# High Noon — V2 high-quality pixel validation report

## Scope

- Branch: `feat/animated-splash-branding`
- Phase: 2 high-quality pixel validation only
- Existing V1 files are retained as cinematic composition references and are not overwritten. The prior strict-NES V2 validation assets remain in `output_v2_nes/` and are not production-approved.
- Game code and existing audio are out of scope.

## Generated

- Pending high-quality revalidation generation.

## Regenerated

- Player 01 and NPC #1 transparent sprites — initial palette conversion displayed a chroma background. It was removed with alpha keying and rechecked for non-opaque pixels.

## Failed

- None. No rejected image was written to the V2 output root.

## Automated checks

- Dimensions: pass for all four validation assets.
- Alpha: player/NPC have alpha range 0–255; backgrounds are opaque plates.
- Palette: each pre-alpha source used a 16-color palette; backgrounds remain 16-color indexed PNGs. Sprite alpha conversion preserves the restricted source colors.
- Resampling: nearest-neighbor only; no bilinear or bicubic pass.
- Baked text/UI: none observed.

## Needs human review

- Bronze day/night: gameplay readability, composition crop safety, and whether the building detail is sufficiently NES-like.
- Player 01: idle silhouette width and visual readability at actual game scale.
- NPC #1: poncho/bandana readability, color separation from Bronze background, and alpha edge quality on-device.
- The source model's pixel blocks were normalized by nearest-neighbor + 16-color conversion, but a human should decide whether the resulting pixel scale is the desired final production style before Phase 4–12.
