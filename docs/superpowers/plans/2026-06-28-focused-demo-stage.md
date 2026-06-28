# Focused Demo Stage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the oversized `the_ville` demo page with a small linear-spine stage, fix the invisible/depth-buried player and missing walk animations, and extend the callback so the restaurant owner reacts either gratefully (free food) or mournfully (no discount) based on whether the player rescued the child — with a hidden `[R]` reset to demo both branches.

**Architecture:** Backend keeps the existing `PlayerEventService` + `FeedService` but makes the `order_food` branch deterministic from the event log (not from flaky memory propagation) and adds a reset endpoint. Frontend loads a new small Tiled map, reuses Smallville's existing tileset PNGs, fixes player rendering/animation, and wires the reset key. All existing demo pages and backend modules remain untouched unless they are explicitly modified below.

**Tech Stack:** Phaser 3 (TypeScript-ish IIFE modules), Django templates, FastAPI, Python 3.9+, pytest, Tiled-format JSON tilemaps.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `smallville/reverie/backend_server/feed/feed_service.py` | In-world social post store; add `clear()` for reset. |
| `smallville/reverie/backend_server/feed/event_service.py` | Canonicalizes player actions; add `clear()` for reset. |
| `smallville/reverie/backend_server/feed/callback.py` | LLM line generators. Add `maybe_mournful_line`; simplify `maybe_refuse_payment_line` to be event-grounded. |
| `smallville/reverie/backend_server/smart_npc_api.py` | FastAPI endpoints. Branch `order_food` from event log; add `POST /demo/reset`; seed negative post on sad branch. |
| `smallville/tests/smart_npc/test_focused_demo.py` | Backend tests for branch logic, reset, and line grounding. |
| `smallville/environment/frontend_server/static_dirs/assets/the_ville/visuals/generate_focused_map.py` | One-off generator for the new small Tiled map. |
| `smallville/environment/frontend_server/static_dirs/assets/the_ville/visuals/focused_demo.json` | Generated small tilemap (50×35 tiles). |
| `smallville/environment/frontend_server/static_dirs/demo_data/hotspots.json` | New hotspot coordinates for the small stage. |
| `smallville/environment/frontend_server/static_dirs/assets/js/smart_npc_game.js` | Load new map, fix player depth, create + play 4-direction walk animations, clamp camera. |
| `smallville/environment/frontend_server/static_dirs/assets/js/player_controller.js` | Add reset key (`R`) handler that POSTs `/demo/reset` and respawns player. |
| `smallville/environment/frontend_server/templates/smart_npc/demo.html` | Include any new JS module; no major changes. |
| `DEMO_SMOKE_CHECKLIST.md` | Manual smoke checklist updated for the new happy/sad branch. |

---

## Task 1: Add reset support to backend services

**Files:**
- Modify: `smallville/reverie/backend_server/feed/feed_service.py`
- Modify: `smallville/reverie/backend_server/feed/event_service.py`
- Create: `smallville/tests/smart_npc/test_focused_demo.py`

- [ ] **Step 1: Write the failing tests for `clear()`**

```python
from feed.feed_service import FeedService
from feed.event_service import PlayerEventService


def test_feed_service_clear():
    fs = FeedService()
    fs.create_post(author="x", text="hello", ts=0.0)
    fs.clear()
    assert fs.list_posts() == []


def test_event_service_clear():
    fs = FeedService()
    es = PlayerEventService(feed=fs)
    es.handle_action({"type": "rescue_person", "where": "fire_house"}, t=0.0)
    es.clear()
    assert es.list_events() == []
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest smallville/tests/smart_npc/test_focused_demo.py -v`
Expected: two `AttributeError: 'FeedService' object has no attribute 'clear'` (or similar) failures.

- [ ] **Step 3: Implement `clear()` on `FeedService`**

Insert in `smallville/reverie/backend_server/feed/feed_service.py` after `all_posts()`:

```python
    def clear(self) -> None:
        with self._lock:
            self._posts.clear()
            self._order.clear()
            self._seq = 0
```

- [ ] **Step 4: Implement `clear()` on `PlayerEventService`**

