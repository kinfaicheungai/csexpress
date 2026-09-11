# Colt Super Express — New Model Handoff

## Project location

Absolute local path:

`/Users/keenflycheung/Documents/ChatGPT/Game Develop/Colt Super Express`

Authoritative rules specification:

`/Users/keenflycheung/Documents/ChatGPT/Game Develop/Colt Super Express/Colt_Super_Express_Offline_Mobile_Rules_v1.0.md`

Current app version: **v0.8.4**

New visual release: see `VALIDATION_v0.7.md` for evidence, including the v0.8.0 character-readability and animation pass. Baseline v0.6.1 source files are in `work/baseline-v0.6.1`. The rules engine and CPU decisions were not changed in v0.7.0 or v0.8.0.

The rules document is authoritative except for the explicit user-approved Horse override described below. Do not invent ambiguous rules; surface them for confirmation.

## Original scope

Milestone 1 only: a deterministic rules engine plus a simple playable prototype. The project later received presentation, local CPU, animation, sound, character-card and offline/mobile improvements, but it remains a local single-player prototype rather than an online multiplayer game.

## Current playable product

- One human player against a selectable number of local CPU players.
- CPU programs remain hidden while the human chooses three unique actions.
- CPU decisions run locally and do not call an online AI service, so play can work offline after the PWA assets have been cached once.
- Six actions: Flip, Move, Change Floor, Fire, Reflex and Horse.
- Six selectable illustrated characters, each with art for all six actions.
- Train, cowboy, bullet, hit, riding and detached-caboose presentation animations.
- Synthesized local sound effects for shooting, impact, movement/climbing, Horse and caboose detachment. Safari may require a user tap before audio is permitted; Chrome has been confirmed to play sound.
- Random first-player draw: the selected first player begins in the rearmost occupied wagon and acts first. The human is not always first.
- Eliminated players are skipped by the resolution cursor; this fixed a prior game-stalling bug.
- When the human is eliminated, the game immediately shows defeat and no longer asks the human to choose another program.
- The caboose is removed after each round; occupants are eliminated and its Loot is awarded to the closest eligible surviving player toward the rear, subject to the unresolved same-position tie rule.
- Action log displays the newest event at the top while retaining each event's original ascending sequence number.
- Fire targeting and bullet travel follow the shooter's facing/gun direction. A missed bullet exits the train in that direction.
- Fallen characters stay in the same inside/roof lane and retain their scale, rotating without shrinking.
- Horse may be used from any non-eliminated state, including stunned or off-train-pending, and carries the player to the locomotive inside facing front. This is an explicit user-approved override of the source specification.
- Mobile PWA support: manifest, icons, service worker, install help and offline asset cache.
- v0.6.1 mobile camera: portrait carriages are moderately reduced; before an action the view centres on the acting player; Fire follows the bullet toward its target/exit; Horse follows the rider toward the locomotive. Manual horizontal swiping remains possible.

## Important orientation convention

The locomotive/front is rendered on the **left**.

- FRONT = left (`←`)
- REAR = right (`→`)
- Character facing, gun direction, bullet direction and knockback must remain consistent with this convention.

## Rule ambiguities still requiring user confirmation

1. Initial facing allocation: the rules give a facing count but not an unambiguous player/seat mapping. Setup currently asks for each player's facing.
2. Change Floor ordering: the tabletop wording does not precisely define insertion order in the destination lane. The current implementation appends the bandit as a temporary policy.
3. Loot tie when survivors occupy the same section and the same floor: the app asks the user to select a temporary recipient.
4. Victory tie after comparing highest individual Loot value: the engine reports joint winners because no further tie-break is specified.
5. No-survivor outcome: the engine ends with no winner because the specification gives no winner rule.

## Key source files

- `index.html` — page structure, setup/action/install dialogs.
- `styles.css` — desktop/mobile layout, train/cowboy/bullet/riding presentation.
- `src/engine.js` — authoritative deterministic game state and rules resolution.
- `src/ai.js` — local CPU decision-making; must not read the human's hidden programmed actions.
- `src/app.js` — UI rendering, input, animation and mobile camera following.
- `src/presentation.js` — shot endpoint/direction presentation helpers.
- `src/sound.js` — locally synthesized sound effects.
- `src/version.js` — displayed app version.
- `sw.js` — offline cache; its cache version must be bumped with releases.
- `manifest.webmanifest` — installable PWA metadata.
- `assets/character-action-atlas-v2-transparent.png` — current character/action artwork.
- `test/` — deterministic engine, AI secrecy, presentation, PWA and version tests.

## Local run and test

From the project directory:

```sh
npm test
npm start
```

Then open:

`http://localhost:4173`

If the terminal/server closes, localhost stops working. The deployed GitHub Pages version does not require the local terminal.

At the last verified run, all **45 tests passed**, including 50 seeded full games.

## GitHub Pages deployment

The app is a static PWA and is deployed from the repository's `main` branch and root folder. The essential public files are:

- `index.html`
- `styles.css`
- `manifest.webmanifest`
- `sw.js`
- entire `src/` directory
- `assets/icon-192.png`
- `assets/icon-512.png`
- `assets/character-action-atlas-v2-transparent.png`

After an update, upload the modified files and commit them. When making a release, keep these three values aligned:

- `src/version.js`
- `package.json`
- cache name at the top of `sw.js`

To receive a new PWA version on a phone: open the deployed site online, refresh, fully close it, and reopen. Confirm the version shown under the title before testing offline.

## Recommended new-model test focus

1. Use a narrow iPhone-sized viewport and verify that the acting player is centred before every animated action.
2. Test Fire facing both FRONT/left and REAR/right, with a nearby target, distant target and no target. Confirm the camera and bullet move in the gun direction.
3. Test Horse from standing, stunned and off-train-pending positions near the rear. Confirm the rider is visible and the camera travels to the locomotive.
4. Verify manual horizontal swiping still works between actions.
5. Complete multiple rounds with CPUs being eliminated immediately before their scheduled turns; resolution must not stall.
6. Install/open once online, then enable airplane mode and start a complete game offline.
7. Test Safari audio only after tapping a game control; browser autoplay policy may otherwise keep it silent.

## Product/design direction from the user

The user values a satisfying, readable board-game feel more than visual speed. Animations may be deliberately slower so the player can follow bullets, hit reactions, mounted travel and caboose detachment. The visual design should continue moving away from abstract circles toward expressive illustrated cowboys and a recognizable train, while keeping deterministic rules separate from presentation.
