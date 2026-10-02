# Combat V3 NPC01 prototype integration

Date: 2026-09-30. Working branch: `dev-2.0` (preserved current checkout).
Scope: NPC01 approved final reaction and standalone Player Ground POV weapon.

## Changes

- Human-approved DOWN candidate 03 and locked FALL registered byte-identically.
- All three new sprite sources preloaded before combat to avoid first-use decode
  gaps during the short FALL stage.
- NPC non-final: HIT → STAGGER → RECOVER; final: HIT → STAGGER → KNEEL → FALL → DOWN.
- Player non-final: IMPACT → RECOVER; final: IMPACT → LOSE GRIP → COLLAPSE → GROUND POV → DEFEAT.
- Ground POV uses the approved gun alone, no rotated hand+gun placeholder.
  Visible alpha bottom is anchored 4% above the screen edge. Canvas width is
  92% of screen width; visible gun width is approximately 73%.
- Ranked non-final hit still recovers to idle. Ranked final retains the existing
  player kneel/down art, not NPC01's new prone sprite (no player batch expansion).
- NPC01 now uses the already-declared high-resolution Bronze day/night background
  instead of the older low-resolution source that bypassed this registry.
  No background was generated or edited. A small dark ROUND HUD backing improves
  contrast against the moon; other gameplay/result logic is unchanged.

## Simulator comparison and decision

iPhone 17 Pro, iOS 27, Expo Go. Native captures: 1206×2622.
`scale-comparison.png`: left to right 1.20 / 1.25 / 1.30.

FINAL_NPC_SCALE=1.30
FINAL_NPC_Y=0.76 × arena height (foot anchor; not sprite centre)

1.20 has the weakest presence; 1.25 is usable; 1.30 provides the clearest outfit
and silhouette without overlapping the cue/HUD. The original 0.58-height foot
anchor placed the figure against the sky. At 0.76, boots and final pose contact
read against the street. The moon remains in the upper region and the NPC in the
lower region. READY / STEADY / BANG occupy a separate band above the character.
The round number has its own dark backing so the moon does not erase contrast.

Pose transitions use one box/scale and common contact line, not per-pose resizing
or rotation of the final sprite. Recorded KNEEL → FALL → DOWN shows the intended
change in silhouette without an additional scale pop or lateral teleport.
Ground weapon reads as a close foreground object below the opponent; no hand
remains in Ground POV/Defeat. The source's approved perspective is unchanged.

## Six native renderer replays

| Scenario | Observed result | Recording |
| --- | --- | --- |
| A NPC non-final | Hit/stagger then standing recover, one heart left | npc-nonfinal.mp4 |
| B NPC final | Kneel/fall/prone down, zero hearts | npc-final.mp4 |
| C Player non-final | Brief impact and recovery, no ground gun | player-nonfinal.mp4 |
| D Player final | Lose grip/camera collapse/standalone ground gun/defeat shade | player-final.mp4 |
| E Ranked non-final | Opponent recovers to idle, one heart left | ranked-nonfinal.mp4 |
| F Ranked final | Existing player kneel/down persists, zero hearts | ranked-final.mp4 |

These are real native Simulator renders using the production renderer, reaction
timers and fixture results in a development-only offline replay route. They are
NOT live played matches or server settlement E2E. No rating, profile, ghost or
remote data was written. Static `at` captures freeze the arena stage, but Ranked's
sprite has its own reaction clock; its timing is supported by the video, not by
the static frame's timestamp alone. The route redirects away in release builds.

## Verification

- Combat reaction regression: 8/8 PASS.
- Local Duel engine regression: 11/11 PASS.
- Ranking submission regression: 28/28 PASS.
- TypeScript `tsc --noEmit`: PASS.
- Expo lint: PASS.
- iOS and Android production bundle exports: PASS (Hermes).
- Code reviewer: no blocking finding; preload gap corrected.
- `git diff --check`: PASS.
- Approved review/production asset SHA-256 pairs: identical.

Bundle exports are not native App Store builds. Android device runtime, real
server-backed ranking match and Local Duel Simulator gameplay E2E are not
claimed; Local/Ranking regressions above are automated tests.

## Stop boundary

No NPC02–22 generation, no Player01–04 FALL/DOWN batch, no identity redesign,
no server migration/deployment. STOP at the NPC01 prototype.
