# Simplified Full-Screen Smart NPCs Demo — Design

**Date:** 2026-06-27  
**Status:** Approved for implementation  
**Related:** `docs/superpowers/specs/2026-06-27-smart-npc-design.md`

## Goal
Replace the current Smallville replay page with a focused, game-like demo page. The map fills the browser, the player is controlled with WASD, the camera follows the player, and only the essential Smart NPCs UI floats on top.

## Problem with the current page
The existing demo URL (`/demo/.../`) is the upstream Stanford Generative Agents replay UI. It includes:
- A "pre-computed replay" disclaimer
- Current Time display
- Play / Pause buttons
- A grid of character sprites and detail cards
- Page scrollbars

All of this distracts from the Smart NPCs hackathon story (rescue → propagation → callback) and makes the page feel like a research replay rather than an interactive game.

## Design decisions

### 1. New route
Add a new Django route at `/smart-npc-demo/` that renders a clean template. Keep the old `/demo/.../` URLs untouched as a fallback for development and comparison.

### 2. Full-screen layout
- Phaser canvas fills `100vw × 100vh`.
- No page scrollbars.
- No browser fullscreen API — just fill the normal viewport to avoid permission prompts.
- Map is live immediately on load (no start screen).

### 3. Floating UI
- **Town Feed button:** small button in the top-right corner. Clicking it opens the feed panel and starts the SSE stream.
- **Town Feed panel:** floating panel in the top-right, appears after the button is clicked. Shows posts with reach counters and the "Spread the word" button.
- **Help panel:** minimal, bottom-left, collapsible via a [?] toggle. Starts open so the presenter can narrate, but can be tucked away.
- No other chrome (no title, play/pause, character grid, time display).

### 4. Player & camera
- Player is controlled with **WASD only** (no click-to-move).
- Camera is **strictly centered** on the player.
- Player movement is clamped to map bounds so the camera never shows empty space outside the world.
- Existing upstream arrow-key camera control is disabled in the new demo.

### 5. Demo flow (unchanged from current design)
1. **Beat 1 — Rescue:** Walk into the burning-house hotspot → posts `rescue_person` → seed post appears in the Town Feed.
2. **Beat 2 — Propagation:** Click "Spread the word" in the feed panel → calls `POST /orchestrator/start` → retweets stream in and reach counter climbs.
3. **Beat 3 — Callback:** Walk into the restaurant hotspot → posts `order_food` → owner callback line appears in the feed.

### 6. Components
- **`templates/smart_npc/demo.html`** — new bare Django template with viewport meta, full-screen styles, canvas container, and floating panels.
- **`static_dirs/assets/js/smart_npc_game.js`** — extracted reusable Phaser `preload/create/update` logic from `demo/main_script.html`.
- **`static_dirs/assets/js/player_controller.js`** — updated to center the camera on the player and clamp movement to map bounds.
- **`static_dirs/assets/js/feed_overlay.js`** — minor changes to start on button click instead of page load.
- **`static_dirs/assets/js/help_panel.js`** — new collapsible help component.
- **`static_dirs/css/smart_npc_demo.css`** — new full-screen layout + floating panel styles.

### 7. Data flow
Same as the existing Smart NPCs architecture:
- Browser POSTs actions to FastAPI `smart_npc_api` on `:8001`.
- FastAPI stores posts in `FeedService` and runs the in-process orchestrator for propagation.
- Browser subscribes to `/feed/stream` via SSE when the feed panel is opened.

### 8. Error handling
- If the FastAPI server is unreachable, the feed panel shows a warning badge and the demo degrades gracefully.
- If a hotspot action POST fails, it is retried silently on the next frame entry (the hotspot guard resets on exit, so re-entering retries).

### 9. Testing
- Unit tests for the backend feed/callback logic remain unchanged.
- Add a frontend smoke test that loads `/smart-npc-demo/` and asserts the canvas, feed button, and help panel exist.
- Manual smoke checklist updated to use the new URL.

### 10. Out of scope
- True browser fullscreen API (`requestFullscreen`).
- Mobile/touch controls.
- Click-to-move.
- Start screen / splash.
- Removing the old `/demo/.../` page (it stays as a fallback).

## Open questions resolved during brainstorming
| Question | Decision |
|----------|----------|
| WASD moves window or player? | Player moves; camera follows. |
| Start screen or straight to map? | Straight to map. |
| Fullscreen API or fill viewport? | Fill viewport only. |
| Help panel always visible? | Collapsible, starts open. |
| WASD + click-to-move? | WASD only. |
| Feed auto-start or button? | Button to open. |
| Camera style? | Strictly centered on player. |

## Success criteria
1. `/smart-npc-demo/` loads a full-screen map with no Smallville UI.
2. WASD moves a visible player avatar and the camera follows it.
3. Walking into the burning house seeds the feed.
4. Clicking "Spread the word" triggers retweets visible in the feed.
5. Walking into the restaurant triggers the owner callback line.
6. Old `/demo/.../` URLs still work as before.