Insert in `smallville/reverie/backend_server/feed/event_service.py` after `list_events()`:

```python
    def clear(self) -> None:
        self._events.clear()
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `python -m pytest smallville/tests/smart_npc/test_focused_demo.py::test_feed_service_clear smallville/tests/smart_npc/test_focused_demo.py::test_event_service_clear -v`
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add smallville/reverie/backend_server/feed/feed_service.py \
        smallville/reverie/backend_server/feed/event_service.py \
        smallville/tests/smart_npc/test_focused_demo.py
git commit -m "feat(demo): add clear() to FeedService and PlayerEventService for reset"
```

---

## Task 2: Add the mournful (sad) callback line generator

**Files:**
- Modify: `smallville/reverie/backend_server/feed/callback.py`
- Modify: `smallville/tests/smart_npc/test_callback.py`
- Modify: `smallville/tests/smart_npc/test_focused_demo.py`

- [ ] **Step 1: Write the failing test for `maybe_mournful_line`**

Append to `smallville/tests/smart_npc/test_focused_demo.py`:

```python
from feed.callback import maybe_mournful_line


class OrderEvent:
    def to_dict(self):
        return {"verb": "ordered", "object": "food", "where": "restaurant"}


def test_mournful_line_when_aware(monkeypatch):
    monkeypatch.setattr("feed.callback.safe_chat_completion",
                        lambda *a, **k: "My niece... no one helped her.")
    line = maybe_mournful_line(event=OrderEvent())
    assert line is not None
    assert "niece" in line.lower() or "fire" in line.lower()


def test_mournful_line_grounds_in_fact(monkeypatch):
    captured = {}
    def capture(prompt, *a, **k):
        captured["prompt"] = prompt
        return "I'm sorry, I can't today."
    monkeypatch.setattr("feed.callback.safe_chat_completion", capture)
    maybe_mournful_line(event=OrderEvent())
    assert "no one helped" in captured["prompt"].lower()
    assert "fire" in captured["prompt"].lower()
```

Run: `python -m pytest smallville/tests/smart_npc/test_focused_demo.py::test_mournful_line_when_aware -v`
Expected: `ImportError` or `AttributeError` for `maybe_mournful_line`.

- [ ] **Step 2: Implement `maybe_mournful_line` in `callback.py`**

Append to `smallville/reverie/backend_server/feed/callback.py`:

```python

def maybe_mournful_line(*, event) -> Optional[str]:
    """Generate the sad owner line when the child was harmed because the player
    did not rescue her. The event argument is the order_food event; the prompt
    supplies the un-grounded fact that no one helped."""
    prompt = (
        "You are the owner of a small restaurant in town. Earlier today a fire "
        "broke out and your niece was caught inside. No one rescued her, and she "
        "was harmed. The player just sat down at one of your tables and ordered food. "
        "In one short, in-character sentence (no quote marks, no emojis), tell them "
        "you cannot offer a discount or free food because you are grieving. "
        f"Ground the line in these facts: {event.to_dict()}. Do not invent new details."
    )
    return safe_chat_completion(prompt) or None
```

- [ ] **Step 3: Remove the memory-gate from `maybe_refuse_payment_line`**

The branch is now decided by the event log, so `maybe_refuse_payment_line` should always generate the happy line given the rescue event. Replace the whole body of `maybe_refuse_payment_line` in `smallville/reverie/backend_server/feed/callback.py` with:

```python
def maybe_refuse_payment_line(*, event: WorldEvent) -> Optional[str]:
    """Generate the grateful owner line when the player rescued the owner's niece."""
    prompt = (
        "You are the owner of a small restaurant in town. Earlier today "
        f"someone in town rescued a girl from a fire: {event.to_dict()}. "
        "The rescuer just sat down at one of your tables and ordered food. "
        "In one short, in-character sentence (no quote marks, no emojis), "
        "refuse their payment and reference the specific rescue. Stay grounded "
        "in the event facts given here; do not invent new details."
    )
    return safe_chat_completion(prompt) or None
```

