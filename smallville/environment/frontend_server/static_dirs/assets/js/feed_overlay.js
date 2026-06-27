// Smart NPCs: live social-feed overlay. Subscribes to /feed/stream (SSE) and
// renders posts with a reach counter. Pure display — no game logic.
(function () {
  const API = window.SMART_NPC_API || "http://localhost:8001";
  let started = false;

  function ensurePanel() {
    let p = document.getElementById("smart-npc-feed");
    if (!p) {
      p = document.createElement("div");
      p.id = "smart-npc-feed";
      const header = document.createElement("div");
      header.className = "header";
      header.innerHTML = '<span>Town Feed</span>' +
        '<button id="smart-npc-propagate" title="Start NPC retweets">Spread the word</button>';
      p.appendChild(header);
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Walk into the burning house (left) to seed the first post.";
      p.appendChild(empty);
      document.body.appendChild(p);

      document.getElementById("smart-npc-propagate").addEventListener("click", function () {
        const btn = this;
        btn.disabled = true;
        btn.textContent = "spreading...";
        fetch(API + "/orchestrator/start", { method: "POST" })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            btn.textContent = data.status === "started" ? "spread started" : "already running";
          })
          .catch(function () {
            btn.textContent = "failed — check API";
            btn.disabled = false;
          });
      });
    }
    return p;
  }

  function ensureHelp() {
    let h = document.getElementById("smart-npc-help");
    if (h) return h;
    h = document.createElement("div");
    h.id = "smart-npc-help";
    h.innerHTML = '<h3>How to play this demo</h3>' +
      '<ol>' +
      '<li>Move your avatar with <span class="key">WASD</span> or arrow keys.</li>' +
      '<li>Walk into the <b>burning house</b> (left) to <b>rescue</b> someone.</li>' +
      '<li>Click <b>Spread the word</b> in the Town Feed to watch NPCs retweet the rescue.</li>' +
      '<li>Walk into the <b>restaurant</b> (lower-right) to order food — the owner may react to the rescue.</li>' +
      '</ol>' +
      '<div class="controls"><b>Tip:</b> if the camera loses the player, just press any movement key.</div>';
    document.body.appendChild(h);
    return h;
  }

  function escapeHtml(s) {
    return s ? String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    }) : "";
  }

  function renderPost(panel, post) {
    const empty = panel.querySelector(".empty");
    if (empty) empty.remove();
    const id = "smart-npc-post-" + post.id;
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      el.className = "post";
      panel.appendChild(el);
    }
    el.innerHTML = '<span class="author">@' + escapeHtml(post.author) + '</span>'
                 + '<span class="reach">reach ' + escapeHtml(String(post.reach)) + '</span>'
                 + '<div>' + escapeHtml(post.text) + '</div>';
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
      ensureHelp();
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