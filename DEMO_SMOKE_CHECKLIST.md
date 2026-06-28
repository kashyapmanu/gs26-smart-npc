# Demo Smoke Checklist

Run before each judging session. All items must pass before going live.
If any item fails and cannot be fixed in 2 minutes, switch to the fallback reel.

## Environment
- [ ] API keys + model set in `smallville/.env` (auto-loaded, no `export` needed):
      `MESHAPI_API_KEY`, `OPENROUTER_API_KEY`, `MESHAPI_MODEL=deepseek/deepseek-v4-flash`
- [ ] Laptop has internet (`ping api.meshapi.ai`)
- [ ] **Known port layout:** Django frontend on 8000, FastAPI smart_npc_api on 8001.
      The frontend's `window.SMART_NPC_API` points to `http://localhost:8001`.
- [ ] **Shell 1 — Django frontend:**
      `cd smallville/environment/frontend_server && ../../.venv/bin/python manage.py runserver`
      Open <http://localhost:8000/> to confirm "environment server is up and running"
- [ ] **Shell 2 — FastAPI smart_npc_api:**
      `cd smallville/reverie/backend_server && ../../.venv/bin/uvicorn smart_npc_api:app --port 8001`
      (No third shell — the orchestrator now runs in-process via `POST /orchestrator/start`.)

## Beat 1 — The Act
- [ ] Open the demo URL `http://127.0.0.1:8000/smart-npc-demo/` in Chrome/Safari
- [ ] Phaser world renders and the camera-centred player responds to arrow keys
- [ ] WASD also moves the player (added controls)
- [ ] Walking the player into the burning-building hotspot posts a `rescue_person` action
      - Verify in FastAPI console: a `POST /player/action` appears with `type=rescue_person`
      - Verify via `curl http://localhost:8001/feed | jq` returns one post with "fire" in text

## Beat 2 — Propagation
- [ ] Feed overlay panel appears top-right and streams the first post (auto via SSE)
- [ ] Click the **Town Feed** button, then click **Spread the word** to trigger propagation
      - Alternatively, from the browser console: `fetch(SMART_NPC_API + "/orchestrator/start", {method:"POST"})`
      - Or from a shell: `curl -X POST http://localhost:8001/orchestrator/start`
- [ ] Retweets appear within a few seconds and the reach counter climbs (target ~12)
- [ ] By roughly `SMART_NPC_MAX_SIM_T` seconds, the post audience is promoted to "town"
- [ ] Local NPCs near the rescue also chat on the map ("did you hear about the fire?" — visible via the upstream pronunciatio/chat bubble UI)

## Beat 3 — The Callback
- [ ] Walk the player into the restaurant hotspot (`order_food`)
- [ ] Owner NPC's response references the rescue: look for "niece", "fire", "hero", or "on the house" in the chat bubble
- [ ] If the rescue was NOT recalled (e.g., orchestrator never delivered the post to the owner's memory), owner falls back to a generic transaction line and the demo continues

## Failure Mode
- [ ] If LLM fails (both providers): feed overlay shows a warning badge (`feed stream interrupted — retrying...`) and the demo cued reel (see `smallville/demo_data/fallback_reel/README.md`)

### Focused demo stage — /smart-npc-demo/

- [ ] Page loads full-screen, no scrollbars, no Smallville replay UI.
- [ ] Player sprite is visible near the center and walks in 4 directions with animation.
- [ ] Camera stays inside the small stage; no empty-space edges.
- [ ] Walking left into the fire triggers `POST /player/action {type: "rescue_person"}`.
- [ ] Feed panel shows a positive rescue post.
- [ ] Walking right into the restaurant triggers `POST /player/action {type: "order_food"}`.
- [ ] Restaurant owner says a grateful / free-food callback line.
- [ ] Press `R` → player respawns center, `/demo/reset` returns 200, feed clears.
- [ ] Walk straight to the restaurant without rescuing → owner says a sad / no-discount callback line.
- [ ] Old `/demo/.../` URL still works as before.
