(function () {
  const SMART_NPC_API = window.SMART_NPC_API || "http://localhost:8001";
  const hotspotState = new Map();
  let keys = null;
  let resetKey = null;

  function bindKeys(scene) {
    if (keys) return;
    keys = scene.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT");
    resetKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    resetKey.on("down", onReset);
  }

  async function onReset() {
    try {
      const response = await fetch(`${SMART_NPC_API}/demo/reset`, { method: "POST" });
      if (!response.ok) {
        console.warn("smart-npc reset failed: HTTP " + response.status);
        return;
      }
      hotspotState.clear();
      if (window.SmartNPCGame && window.SmartNPCGame.resetPlayer) {
        window.SmartNPCGame.resetPlayer();
      }
      if (window.SmartNPCFeed && window.SmartNPCFeed.clear) {
        window.SmartNPCFeed.clear();
      }
    } catch (e) {
      console.warn("smart-npc reset failed", e);
    }
  }

  function applyMovement(player) {
    if (!keys || !player || !player.body) return;
    const speed = 300;
    let vx = 0;
    let vy = 0;
    if (keys.A.isDown || keys.LEFT.isDown) vx -= speed;
    if (keys.D.isDown || keys.RIGHT.isDown) vx += speed;
    if (keys.W.isDown || keys.UP.isDown) vy -= speed;
    if (keys.S.isDown || keys.DOWN.isDown) vy += speed;
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
      bindKeys(scene);
    },
    update: function (scene, player) {
      applyMovement(player);
      checkHotspots(scene, player);
    }
  };
})();