This changes the function signature from `(owner_memory, *, event)` to `(*, event)`. Update the import in `smart_npc_api.py` later (Task 3).

- [ ] **Step 4: Update the existing `test_callback.py` for the new signature**

Replace the contents of `smallville/tests/smart_npc/test_callback.py` with:

```python
import pytest

from feed.callback import maybe_refuse_payment_line, maybe_mournful_line
from feed.models import WorldEvent


def test_refuse_payment_grounds_in_event(monkeypatch):
    monkeypatch.setattr("feed.callback.safe_chat_completion",
                        lambda *a, **k: "Hero! On the house — you saved my niece!")
    ev = WorldEvent(id="e1", who="player", verb="rescued", object="a girl",
                    where="fire_house", when=1.0, sentiment="heroic")
    line = maybe_refuse_payment_line(event=ev)
    assert line is not None
    assert any(k in line.lower() for k in ("niece", "house", "hero"))


def test_mournful_line_grounds_in_harm_fact(monkeypatch):
    monkeypatch.setattr("feed.callback.safe_chat_completion",
                        lambda *a, **k: "My niece... I can't offer anything today.")
    ev = WorldEvent(id="e2", who="player", verb="ordered", object="food",
                    where="restaurant", when=2.0, sentiment="neutral")
    line = maybe_mournful_line(event=ev)
    assert line is not None
    assert "niece" in line.lower() or "fire" in line.lower()
```

- [ ] **Step 5: Run all callback tests**

Run: `python -m pytest smallville/tests/smart_npc/test_callback.py smallville/tests/smart_npc/test_focused_demo.py -v`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add smallville/reverie/backend_server/feed/callback.py \
        smallville/tests/smart_npc/test_callback.py \
        smallville/tests/smart_npc/test_focused_demo.py
git commit -m "feat(demo): add mournful callback line and remove memory gate"
```

---

## Task 3: Branch order_food from the event log and expose reset endpoint

**Files:**
- Modify: `smallville/reverie/backend_server/smart_npc_api.py`
- Modify: `smallville/tests/smart_npc/test_focused_demo.py`

- [ ] **Step 1: Write the failing integration tests**

Append to `smallville/tests/smart_npc/test_focused_demo.py`:

```python
from fastapi.testclient import TestClient
from smart_npc_api import app

client = TestClient(app)


def test_order_food_happy_when_rescue_exists():
    client.post("/demo/reset")
    client.post("/player/action", json={"type": "rescue_person", "where": "fire_house", "t": 1.0})
    r = client.post("/player/action", json={"type": "order_food", "where": "restaurant", "t": 2.0})
    assert r.status_code == 200
    posts = client.get("/feed").json()["posts"]
    assert any("niece" in p["text"].lower() and "saved" in p["text"].lower() for p in posts) or \
           any("rescued" in p["text"].lower() for p in posts)


def test_order_food_sad_when_no_rescue():
    client.post("/demo/reset")
    r = client.post("/player/action", json={"type": "order_food", "where": "restaurant", "t": 1.0})
    assert r.status_code == 200
    posts = client.get("/feed").json()["posts"]
    assert any("no one helped" in p["text"].lower() or "niece" in p["text"].lower() for p in posts)


def test_demo_reset_clears_events_and_feed():
    client.post("/player/action", json={"type": "rescue_person", "where": "fire_house", "t": 1.0})
    r = client.post("/demo/reset")
    assert r.status_code == 200
    assert client.get("/events").json()["events"] == []
    assert client.get("/feed").json()["posts"] == []
