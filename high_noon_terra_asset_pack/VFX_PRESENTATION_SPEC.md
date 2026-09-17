# HIGH NOON V3 Duel VFX Presentation Spec

## Audit

The existing NPC duel implementation already owns timing, false-start handling, signal hiding, screen shake, void shroud, echo timing, Pale Rider dimming and audio. This asset pass changes none of those rules.

## NPC presentation plan

- NPC 13 mirror: adaptive reaction timing remains gameplay-only. Use a brief runtime reflection accent; Reduce Motion uses opacity only.
- NPC 14 thunderbolt: hidden BANG plus existing fake timing. Use vfx_thunderbolt_lightning.png with a 90 to 140ms runtime illumination. Reduce Motion uses one opacity flash.
- NPC 15 blindBang: preserve the existing near-invisible BANG behavior. Runtime signal opacity or dim overlay only.
- NPC 16 screenShakeLight: preserve existing intensity 6. Visual layer translation only; Reduce Motion uses 25 percent amplitude.
- NPC 17 screenShakeMedium: preserve existing intensity 12. Visual layer translation only; Reduce Motion uses 25 percent amplitude.
- NPC 18 screenShakeHeavy: preserve existing intensity 20. vfx_red_eye_flash.png is an optional brief omen. Reduce Motion uses the eye cue and reduced shake.
- NPC 19 invertedSignals: preserve existing void shroud and signal logic. Use vfx_void_crack.png briefly at BANG; Reduce Motion uses static crack plus fade.
- NPC 20 echoReady: preserve existing three-BANG middle-true behavior. Runtime duplicate NPC render; optional vfx_echo_wave.svg. Reduce Motion uses one low-opacity wave.
- NPC 21 chaosRandom: reuse the selected void, thunder, echo or quake presentation. No Undertaker-specific VFX.
- NPC 22 paleSilence: preserve existing long wait and dim/blackout behavior. Runtime darkness/negative space only; no normal BANG according to existing rules.

## Shared VFX

- vfx_muzzle_flash.png: image, 40 to 70ms at barrel tip.
- vfx_gun_smoke.png: hybrid, runtime fade and slight upward drift.
- vfx_bullet_impact.png: image, short spark and dust only.
- vfx_fall_dust.png: hybrid, ground-aligned scale and fade during DOWN.
- Early tap and READY, STEADY, BANG remain runtime typography/presentation, not raster art.

## Safety

Apply effects only on a pointer-events-none presentation layer. Portrait top/bottom and landscape left/right touch regions must remain logically fixed. Use normalized anchors and retain existing audio.

## Development-only validation

- Board: output_v3_cinematic_pixel/qa/vfx_validation/vfx_contact_sheet.png
- Gameplay composites: output_v3_cinematic_pixel/qa/vfx_validation/
- These QA composites are not runtime assets.
