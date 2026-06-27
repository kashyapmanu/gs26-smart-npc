// Smart NPCs: live social-feed overlay. Subscribes to /feed/stream (SSE) and
// renders posts with a reach counter. Pure display — no game logic.
(function () {
  const API = window.SMART_NPC_API || "http://localhost:8000";
  let started = false;

  function ensurePanel() {
    let p = document.getElementById("smart-npc-feed");
    if (!p) {
      p = document.createElement("div");
      p.id = "smart-npc-feed";
      const header = document.createElement("div");
      header.className = "header";
      header.textContent = "Town Feed";
      p.appendChild(header);
      document.body.appendChild(p);
    }
    return p;
  }

  function escapeHtml(s) {
    return s ? String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    }) : "";
  }

  function renderPost(panel, post) {
    const el = document.createElement("div");
    el.className = "post";
    el.innerHTML = '<span class="author">@' + escapeHtml(post.author) + '</span>'
                 + '<span class="reach">reach ' + escapeHtml(String(post.reach)) + '</span>'
                 + '<div>' + escapeHtml(post.text) + '</div>';
    panel.appendChild(el);
    panel.scrollTop = panel.scrollHeight;
  }

  function renderWarn(panel, msg) {
    const el = document.createElement("div");
    el.className = "warn";
    el.textContent = msg;
    panel.appendChild(el);
  }

  window.SmartNPCFeed = {
    start: function () {
      if (started) return;
      started = true;
      const panel = ensurePanel();
      let es;
      try {
        es = new EventSource(API + "/feed/stream");
      } catch (e) {
        renderWarn(panel, "EventSource not supported; feed overlay disabled");
        return;
      }
      es.onmessage = function (m) {
        try { renderPost(panel, JSON.parse(m.data)); } catch (e) { /* ignore */ }
      };
      es.onerror = function () {
        renderWarn(panel, "feed stream interrupted — retrying...");
        es.close();
        // Try to reconnect once after 2 seconds; give up silently if it fails again.
        setTimeout(function () {
          try { es = new EventSource(API + "/feed/stream"); } catch (e) { return; }
          es.onmessage = function (m) {
            try { renderPost(panel, JSON.parse(m.data)); } catch (e) { /* ignore */ }
          };
        }, 2000);
      };
    }
  };
})();