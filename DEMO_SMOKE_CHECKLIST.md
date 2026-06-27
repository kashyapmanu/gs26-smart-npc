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
- [ ] Open the demo URL (see launch one-liner below) in Chrome/Safari
- [ ] Phaser world renders and the camera-centred player responds to arrow keys
- [ ] WASD also moves the player (added controls)
- [ ] Walking the player into the burning-building hotspot posts a `rescue_person` action
      - Verify in FastAPI console: a `POST /player/action` appears with `type=rescue_person`
      - Verify via `curl http://localhost:8001/feed | jq` returns one post with "fire" in text

## Beat 2 — Propagation
- [ ] Feed overlay panel appears top-right and streams the first post (auto via SSE)
- [ ] Trigger propagation in one of two ways:
      - **From the browser console** (easiest): `fetch(SMART_NPC_API + "/orchestrator/start", {method:"POST"})`
      - **From a shell**: `curl -X POST http://localhost:8001/orchestrator/start`
- [ ] Retweets appear within a few seconds and the reach counter climbs (target ~12)
- [ ] By roughly `SMART_NPC_MAX_SIM_T` seconds, the post audience is promoted to "town"
- [ ] Local NPCs near the rescue also chat on the map ("did you hear about the fire?" — visible via the upstream pronunciatio/chat bubble UI)

## Beat 3 — The Callback
- [ ] Walk the player into the restaurant hotspot (`order_food`)
- [ ] Owner NPC's response references the rescue: look for "niece", "fire", "hero", or "on the house" in the chat bubble
- [ ] If the rescue was NOT recalled (e.g., orchestrator never delivered the post to the owner's memory), owner falls back to a generic transaction line and the demo continues

## Failure Mode
- [ ] If LLM fails (both providers): feed overlay shows a warning badge (`feed stream interrupted — retrying...`) and the demo cued reel (see `smallville/demo_data/fallback_reel/README.md`)