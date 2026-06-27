# Simplified Full-Screen Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new full-screen, game-like demo page at `/smart-npc-demo/` that replaces the Smallville replay chrome with a focused three-beat experience.

**Architecture:** Create a new Django view/template that loads only the Phaser map and floating Smart NPCs UI. Extract the reusable Phaser boot code from the existing `demo/main_script.html` into a standalone JS module. Update the player controller to center the camera and clamp movement. The backend and demo flow remain unchanged.

**Tech Stack:** Django 2.2 templates, Phaser 3, vanilla JS, SSE, existing FastAPI backend on :8001.

---

## File map

| File | Responsibility |
|------|----------------|
| `smallville/environment/frontend_server/frontend_server/urls.py` | Add `/smart-npc-demo/` route |
| `smallville/environment/frontend_server/translator/views.py` | Add `smart_npc_demo` view |
| `smallville/environment/frontend_server/templates/smart_npc/demo.html` | New clean full-screen template |
| `smallville/environment/frontend_server/static_dirs/css/smart_npc_demo.css` | Full-screen layout + floating panel styles |
| `smallville/environment/frontend_server/static_dirs/assets/js/smart_npc_game.js` | Reusable Phaser preload/create/update |
| `smallville/environment/frontend_server/static_dirs/assets/js/player_controller.js` | WASD + camera follow + map bounds |
| `smallville/environment/frontend_server/static_dirs/assets/js/feed_overlay.js` | Feed panel, now opened via button |
| `smallville/environment/frontend_server/static_dirs/assets/js/help_panel.js` | Collapsible help panel |
| `start_demo.sh` | Open new URL |
| `DEMO_SMOKE_CHECKLIST.md` | Update demo URL and steps |
| `smallville/environment/frontend_server/tests/test_smart_npc_demo.py` | Frontend smoke test |

---

### Task 1: Add Django route and view for `/smart-npc-demo/`

**Files:**
- Modify: `smallville/environment/frontend_server/frontend_server/urls.py`
- Modify: `smallville/environment/frontend_server/translator/views.py`

- [ ] **Step 1: Add URL pattern**

In `smallville/environment/frontend_server/frontend_server/urls.py`, add after the existing demo line:

```python
    url(r'^smart-npc-demo/$', translator_views.smart_npc_demo, name='smart_npc_demo'),
```

- [ ] **Step 2: Add view**

In `smallville/environment/frontend_server/translator/views.py`, add:

```python
def smart_npc_demo(request):
    return render(request, 'smart_npc/demo.html')
```

- [ ] **Step 3: Verify route resolves**

Run: `cd smallville/environment/frontend_server && ../../.venv/bin/python -c "import django; django.setup(); from django.urls import reverse; print(reverse('smart_npc_demo'))"`

Expected output: `/smart-npc-demo/`

- [ ] **Step 4: Commit**

```bash
git add smallville/environment/frontend_server/frontend_server/urls.py smallville/environment/frontend_server/translator/views.py
git commit -m "feat(demo): add /smart-npc-demo/ route and view"
```

---

### Task 2: Create the clean full-screen template

**Files:**
- Create: `smallville/environment/frontend_server/templates/smart_npc/demo.html`

- [ ] **Step 1: Write template**

