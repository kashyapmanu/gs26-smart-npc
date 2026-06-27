// Smart NPCs: live social-feed overlay. Subscribes to /feed/stream (SSE) and
// renders posts with a reach counter. The panel is hidden by default and opened
// via a toggle button.
(function () {
  const API = window.SMART_NPC_API || "http://localhost:8001";
  let started = false;

  function ensurePanel() {
    let p = document.getElementById("smart-npc-feed");
    if (!p) {
      p = document.createElement("div");
      p.id = "smart-npc-feed";
      p.className = "hidden";
      document.body.appendChild(p);
    }
    if (!p.querySelector(".header")) {
      const header = document.createElement("div");
      header.className = "header";
      header.innerHTML = '<span>Town Feed</span>' +
        '<button id="smart-npc-propagate" title="Start NPC retweets">Spread the word</button>';
      p.appendChild(header);

      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Walk into the burning house (left) to seed the first post.";
      p.appendChild(empty);

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

  function startStream() {
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
      setTimeout(function () {
        try { es = new EventSource(API + "/feed/stream"); } catch (e) { return; }
        es.onmessage = function (m) {
          try { renderPost(panel, JSON.parse(m.data)); } catch (e) { /* ignore */ }
        };
      }, 2000);
    };
  }

  window.SmartNPCFeed = {
    attachToggle: function (buttonId) {
      const btn = document.getElementById(buttonId);
      if (!btn) return;
      btn.addEventListener("click", function () {
        const panel = ensurePanel();
        const hidden = panel.classList.contains("hidden");
        if (hidden) {
          panel.classList.remove("hidden");
          btn.textContent = "Close Feed";
          startStream();
        } else {
          panel.classList.add("hidden");
          btn.textContent = "Town Feed";
        }
      });
    },
    start: function () {
      startStream();
    }
  };
})();
