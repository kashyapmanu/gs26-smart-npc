// Smart NPCs: player controller. Hooks into the upstream Phaser demo's
// existing `player` object (camera-centred observer controlled via arrow
// keys). Adds WASD as supplementary movement keys and posts actions when
// the player centre enters configured hotspots.
(function () {
  const SMART_NPC_API = window.SMART_NPC_API || "http://localhost:8000";

  // Per-hotspot "already fired in this dwell" guard. Reset when player
  // leaves the hotspot radius.
  const hotspotState = new Map(); // hotspot.key -> boolean (currently inside)
  let wasdKeys = null;

  function bindWASD(scene) {
    if (wasdKeys) return;
    wasdKeys = scene.input.keyboard.addKeys("W,A,S,D");
  }

  function applyWASD(player) {
    if (!wasdKeys || !player || !player.body) return;
    const camera_speed = 400; // matches upstream's `const camera_speed = 400;`
    if (wasdKeys.A.isDown)  { player.body.setVelocityX(-camera_speed); }
    if (wasdKeys.D.isDown)  { player.body.setVelocityX(camera_speed);  }
    if (wasdKeys.W.isDown)  { player.body.setVelocityY(-camera_speed); }
    if (wasdKeys.S.isDown)  { player.body.setVelocityY(camera_speed);  }
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
        // left the hotspot: allow re-trigger on next enter
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
    // Called from the upstream create() inside scene context:
    init: function (scene) {
      bindWASD(scene);
    },
    // Called from upstream update(time, delta) each frame:
    update: function (scene, player) {
      applyWASD(player);
      checkHotspots(scene, player);
    }
  };
})();