```html
{% load staticfiles %}
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Smart NPCs Demo</title>
  <link rel="stylesheet" href="{% static 'css/smart_npc_demo.css' %}">
</head>
<body>
  <div id="game-container"></div>

  <button id="feed-toggle" class="floating-btn" title="Open Town Feed">Town Feed</button>
  <div id="smart-npc-feed" class="hidden"></div>

  <div id="smart-npc-help">
    <div class="help-header">
      <strong>How to play</strong>
      <button id="help-toggle" title="Collapse">?</button>
    </div>
    <ol id="help-body">
      <li>Use <span class="key">WASD</span> to move.</li>
      <li>Walk into the <strong>burning house</strong> to rescue.</li>
      <li>Click <strong>Town Feed</strong>, then <strong>Spread the word</strong>.</li>
      <li>Walk to the <strong>restaurant</strong> for the callback.</li>
    </ol>
  </div>

  <script>
    window.SMART_NPC_API = window.SMART_NPC_API || "http://localhost:8001";
  </script>
  <script src='https://cdn.jsdelivr.net/npm/phaser@3.55.2/dist/phaser.js'></script>
  <script src="{% static 'assets/js/smart_npc_game.js' %}"></script>
  <script src="{% static 'assets/js/player_controller.js' %}"></script>
  <script src="{% static 'assets/js/feed_overlay.js' %}"></script>
  <script src="{% static 'assets/js/help_panel.js' %}"></script>
  <script>
    window.addEventListener("load", function () {
      SmartNPCGame.boot({
        container: "game-container",
        simCode: "July1_the_ville_isabella_maria_klaus-step-3-20"
      });
      if (window.SmartNPCFeed) window.SmartNPCFeed.attachToggle("feed-toggle");
      if (window.SmartNPCHelp) window.SmartNPCHelp.init("smart-npc-help", "help-toggle", "help-body");
    });
  </script>
</body>
</html>
```

- [ ] **Step 2: Verify template renders without errors**

Run the dev server and curl: `curl -s http://127.0.0.1:8000/smart-npc-demo/ | head -5`

Expected: HTML containing `<title>Smart NPCs Demo</title>`

- [ ] **Step 3: Commit**

```bash
git add smallville/environment/frontend_server/templates/smart_npc/demo.html
git commit -m "feat(demo): add clean full-screen demo template"
```

---

### Task 3: Add full-screen CSS

**Files:**
- Create: `smallville/environment/frontend_server/static_dirs/css/smart_npc_demo.css`

- [ ] **Step 1: Write CSS**

```css
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
}

#game-container {
  width: 100vw;
  height: 100vh;
}

#game-container canvas {
  display: block;
}

.floating-btn {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 101;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid #5fd1a8;
  background: rgba(20, 20, 28, 0.92);
  color: #5fd1a8;
  border-radius: 6px;
  cursor: pointer;
}

#smart-npc-feed {
  position: fixed;
  top: 50px;
  right: 12px;
  width: 340px;
  max-height: 60vh;
  overflow-y: auto;
  background: rgba(20, 20, 28, 0.92);
  color: #f4f4f4;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 12px;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 10px;
  z-index: 100;
  box-shadow: 0 4px 18px rgba(0,0,0,.4);
}
#smart-npc-feed.hidden { display: none; }
#smart-npc-feed .header {
  font-weight: 700;
  margin-bottom: 8px;
  border-bottom: 1px solid #444;
  padding-bottom: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
#smart-npc-feed .post {
  margin: 0 0 8px;
  padding: 6px 8px;
  border-left: 3px solid #5fd1a8;
  background: rgba(255,255,255,.04);
  border-radius: 0 4px 4px 0;
}
#smart-npc-feed .post .author { color: #5fd1a8; font-weight: 600; }
#smart-npc-feed .post .reach  { color: #c7a36a; margin-left: 6px; }
#smart-npc-feed .warn { color: #ff8b8b; font-style: italic; }
#smart-npc-feed .empty {
  color: #aaa;
  font-style: italic;
  text-align: center;
  padding: 8px;
}
#smart-npc-propagate {
  font-size: 11px;
  padding: 4px 8px;
  border: 1px solid #5fd1a8;
  background: rgba(95, 209, 168, 0.15);
  color: #5fd1a8;
  border-radius: 4px;
  cursor: pointer;
}
#smart-npc-propagate:disabled { opacity: 0.5; cursor: default; }

#smart-npc-help {
  position: fixed;
  bottom: 12px;
  left: 12px;
  width: 260px;
  background: rgba(20, 20, 28, 0.92);
  color: #f4f4f4;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 13px;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 14px;
  z-index: 100;
  box-shadow: 0 4px 18px rgba(0,0,0,.4);
}
#smart-npc-help.collapsed #help-body { display: none; }
#smart-npc-help .help-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
#smart-npc-help .help-header strong { color: #5fd1a8; }
#help-toggle {
  background: #333;
  color: #f4f4f4;
  border: none;
  border-radius: 4px;
  width: 22px;
  height: 22px;
  cursor: pointer;
}
#smart-npc-help ol {
  margin: 0 0 0 18px;
  padding: 0;
  line-height: 1.6;
}
#smart-npc-help li { margin-bottom: 6px; }
#smart-npc-help .key {
  background: #333;
  padding: 2px 5px;
  border-radius: 4px;
  font-family: ui-monospace, Menlo, monospace;
}
```

