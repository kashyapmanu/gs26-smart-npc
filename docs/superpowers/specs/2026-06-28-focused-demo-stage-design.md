# Focused Demo Stage (Linear Spine) — Design

- **Date:** 2026-06-28
- **Project:** gs26-smart-npc
- **Status:** Brainstormed, pending user spec review
- **Related:**
  - `docs/superpowers/specs/2026-06-27-smart-npc-design.md` (overall product vision + architecture)
  - `docs/superpowers/specs/2026-06-27-simplified-fullscreen-demo-design.md` (the current `/smart-npc-demo/` page this replaces)

## 1. Problem

The current `/smart-npc-demo/` page has two blockers for a live hackathon demo:

1. **The player character is invisible.** In `smart_npc_game.js:100` the player sprite is set to `depth: -1`, the same layer as the collision grid — *underneath* the ground tiles (depth 0), so it is never seen. Additionally, `player_controller.js` only sets velocity and never calls `player.play(...)`, so even at a correct depth the sprite would slide instead of walking — no walk animation is wired.
2. **The world is far too large.** The page loads all of Smallville (`the_ville`, 140×100 tiles = 4480×3200 px). The camera follows the player but the browser viewport (~1440×900) shows only ~9% of the town, so walking between the two hero locations is long and mostly through irrelevant residential blocks — fatal for a timed live demo.

The product vision (rescue → propagation → callback) is unchanged and correct; only the stage and the scenario branching need work.

## 2. Goal

Replace the demo page's world with a **small, focused stage** built around the two hero locations, **fix the character rendering and animation**, and extend the scenario so the callback has **two real, player-driven branches** (happy / sad), demonstrable back-to-back via a hidden reset.

## 3. Scope

**Replaced (frontend):**
- The tilemap and player-rendering logic in `smart_npc_game.js`.
- The hotspot coordinates in `static_dirs/demo_data/hotspots.json`.

**Extended (backend):**
- `feed/callback.py` — add the sad ("mournful") branch alongside the existing happy ("refuse payment") branch.
- A new reset endpoint to clear demo state and respawn.

**Reused as-is:**
- Phaser 3 stack and Django template wiring (`templates/smart_npc/demo.html`).
- `player_controller.js` input + hotspot-detection logic.
- `feed_overlay.js`, `help_panel.js`, `smart_npc_demo.css`.
- `PlayerEventService`, `FeedService`, propagation / `demo_orchestrator`, `feed_inbox`, and the LLM client.
- The character sprite atlas already wired (`/static/assets/characters/Yuriko_Yamamoto.png` + `atlas.json`).
- Smallville's tileset PNGs (CC-licensed, already credited upstream) as textures for the new map.

The old `/demo/.../` Stanford replay page stays untouched as a fallback.

## 4. The World — Linear Spine

A new, small Tiled-format map, authored in-repo, loaded by `smart_npc_game.js` instead of `the_ville`.

