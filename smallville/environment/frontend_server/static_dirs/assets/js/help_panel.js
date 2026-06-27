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