- [ ] **Step 2: Verify static file is served**

Run: `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/static/css/smart_npc_demo.css`

Expected: `200`

- [ ] **Step 3: Commit**

```bash
git add smallville/environment/frontend_server/static_dirs/css/smart_npc_demo.css
git commit -m "feat(demo): add full-screen demo styles"
```

---

### Task 4: Extract reusable Phaser game boot code

**Files:**
- Create: `smallville/environment/frontend_server/static_dirs/assets/js/smart_npc_game.js`
- Modify: `smallville/environment/frontend_server/templates/demo/main_script.html` (later, keep working)

- [ ] **Step 1: Extract boot module**

Create `smallville/environment/frontend_server/static_dirs/assets/js/smart_npc_game.js` containing the Phaser `preload`, `create`, and `update` logic currently embedded in `templates/demo/main_script.html`. Expose:

```javascript
window.SmartNPCGame = {
  boot: function (opts) {
    const container = opts.container || "game-container";
    const simCode = opts.simCode || "July1_the_ville_isabella_maria_klaus-step-3-20";
    const step = opts.step || "1";
    const playSpeed = opts.playSpeed || "1";
    // Build the same Phaser config as today but without Smallville UI code.
    // Load tilemap, sprites, spawn a single player sprite at a start position,
    // and call SmartNPCPlayer.init(scene) / SmartNPCPlayer.update(scene, player) each frame.
  }
};
```

The module should:
- Load assets from the same paths as `main_script.html`.
- Create the tilemap and collision layers.
- Spawn a player sprite at a fixed start position (e.g., x=400, y=300).
- In `update`, call `SmartNPCPlayer.update(scene, player)`.
- Set `this.cameras.main.startFollow(player)` and `this.cameras.main.setBounds(...)`.
- Set `this.physics.world.setBounds(...)` and `player.setCollideWorldBounds(true)`.

- [ ] **Step 2: Verify no JS syntax errors**

Run: `node --check smallville/environment/frontend_server/static_dirs/assets/js/smart_npc_game.js`

Expected: no output (success)

- [ ] **Step 3: Commit**

```bash
git add smallville/environment/frontend_server/static_dirs/assets/js/smart_npc_game.js
git commit -m "feat(demo): extract reusable Phaser boot module"
```

---

### Task 5: Update player controller for camera follow and bounds

**Files:**
- Modify: `smallville/environment/frontend_server/static_dirs/assets/js/player_controller.js`

- [ ] **Step 1: Update controller**

Replace the existing file with:

```javascript
(function () {
  const SMART_NPC_API = window.SMART_NPC_API || "http://localhost:8001";
  const hotspotState = new Map();
  let wasdKeys = null;

  function bindWASD(scene) {
    if (wasdKeys) return;
    wasdKeys = scene.input.keyboard.addKeys("W,A,S,D");
  }

  function applyWASD(player) {
    if (!wasdKeys || !player || !player.body) return;
    const speed = 300;
    let vx = 0;
    let vy = 0;
    if (wasdKeys.A.isDown) vx -= speed;
    if (wasdKeys.D.isDown) vx += speed;
    if (wasdKeys.W.isDown) vy -= speed;
    if (wasdKeys.S.isDown) vy += speed;
    player.body.setVelocity(vx, vy);
  }

  function checkHotspots(scene, player) {
    if (!player || !player.body) return;
    const hotspots = window.SMART_NPC_HOTSPOTS || [];
    const px = player.body.x;
    const py = player.body.y;
    for (const h of hotspots) {
      const dx = px - h.x;
      const dy = py - h.y;
      const inside = Math.sqrt(dx * dx + dy * dy) < (h.r || 32);
      const key = h.type + "|" + h.where;
      if (inside && !hotspotState.get(key)) {
        hotspotState.set(key, true);
        postAction({ type: h.type, where: h.where, t: scene.time.now / 1000 });
      } else if (!inside && hotspotState.get(key)) {
        hotspotState.set(key, false);
      }
    }
  }

  async function postAction(payload) {
    try {
      await fetch(`${SMART_NPC_API}/player/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn("smart-npc postAction failed", e);
    }
  }

  window.SmartNPCPlayer = {
    init: function (scene, player) {
      bindWASD(scene);
    },
    update: function (scene, player) {
      applyWASD(player);
      checkHotspots(scene, player);
    }
  };
})();
```

- [ ] **Step 2: Check syntax**

Run: `node --check smallville/environment/frontend_server/static_dirs/assets/js/player_controller.js`

Expected: no output

- [ ] **Step 3: Commit**

```bash
git add smallville/environment/frontend_server/static_dirs/assets/js/player_controller.js
git commit -m "feat(demo): camera-centered WASD controller with map bounds"
```

---

### Task 6: Update feed overlay to open via button

**Files:**
- Modify: `smallville/environment/frontend_server/static_dirs/assets/js/feed_overlay.js`

- [ ] **Step 1: Add attachToggle method**

Add to the exported `window.SmartNPCFeed` object:

```javascript
attachToggle: function (buttonId) {
  const btn = document.getElementById(buttonId);
  const panel = ensurePanel();
  if (!btn) return;
  btn.addEventListener("click", function () {
    const hidden = panel.classList.contains("hidden");
    if (hidden) {
      panel.classList.remove("hidden");
      btn.textContent = "Close Feed";
      window.SmartNPCFeed.start();
    } else {
      panel.classList.add("hidden");
      btn.textContent = "Town Feed";
    }
  });
}
```

Ensure `start()` only initializes the SSE stream once even if called multiple times (the existing `started` guard already handles this).

- [ ] **Step 2: Check syntax**

Run: `node --check smallville/environment/frontend_server/static_dirs/assets/js/feed_overlay.js`

Expected: no output

- [ ] **Step 3: Commit**

```bash
git add smallville/environment/frontend_server/static_dirs/assets/js/feed_overlay.js
git commit -m "feat(demo): feed overlay opens via toggle button"
```

---

### Task 7: Create collapsible help panel

**Files:**
- Create: `smallville/environment/frontend_server/static_dirs/assets/js/help_panel.js`

- [ ] **Step 1: Write module**

```javascript
(function () {
  window.SmartNPCHelp = {
    init: function (panelId, toggleId, bodyId) {
      const panel = document.getElementById(panelId);
      const toggle = document.getElementById(toggleId);
      if (!panel || !toggle) return;
      toggle.addEventListener("click", function () {
        panel.classList.toggle("collapsed");
        toggle.textContent = panel.classList.contains("collapsed") ? "?" : "×";
      });
    }
  };
})();
```

- [ ] **Step 2: Check syntax**

Run: `node --check smallville/environment/frontend_server/static_dirs/assets/js/help_panel.js`

Expected: no output

- [ ] **Step 3: Commit**

```bash
git add smallville/environment/frontend_server/static_dirs/assets/js/help_panel.js
git commit -m "feat(demo): add collapsible help panel"
```

---

### Task 8: Load hotspot config in the new demo

**Files:**
- Modify: `smallville/environment/frontend_server/templates/smart_npc/demo.html`

- [ ] **Step 1: Add hotspot fetch**

Before the game script tags, add:

```html
<script>
  (async function () {
    try {
      const r = await fetch("/static/demo_data/hotspots.json");
      window.SMART_NPC_HOTSPOTS = await r.json();
    } catch (e) {
      console.warn("smart-npc: could not load hotspots", e);
      window.SMART_NPC_HOTSPOTS = [];
    }
  })();