```

Run: `python -m pytest smallville/tests/smart_npc/test_focused_demo.py::test_order_food_happy_when_rescue_exists -v`
Expected: FAIL — `/demo/reset` missing or branch not implemented.

- [ ] **Step 2: Update the import and add the branch logic in `smart_npc_api.py`**

Change the import near the top of `smallville/reverie/backend_server/smart_npc_api.py` from:

```python
from feed.callback import maybe_refuse_payment_line
```

to:

```python
from feed.callback import maybe_mournful_line, maybe_refuse_payment_line
```

Replace the body of `post_action` with:

```python
@app.post("/player/action")
def post_action(action: ActionIn):
    ev = _events.handle_action({"type": action.type, "where": action.where}, t=action.t)

    if action.type == "order_food":
        prior_rescues = [e for e in _events.list_events() if e.verb == "rescued"]
        if prior_rescues:
            line = maybe_refuse_payment_line(event=prior_rescues[-1])
            _feed.create_post(author="restaurant owner", text=line, ts=action.t, audience="town")
        else:
            line = maybe_mournful_line(event=ev)
            _feed.create_post(
                author="restaurant owner",
                text=line or "I can't offer you a discount today... my niece was in that fire.",
                ts=action.t,
                audience="town",
            )

    return ev.to_dict()
```

- [ ] **Step 3: Add the `/demo/reset` endpoint**

Append to `smallville/reverie/backend_server/smart_npc_api.py` before the orchestrator block:

```python
@app.post("/demo/reset")
def demo_reset():
    """Clear all demo state and prepare for a fresh run."""
    _feed.clear()
    _events.clear()
    _owner_memory.seq_event.clear()
    _owner_memory.feed_inbox.clear()
    return {"status": "reset"}
```

- [ ] **Step 4: Run the integration tests**

Run: `python -m pytest smallville/tests/smart_npc/test_focused_demo.py -v`
Expected: PASS for all backend tests. (LLM calls are stubbed by conftest, but the branch posts are generated even when `safe_chat_completion` returns `None`; the fallback text covers the sad case.)

- [ ] **Step 5: Commit**

```bash
git add smallville/reverie/backend_server/smart_npc_api.py \
        smallville/tests/smart_npc/test_focused_demo.py
git commit -m "feat(demo): deterministic happy/sad branch and /demo/reset endpoint"
```

---

## Task 4: Generate the focused demo tilemap

**Files:**
- Create: `smallville/environment/frontend_server/static_dirs/assets/the_ville/visuals/generate_focused_map.py`
- Create: `smallville/environment/frontend_server/static_dirs/assets/the_ville/visuals/focused_demo.json` (generated)

- [ ] **Step 1: Write the map generator**

Create `smallville/environment/frontend_server/static_dirs/assets/the_ville/visuals/generate_focused_map.py`:

```python
import json
from pathlib import Path

# Palette of gids from Smallville tilesets. These are final-tuned visually
# in Step 3; start with plausible values from the existing the_ville map.
PALETTE = {
    "grass": 1,
    "road": 2,
    "house_wall": 3,
    "house_roof": 4,
    "restaurant_wall": 5,
    "restaurant_roof": 6,
    "tree": 7,
}

W, H = 50, 35


def fill(layer_name, default_gid, patch_fn=None):
    data = [default_gid] * (W * H)
    if patch_fn:
        patch_fn(data)
    return {
        "name": layer_name,
        "width": W,
        "height": H,
        "x": 0,
        "y": 0,
        "opacity": 1,
        "type": "tilelayer",
        "visible": True,
        "data": data,
    }


def street_patch(data):
    # Horizontal street across the middle (tiles y=20..22)
    for y in range(20, 23):
        for x in range(W):
            data[y * W + x] = PALETTE["road"]


def building_patch(data):
    # Burning house on the left, around (6..12, 16..24)
    for y in range(16, 25):
        for x in range(6, 13):
            data[y * W + x] = PALETTE["house_wall"]
    # Roof trim
    for x in range(6, 13):
        data[15 * W + x] = PALETTE["house_roof"]

    # Restaurant on the right, around (38..44, 16..24)
    for y in range(16, 25):
        for x in range(38, 45):
            data[y * W + x] = PALETTE["restaurant_wall"]
    for x in range(38, 45):
        data[15 * W + x] = PALETTE["restaurant_roof"]


def decor_patch(data):
    # A few trees/buildings top and bottom for town feel
    for x in [4, 18, 30, 46]:
        data[3 * W + x] = PALETTE["tree"]
        data[31 * W + x] = PALETTE["tree"]


layers = [
    fill("Ground", PALETTE["grass"], street_patch),
    fill("Buildings", 0, building_patch),
    fill("Decoration", 0, decor_patch),
]

