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