</script>
```

- [ ] **Step 2: Commit**

```bash
git add smallville/environment/frontend_server/templates/smart_npc/demo.html
git commit -m "feat(demo): load hotspot config in new demo page"
```

---

### Task 9: Update start script and smoke checklist

**Files:**
- Modify: `start_demo.sh`
- Modify: `DEMO_SMOKE_CHECKLIST.md`

- [ ] **Step 1: Change demo URL in start script**

In `start_demo.sh`, change:

```bash
DEMO_URL="http://127.0.0.1:8000/smart-npc-demo/"
```

- [ ] **Step 2: Update smoke checklist**

In `DEMO_SMOKE_CHECKLIST.md`, replace references to `/demo/.../` with `/smart-npc-demo/`, and remove the Play/Pause/Time checks.

- [ ] **Step 3: Commit**

```bash
git add start_demo.sh DEMO_SMOKE_CHECKLIST.md
git commit -m "docs(demo): point start script and checklist to new /smart-npc-demo/ URL"
```

---

### Task 10: Add frontend smoke test

**Files:**
- Create: `smallville/environment/frontend_server/tests/test_smart_npc_demo.py`

- [ ] **Step 1: Write test**

```python
import pytest
from django.test import Client


@pytest.mark.django_db
def test_smart_npc_demo_renders():
    c = Client()
    response = c.get('/smart-npc-demo/')
    assert response.status_code == 200
    content = response.content.decode('utf-8')
    assert '<title>Smart NPCs Demo</title>' in content
    assert 'id="game-container"' in content
    assert 'id="feed-toggle"' in content
    assert 'id="smart-npc-help"' in content
    assert '/static/css/smart_npc_demo.css' in content
    assert '/static/assets/js/smart_npc_game.js' in content
```

- [ ] **Step 2: Run test**

Run: `cd smallville && .venv/bin/python -m pytest environment/frontend_server/tests/test_smart_npc_demo.py -v`

Expected: `test_smart_npc_demo_renders PASSED`

- [ ] **Step 3: Commit**

```bash
git add smallville/environment/frontend_server/tests/test_smart_npc_demo.py
git commit -m "test(demo): add smoke test for new demo page"
```

---

### Task 11: Manual end-to-end verification

- [ ] **Step 1: Start servers**

```bash
./start_demo.sh
```

- [ ] **Step 2: Verify full-screen layout**

Open `http://127.0.0.1:8000/smart-npc-demo/`. Confirm:
- Map fills the entire browser window.
- No Smallville UI (no Play/Pause, no character grid, no time display).
- "Town Feed" button is top-right.
- Help panel is bottom-left and can be collapsed.

- [ ] **Step 3: Verify three beats**

1. Press WASD — player moves, camera follows.
2. Walk to burning house (left side) — feed post appears.
3. Open Town Feed, click "Spread the word" — retweets stream in.
4. Walk to restaurant (lower-right) — owner callback line appears.

- [ ] **Step 4: Commit any final tweaks**

```bash
git add -A
git commit -m "fix(demo): final full-screen demo tweaks"
```

---

## Spec coverage check

| Spec requirement | Task |
|---|---|
| New `/smart-npc-demo/` route | Task 1 |
| Full-screen map, no scrollbars | Task 2, 3 |
| Floating Town Feed button/panel | Task 2, 3, 6 |
| Collapsible help panel | Task 2, 3, 7 |
| WASD-only movement | Task 5 |
| Camera strictly centered on player | Task 4, 5 |
| Map bounds clamping | Task 4 |
| Rescue → propagation → callback flow | Task 4, 5, 8 (unchanged backend) |
| Old `/demo/.../` still works | Old code untouched |
| Update start script & checklist | Task 9 |
| Frontend smoke test | Task 10 |

## Placeholder scan
- No TBD/TODO/FIXME placeholders.
- All file paths are exact.
- All code blocks contain runnable code.

## Type consistency
- `SmartNPCGame.boot(opts)` accepts `container`, `simCode`, `step`, `playSpeed`.
- `SmartNPCPlayer.init(scene, player)` and `SmartNPCPlayer.update(scene, player)` signatures match across Task 4 and Task 5.
- `SmartNPCFeed.attachToggle(buttonId)` is called in Task 2 with the ID `"feed-toggle"`.
- `SmartNPCHelp.init(panelId, toggleId, bodyId)` is called in Task 2 with `"smart-npc-help"`, `"help-toggle"`, `"help-body"`.