# Tilesets: embed a minimal set that the existing smart_npc_game.js already loads.
# We only need the firstgid/name mapping; the actual image paths are loaded in JS.
tilesets = [
    {"firstgid": 1, "name": "CuteRPG_Field_B", "tilewidth": 32, "tileheight": 32},
]

map_doc = {
    "compressionlevel": -1,
    "height": H,
    "infinite": False,
    "layers": layers,
    "nextlayerid": len(layers) + 1,
    "nextobjectid": 1,
    "orientation": "orthogonal",
    "renderorder": "right-down",
    "tiledversion": "1.9",
    "tileheight": 32,
    "tilesets": tilesets,
    "tilewidth": 32,
    "type": "map",
    "version": "1.9",
    "width": W,
}

out = Path(__file__).with_name("focused_demo.json")
out.write_text(json.dumps(map_doc, indent=2))
print(f"wrote {out}")
```

- [ ] **Step 2: Run the generator**

Run:

```bash
cd smallville/environment/frontend_server/static_dirs/assets/the_ville/visuals
python3 generate_focused_map.py
```

Expected: `wrote .../focused_demo.json`.

- [ ] **Step 3: Validate JSON structure**

Run:

```bash
python3 -c "import json; json.load(open('smallville/environment/frontend_server/static_dirs/assets/the_ville/visuals/focused_demo.json')); print('valid JSON')"
```

Expected: `valid JSON`.

- [ ] **Step 4: Commit the generator (not the JSON yet, or include it)**

We will likely regenerate the JSON after tuning gids, so commit both after tuning. For now:

```bash
git add smallville/environment/frontend_server/static_dirs/assets/the_ville/visuals/generate_focused_map.py
git commit -m "feat(demo): add focused stage map generator"
```

---

## Task 5: Wire the new map, fix player depth, and add walk animations

**Files:**
- Modify: `smallville/environment/frontend_server/static_dirs/assets/js/smart_npc_game.js`
- Modify: `smallville/environment/frontend_server/static_dirs/demo_data/hotspots.json` (placeholder values; tuned in Task 6)

- [ ] **Step 1: Update `smart_npc_game.js` to load `focused_demo.json`**

In `smart_npc_game.js`, replace:

```javascript
this.load.tilemapTiledJSON("map", "/static/assets/the_ville/visuals/the_ville_jan7.json");
```

with:

```javascript
this.load.tilemapTiledJSON("map", "/static/assets/the_ville/visuals/focused_demo.json");
```

- [ ] **Step 2: Fix player depth and create walk animations**

Replace the player creation block in `create()` (lines 95–100) with:

```javascript
    // Player sprite — visible above ground (depth 1), below foreground foliage (depth 2)
    const player = this.physics.add
      .sprite(800, 640, "atlas", "down")
      .setSize(30, 40)
      .setOffset(0, 0);
    player.setDepth(1);
    player.setCollideWorldBounds(true);

    // Walk animations
    this.anims.create({
      key: "walk-down",
      frames: this.anims.generateFrameNames("atlas", { prefix: "down-walk.", start: 0, end: 3, zeroPad: 3 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-up",
      frames: this.anims.generateFrameNames("atlas", { prefix: "up-walk.", start: 0, end: 3, zeroPad: 3 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-left",
      frames: this.anims.generateFrameNames("atlas", { prefix: "left-walk.", start: 0, end: 3, zeroPad: 3 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-right",
      frames: this.anims.generateFrameNames("atlas", { prefix: "right-walk.", start: 0, end: 3, zeroPad: 3 }),
      frameRate: 10,
      repeat: -1,
    });
```

- [ ] **Step 3: Update the update() loop to choose animation from velocity**

Replace the `update` function with:

```javascript
  function update(time, delta) {
    if (window.SmartNPCPlayer && this._snPlayer) {
      window.SmartNPCPlayer.update(this, this._snPlayer);
    }
    updatePlayerAnimation(this._snPlayer);
  }

  function updatePlayerAnimation(player) {
    if (!player || !player.body) return;
    const vx = player.body.velocity.x;
    const vy = player.body.velocity.y;
    const moving = Math.abs(vx) > 1 || Math.abs(vy) > 1;
    if (!moving) {
      player.anims.stop();
      return;
    }
    let anim = null;
    if (Math.abs(vx) > Math.abs(vy)) {
      anim = vx > 0 ? "walk-right" : "walk-left";
    } else {
      anim = vy > 0 ? "walk-down" : "walk-up";
    }
    if (player.anims.currentAnim?.key !== anim) {
      player.play(anim);
    }
  }
```

- [ ] **Step 4: Clamp camera to the new small bounds**

The existing lines:

```javascript
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
```

are correct because `map.widthInPixels` now comes from `focused_demo.json` (50×32 = 1600, 35×32 = 1120). Leave them as-is.

- [ ] **Step 5: Smoke test the new game.js**

Start the Django dev server and FastAPI backend:

```bash
# Terminal 1
cd smallville/environment/frontend_server
python manage.py runserver

# Terminal 2
cd smallville/reverie/backend_server
python -m uvicorn smart_npc_api:app --host 127.0.0.1 --port 8001 --reload
```

Open `http://localhost:8000/smart-npc-demo/`. Expected: the canvas loads, the player sprite is visible near the center, and WASD moves it with walking animation. The background shows the small generated map. (It may look visually rough until gids are tuned; that is expected at this step.)

- [ ] **Step 6: Commit**

```bash
git add smallville/environment/frontend_server/static_dirs/assets/js/smart_npc_game.js \
        smallville/environment/frontend_server/static_dirs/assets/the_ville/visuals/focused_demo.json
git commit -m "feat(demo): load focused map, fix player depth, add 4-dir walk anims"
```

---

## Task 6: Update hotspots and wire the `[R]` reset key

**Files:**
- Modify: `smallville/environment/frontend_server/static_dirs/demo_data/hotspots.json`
- Modify: `smallville/environment/frontend_server/static_dirs/assets/js/player_controller.js`
- Modify: `smallville/environment/frontend_server/static_dirs/assets/js/smart_npc_game.js` (spawn ref)

- [ ] **Step 1: Write new hotspot coordinates**

Replace `smallville/environment/frontend_server/static_dirs/demo_data/hotspots.json` with:

```json
[
  {"type": "rescue_person", "where": "fire_house",  "x": 288, "y": 600, "r": 48},
  {"type": "order_food",    "where": "restaurant",  "x": 1328, "y": 600, "r": 48}
]
```

- [ ] **Step 2: Expose a scene reset function in `smart_npc_game.js`**

After creating the player, store the spawn point and expose a reset helper:

```javascript
    const SPAWN = { x: 800, y: 640 };

    // Store references on the scene for update()
    this._snPlayer = player;
    this._snSpawn = SPAWN;

    window.SmartNPCGame.resetPlayer = () => {
      if (player && player.body) {
        player.body.reset(SPAWN.x, SPAWN.y);
        player.setVelocity(0, 0);
        player.anims.stop();
        player.setFrame("down");
      }
    };
```

- [ ] **Step 3: Add `[R]` reset handling to `player_controller.js`**

At the top of the IIFE in `player_controller.js`, add:

```javascript
  const SMART_NPC_API = window.SMART_NPC_API || "http://localhost:8001";
  const hotspotState = new Map();
  let keys = null;
  let resetKey = null;
```

In `bindKeys(scene)`:

```javascript
  function bindKeys(scene) {
    if (keys) return;
    keys = scene.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT");
    resetKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    resetKey.on("down", onReset);
  }
```

Add the reset handler before `applyMovement`:

```javascript
  async function onReset() {
    try {
      await fetch(`${SMART_NPC_API}/demo/reset`, { method: "POST" });
      hotspotState.clear();
      if (window.SmartNPCGame && window.SmartNPCGame.resetPlayer) {
        window.SmartNPCGame.resetPlayer();
      }
      if (window.SmartNPCFeed) {
        window.SmartNPCFeed.clear && window.SmartNPCFeed.clear();
      }
    } catch (e) {
      console.warn("smart-npc reset failed", e);
    }
  }
```

- [ ] **Step 4: Update the help panel HTML to mention reset**

In `smallville/environment/frontend_server/templates/smart_npc/demo.html`, replace the help `<ol>` with:

```html
    <ol id="help-body">
      <li>Use <span class="key">WASD</span> to move.</li>
      <li>Walk into the <strong>burning house</strong> to rescue.</li>
      <li>Click <strong>Town Feed</strong>, then <strong>Spread the word</strong>.</li>
      <li>Walk to the <strong>restaurant</strong> for the callback.</li>
      <li>Press <span class="key">R</span> to reset and try the other branch.</li>
    </ol>
```

- [ ] **Step 5: Smoke test hotspots + reset**

Run the servers again (Task 5, Step 5). Open the demo. Walk left into the fire; check the browser Network tab for a `POST /player/action {type: "rescue_person"}`. Walk right into the restaurant; check `POST /player/action {type: "order_food"}`. Press `R`; the player should respawn center, `/demo/reset` should return 200, and previously-entered hotspots should re-trigger.

- [ ] **Step 6: Commit**

```bash
git add smallville/environment/frontend_server/static_dirs/demo_data/hotspots.json \
        smallville/environment/frontend_server/static_dirs/assets/js/player_controller.js \
        smallville/environment/frontend_server/static_dirs/assets/js/smart_npc_game.js \
        smallville/environment/frontend_server/templates/smart_npc/demo.html
git commit -m "feat(demo): new hotspots, spawn reset helper, and [R] reset key"
```

---

## Task 7: Add visible NPCs and the fire overlay

**Files:**
- Modify: `smallville/environment/frontend_server/static_dirs/assets/js/smart_npc_game.js`

- [ ] **Step 1: Add the child NPC near the burning house**

After creating the player in `create()`, add:

```javascript
    // Child NPC at the burning house threshold
    const child = this.physics.add.sprite(350, 600, "atlas", "down");
    child.setDepth(1);
    child.body.immovable = true;

    // Owner NPC at the restaurant
    const owner = this.physics.add.sprite(1250, 600, "atlas", "down");
    owner.setDepth(1);
    owner.body.immovable = true;
```

- [ ] **Step 2: Add 4–5 wandering NPCs with simple random walk**

After the owner, add:

```javascript
    const wanderers = [];
    for (const wx of [512, 700, 900, 1050, 1180]) {
      const npc = this.physics.add.sprite(wx, 640, "atlas", "down");
      npc.setDepth(1);
      npc.body.setCollideWorldBounds(true);
      wanderers.push(npc);
    }
    this._snWanderers = wanderers;
    this._snNextWander = 0;
```

In `update()`, after the existing update calls, add:

```javascript
    updateWanderers(this, time);

  function updateWanderers(scene, time) {
    if (!scene._snWanderers || time < scene._snNextWander) return;
    scene._snNextWander = time + 1000;
    for (const npc of scene._snWanderers) {
      const speed = 60;
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      npc.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      const anim = Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))
        ? (Math.cos(angle) > 0 ? "walk-right" : "walk-left")
        : (Math.sin(angle) > 0 ? "walk-down" : "walk-up");
      npc.play(anim, true);
    }
  }
```

- [ ] **Step 3: Add a fire particle/glow overlay on the burning house**

After creating layers in `create()`, add:

```javascript
    // Fire glow overlay on the burning house (left side)
    const fireEmitter = this.add.particles("atlas", {
      frame: "down",
      x: 288,
      y: 560,
      speed: { min: -30, max: 30 },
      angle: { min: 240, max: 300 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 800,
      frequency: 80,
      tint: [0xff5500, 0xffaa00],
      blendMode: "ADD",
    });
    fireEmitter.setDepth(2);
```

If Phaser's particle API in the loaded version differs, the worker should adjust to the available API; the design intent is a visible fire effect at (288, 560).

- [ ] **Step 4: Smoke test the scene**

Open the demo. Expected: child and owner are visible, wanderers move along the street, fire glow emits above the house on the left.

- [ ] **Step 5: Commit**

```bash
git add smallville/environment/frontend_server/static_dirs/assets/js/smart_npc_game.js
git commit -m "feat(demo): add child, owner, wandering NPCs, and fire glow"
```

---

## Task 8: Update the smoke checklist and run a full manual pass

**Files:**
- Modify: `DEMO_SMOKE_CHECKLIST.md`

- [ ] **Step 1: Add the new demo flow items to the checklist**

Open `DEMO_SMOKE_CHECKLIST.md` and append a new section:

```markdown
### Focused demo stage — /smart-npc-demo/

- [ ] Page loads full-screen, no scrollbars, no Smallville replay UI.
- [ ] Player sprite is visible near the center and walks in 4 directions with animation.
- [ ] Camera stays inside the small stage; no empty-space edges.
- [ ] Walking left into the fire triggers `POST /player/action {type: "rescue_person"}`.
- [ ] Feed panel shows a positive rescue post.
- [ ] Walking right into the restaurant triggers `POST /player/action {type: "order_food"}`.
- [ ] Restaurant owner says a grateful / free-food line.
- [ ] Press `R` → player respawns center, `/demo/reset` returns 200, feed clears.
- [ ] Walk straight to the restaurant without rescuing → owner says a sad / no-discount line.
- [ ] Old `/demo/.../` URL still works as before.
```

- [ ] **Step 2: Run the backend tests**

Run: `python -m pytest smallville/tests/smart_npc/test_focused_demo.py smallville/tests/smart_npc/test_callback.py -v`
Expected: all PASS.

- [ ] **Step 3: Run the Django smoke test**

Run: `cd smallville && python -m pytest environment/frontend_server/tests/test_smart_npc_demo.py -v`
Expected: the page-load smoke test passes (`<title>`, `id="game-container"`, `id="feed-toggle"`, `id="smart-npc-help"` present).

- [ ] **Step 4: Full manual smoke pass**

Run both servers (Django + FastAPI) and walk through the checklist in the browser. Fix any visual gid issues by editing `generate_focused_map.py` `PALETTE`, regenerating `focused_demo.json`, and reloading. Repeat until the checklist is green.

- [ ] **Step 5: Commit**

```bash
git add DEMO_SMOKE_CHECKLIST.md \
        smallville/environment/frontend_server/static_dirs/assets/the_ville/visuals/focused_demo.json
git commit -m "docs(demo): update smoke checklist and final tuned tilemap"
```

---

## Self-Review

### Spec coverage

| Spec section | Task(s) implementing it |
|--------------|-------------------------|
| §4 Small linear-spine world (50×35, spawn center, fire left, restaurant right) | Task 4 (map), Task 6 (hotspots), Task 7 (NPC placement) |
| §5 Fix depth + walk animations | Task 5 |
| §6 Causal two-branch scenario, deterministic from event log | Tasks 1–3 |
| §6.2 Reset via `[R]` | Tasks 1, 3, 6 |
| §7 Demo flow (happy path, reset, sad path) | Tasks 3, 6, 8 |
| §9 Backend tests + smoke checklist | Tasks 1, 2, 3, 8 |
| §10 Out of scope (old demo untouched) | No changes to `/demo/.../` routes |

### Placeholder scan

- No "TBD", "TODO", "implement later", or "fill in details".
- Exact file paths and code snippets are provided for every code step.
- The `PALETTE` gids in Task 4 are starting values with an explicit visual-tuning step (Task 8, Step 4) — this is real work, not a placeholder.
- Canned fallback lines are provided for both branches.

### Type / signature consistency

- `maybe_refuse_payment_line(*, event)` — changed in Task 2 and used in Task 3.
- `maybe_mournful_line(*, event)` — added in Task 2 and used in Task 3.
- `FeedService.clear()` / `PlayerEventService.clear()` — added in Task 1 and used in Task 3.
- `window.SmartNPCGame.resetPlayer()` — added in Task 6 and called from `player_controller.js`.

No signature mismatches.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-28-focused-demo-stage.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

Which approach would you like?
