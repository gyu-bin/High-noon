# HIGH NOON — V3 NPC Duel Implementation

## Scope

NPC Duel is now a V3 first-person presentation. The existing duel engine,
READY → STEADY → BANG sequence, false-start handling, NPC AI/reaction timing,
rounds, hearts, progression, result route, audio, haptics, special ability
rules, and unlock requirements remain authoritative and unchanged.

Local Duel mechanics are untouched. NPC Duel now includes the missing
reference-style pre-duel confirmation screen, and the NPC result screen was
visually aligned without changing progression or result calculations.

## Presentation architecture

`NpcFirstPersonDuelArena` is a visual consumer of the existing engine state.
It owns no score, reaction time, outcome, or input-validity calculation.

The flow is now:

1. reference-style pre-duel character screen and explicit START action
2. existing special-ability intro when applicable
3. existing READY → STEADY → BANG engine sequence
4. round outcome overlay
5. existing next-round or final-result routing

Arena layer order:

1. V3 tier background
2. V3 NPC pose
3. special ability presentation VFX
4. minimal top HUD
5. reused runtime READY / STEADY / BANG cue
6. first-person revolver in the lower-right
7. separate muzzle flash/smoke and hit/fall VFX
8. existing round, pause, ability, revive, and result presentation

## Asset and pose mapping

- Background: the full-resolution cinematic Day/Night duel master is selected
  with the pre-existing match-level random choice. This replaces the visibly
  enlarged 768×432 validation background in gameplay while keeping the same
  sunset/night art direction.
- NPC: `IDLE`, `DRAW`, `FIRE`, `HIT`, and `DOWN` resolve from each NPC's
  approved production directory. The existing state maps to
  `waiting → IDLE`, `steady/fake → DRAW`, `bang → FIRE`, and
  `defeat → HIT → DOWN`.
- Player: the approved first-person revolver uses `IDLE → DRAW → FIRE` only
  after the engine accepts a player shot. The player full-body sprite is not
  rendered in NPC Duel.
- VFX: muzzle flash, smoke, bullet impact, fall dust, thunderbolt, red eye,
  and void crack are separate production assets.
- Round outcome: one restrained `YOU WIN` or `OUTDRAWN` title is shown. The
  earlier simultaneous player/NPC result badges were removed.

## Special presentation mapping

| NPC | Existing gameplay behavior | Presentation only |
| --- | --- | --- |
| 13 Mirror Jack | adaptive reaction | low-opacity reflected duplicate |
| 14 Thunderbolt | hidden BANG/fake timing | short lightning image flash |
| 15 Shadow Hunter | blindBang | darkened cue treatment |
| 16 / 17 / 18 | light / medium / heavy shake | visual-content-only shake; #18 red-eye accent |
| 19 Void Walker | invertedSignals | existing shroud plus brief void crack |
| 20 Echo Phantom | echoReady | runtime duplicate NPC render |
| 21 Undertaker | chaosRandom | reuses thunder, void, echo, or quake presentation |
| 22 Pale Rider | paleSilence | hidden background and restrained blackout |

## Safeguards

- The full-screen input `Pressable` sits outside the transformed visual tree.
  Screen shake therefore never moves the touch target.
- `onPressIn`, BANG arming, reaction timestamp, and NPC shot scheduling remain
  in `useDuelEngine`; animation completion is never used for timing.
- V3 presentation assets are preloaded before the duel begins: selected
  background, all five NPC poses, three revolver poses, and duel VFX.
- The Pale Rider's arena does not mount before the existing unlock state
  allows it. Before unlock, selection remains limited to its approved locked
  silhouette.
- New component timers have unmount cleanup. The existing early-tap overlay
  timer is now retained and cleared on unmount.
- Reduce Motion shortens weapon/fall/pale transitions and scales shake down to
  25 percent without changing the engine timing.

## Validation

- TypeScript: passed (`npx tsc --noEmit`).
- Lint: no errors. The remaining nine warnings predate this phase and are in
  existing local/NPC hooks, title, and unrelated components.
- Expo export: iOS and Android completed successfully; both include V3
  backgrounds, all production NPC poses, first-person revolver art, and VFX.
- Visual composition review: `qa/npc_duel_validation/npc_duel_v3_validation_board.png`
  includes READY, STEADY, BANG, player fire, NPC HIT/DOWN, required special
  encounters, and portrait/landscape framing using the actual production art.

## Runtime validation

The pre-duel screen, live duel, win/loss round overlay, and final NPC result
screen were reviewed in the running iPhone 17 simulator. A physical-device
matrix pass is still recommended for small/large Android devices and rotation.
The implementation does not change their state machines or routes.