- **Size:** ~50 × 35 tiles at 32 px = **1600 × 1120 px** (final-tuned in implementation; principle: cross end-to-end in ~12–18 seconds at the player's move speed).
- **Layout:** one horizontal street across the middle. Decorative buildings top and bottom for a "town" feel. **Spawn dead-center** on the street.
- **Burning house — left** (≈ tile col 6–12), with a visible **child NPC** at its threshold and a **fire particle + glow overlay** on the roof. `rescue_person` hotspot inside.
- **Restaurant — right** (≈ tile col 38–44), with the **owner NPC** (the rescued/harmed child's relative). `order_food` hotspot inside.
- **~4–5 wandering NPCs** along the street — the visible substrate for feed propagation (retweets/reactions ripple here).
- **No collision surprises:** building bodies are solid; the street is open. Camera is clamped to the small bounds so no empty space ever shows.

Hotspot coordinates (approx, pixel-space, on a 1600×1120 map; finalized in `hotspots.json`):
```json
[
  {"type": "rescue_person", "where": "fire_house",  "x": 288,  "y": 600, "r": 48},
  {"type": "order_food",    "where": "restaurant",  "x": 1328, "y": 600, "r": 48}
]
```

**Why this layout:** symmetric and legible. Going left = rescue; going right = restaurant. Skipping the rescue is just walking right past the fire — a deliberate, visible choice. Walk time between beats is short enough for a live demo.

## 5. The Character — Fix and Animate

Two concrete fixes in `smart_npc_game.js`:

1. **Visibility.** Change the player from `setDepth(-1)` to `setDepth(1)` — above ground (0) and the collision grid (-1), below foreground foliage (2) so the player can still walk behind trees. (The collision layer stays at -1.)
2. **Walk animations.** Build the four-direction walk animations (`walk-up/down/left/right`) from the existing atlas frames in `create()`, and in the scene `update()` choose the animation from the player's velocity direction (set today by `player_controller.applyMovement`); fall back to the static idle frame (`down`) on stop. The character now visibly walks.

Camera follow and world bounds already exist; they are re-pointed at the new (small) map dimensions.

## 6. Scenario — Causal, Two Real Branches, Resettable

The fire is **always burning** at reset; the child is **always in danger**. The player's choice is whether to intervene.

- Enter the **fire** hotspot → `PlayerEventService` records a `rescue_person` event and seeds a **positive** feed post ("…pulled my niece from the fire!"). Propagation carries it to the owner over the following sim time and surfaces in the feed panel.
- Enter the **restaurant** hotspot → `order_food`. The branch is decided **deterministically from the event log** (not from flaky LLM memory):
  - **Rescue happened** → happy branch: owner refuses payment, references the rescue (existing `maybe_refuse_payment_line` path; free food).
  - **No rescue** → sad branch: the child was harmed because no one helped; owner mourns and gives **no discount** (new `maybe_mournful_line` path).

**Determinism is the point.** The branch reflects a real player choice (did the rescue event occur?) and cannot be miscalled by slow or missing propagation. Real propagation is still *shown* in the feed panel for the "wow" — it is the narrative mechanism, not the branch trigger.

### 6.1 Backend changes

The branch **and** the line are both grounded in the **event log**, not in owner-memory retrieval — so neither depends on propagation succeeding.

- `feed/callback.py`: add `maybe_mournful_line(*, event) -> Optional[str]`. It generates a short, in-character mournful line grounded in a synthesized "child harmed in the fire, no one helped" fact, forbidding invented details, mirroring the existing guard. The existing `maybe_refuse_payment_line` is adapted so its **grounding fact comes from the passed `event`** (it already takes `event=` and uses `event.to_dict()` in the prompt); its current memory-based gate (`recollects`) is replaced by the caller's event-log check, so the line no longer waits on memory.
- The caller in the `order_food` path decides from `PlayerEventService.list_events()`:
  - a `rescue_person` event exists → call `maybe_refuse_payment_line(event=rescue_event)` (happy); else
  - call `maybe_mournful_line(event=<synthesized harm fact>)` (sad).
- The **negative** "child harmed" feed post is seeded at `order_food` time when no prior rescue exists (audience = the relevant district), so the feed panel shows the bad news alongside the sad line. (The positive post is already seeded at `rescue_person` time by the existing `_ACTION_MAP`.)
- Canned happy/sad fallback lines if the LLM is unreachable (no crash, demo continues).

### 6.2 Reset

A hidden presenter control:
- **Frontend:** press **`R`** → `POST /demo/reset` (new), then locally respawn the player at spawn and clear on-screen feed/feed-panel state.
- **Backend:** `POST /demo/reset` clears `PlayerEventService` events, `FeedService` posts, and any per-NPC mood/cache seeded this run; re-arms the fire. Does **not** restart the whole server.

This lets the presenter play the happy path, tap `R`, and immediately replay the sad path — judges see the *same* owner react two different ways based on the player's prior act. The reset is the only "cheat"; the causality is real.

## 7. Demo Flow (presenter)

**Happy path:**
1. Spawn center. Walk left to the fire → child rescued → positive post seeds, feed panel ripples, reach climbs.
2. Walk right to the restaurant → owner recognizes the rescue → "on the house" line + free-food post.
3. Press `R`.

**Sad path:**
4. Spawn center. Walk right *past* the fire straight to the restaurant → no rescue → child harmed → owner mourns, no discount.
5. (Optional) Press `R` and replay happy to close on the contrast.

## 8. Reliability / Error Handling

- **Deterministic branch** (§6) — the demo never miscalls happy vs sad.
- **LLM down** — canned happy/sad lines; demo continues.
- **Backend unreachable** — feed panel shows a warning badge; hotspots retry on re-entry (existing guard).
- **Slow propagation** — does not affect the branch (decided from event log); the feed panel still shows whatever spread occurred.
- **Recorded reel** remains the last-resort fallback per the parent spec.

## 9. Testing

- **Unit (backend, mocked LLM):**
  - `order_food` with a prior `rescue_person` → happy line chosen.
  - `order_food` with no prior rescue → sad line chosen.
  - Both lines grounded (no invented facts) — substring/pattern assertions.
  - `POST /demo/reset` clears events and posts.
- **Frontend smoke:** load `/smart-npc-demo/`, assert canvas renders, player sprite is present at depth ≥ 0, and pressing `R` posts to `/demo/reset`. (No deep frontend unit tests — consistent with the parent spec's "no frontend unit tests" stance; the smoke checklist covers the rest.)
- **Manual smoke checklist** (update `DEMO_SMOKE_CHECKLIST.md`): character visible + walks; fire reachable; rescue seeds post; restaurant happy line; `R` resets; sad line on skip.

## 10. Out of Scope

- Removing or altering the old `/demo/.../` Stanford replay page.
- Loading the full `the_ville` map on this page.
- 25-NPC town; this stage uses ~5–7 NPCs total (child, owner, a few wanderers).
- 3D rendering, voice synthesis, accounts/saves.
- Multi-scene or multi-stage worlds beyond this single linear map.
- Changing the overall product architecture, agent loop, memory store, or LLM client.

## 11. Open Questions

- **Exact tile-by-tile map authoring tooling.** The map will be authored as Tiled-format JSON in-repo; confirm whether the team wants a hand-authored JSON, a code-generated tilemap, or a small slice/crop of the existing `the_ville` as the starting canvas. (Design assumes hand-authored-in-repo; implementation can pick the fastest path to a good-looking result.)
- **Wanderer count & pacing.** ~4–5 wandering NPCs is a starting estimate; finalize during implementation based on propagation visibility and perf.
- **Sad-branch seed timing.** Whether the negative "child harmed" post seeds at `order_food` time (simplest) or at the moment the player leaves the fire zone without rescuing (more diegetic). Design assumes the former for reliability; the latter is a possible enhancement.

## 12. Success Criteria

1. `/smart-npc-demo/` shows a small linear-spine stage; the player sprite is visible and walks in four directions; the camera follows with no empty-space edges.
2. Walking into the fire rescues the child and seeds a positive post that propagates in the feed panel.
3. Then walking into the restaurant yields the happy "free food" callback line.
4. Pressing `R` resets; walking straight to the restaurant without rescuing yields the sad "no discount" callback line from the same owner.
5. Both branches are reliable across repeated runs (deterministic branch; LLM only authors the line).
6. The old `/demo/.../` page still works unchanged.
