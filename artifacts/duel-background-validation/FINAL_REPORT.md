# Approved duel backgrounds — integration and visual QA

2026-10-02 · dev-2.0

## Production files

- assets/images/backgrounds/duel_twilight_town.png
- assets/images/backgrounds/duel_dusty_canyon.png
- assets/images/backgrounds/duel_moonlit_frontier.png

All three are exactly 1920×1080 RGB opaque PNGs. Lanczos uniform upscale with
centred aspect correction (less than one source pixel of vertical crop).
No sharpening, new image generation, color reduction or baked black overlay.
Original 1672×941 candidates and all legacy game background files are retained.

## Integration

Equal-width thirds of Math.random select twilight/canyon/moonlit. NPC selects
at startMatch; Local selects at initialization/rematch; Ranked owns selection
per matchId. Round progression, pause and revive do not reroll the environment.
Fixed backgroundId is injectable into DEV captures only via the capture route.
All production duel modes consume the approved registry.

Removed static central dim and permanent vignette gradients for new backgrounds.
HUD backing, signal presentation, transient hit/defeat/special-ability treatment
remain unchanged. No scoring, reaction contract, character art or DB changes.

## Actual native capture evidence

iPhone 17 Pro Simulator, portrait, 1206×2622 native captures, Expo DEV build.
DEV route /capture/redesign-duel renders the real NpcFirstPersonDuelArena with
fixed IDLE/STEADY frame; it never submits or settles matches. P04 is shown as
the Ranked player-character opponent. This is renderer verification, not proof
of an online Ranked match or every pose/ability phase.

21 frames: three backgrounds × P04/NPC09/NPC15/NPC18/NPC19/NPC20/NPC22.
See captures/ for original PNGs; ALL_21_SIMULATOR_COMPARISON.png uses only these
native screenshots. GHOST_DARK_PALE_DETAIL.png gives a larger P04/NPC15/NPC22 view.

| Character | Twilight | Canyon | Moonlit | Observation |
| --- | --- | --- | --- | --- |
| P04 | readable | readable | readable | Blue spectral identity survives; Ranked actor baseline retained. |
| NPC09 | readable | readable | readable | Warm metal silhouette stands apart from ground. |
| NPC15 | readable | readable | readable with subtle edge loss | Core body/material contours readable; darkest peripheral wisps can blend with night mesas. |
| NPC18 | readable | readable | readable | Red cloak remains distinct, especially on cool scene. |
| NPC19 | readable | readable | readable | Hat/body and void accent discernible; no central bright disc. |
| NPC20 | readable | readable | readable | Pale echo contour separates from ground without adding overlay. |
| NPC22 | readable | readable | readable | Pale cloth retains detail; character is brightest focal object. |

No character-canvas clipping, HUD overlap or STEADY collision observed in these
21 fixed frames. The wide source is intentionally cover-cropped in portrait:
side buildings/lanterns and upper-right moon are mostly outside the phone view.
The central ground remains open. Twilight retains a visible warm horizon;
we did not further darken the approved art to force a different look.

## Verification

- TypeScript noEmit: PASS.
- Expo lint: PASS.
- Final iOS Expo export after preload fix: PASS, /private/tmp/high-noon-bg-ios-final-20261002.
- Final Android Expo export after preload fix: PASS, /private/tmp/high-noon-bg-android-final-20261002.
- Selection helper: six threshold cases, one RNG call each, equal bucket test
  of 3000 evenly-spaced inputs gives 1000/1000/1000. This verifies bucket mapping,
  not statistical behaviour of live match samples.
- Read-only code review: no round/pause reroll or scoring changes found.
- Cold-entry preload finding repaired: shared and Local/Ranked sprite preloads
  include approved backgrounds; Ranked waits before its initial READY timer.
- Optional all-platform export encountered a web static-render worklets error.
  Web is not certified by this task; native exports are checked separately.
- Legacy backgrounds preserved; no files deleted.

Scope complete after comparison-sheet handoff; no additional asset batch.
