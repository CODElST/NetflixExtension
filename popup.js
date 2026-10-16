(() => {
  "use strict";

  const DEFAULT_SETTINGS = { skipIntros: true, skipRecaps: true };
  const skipIntros = document.getElementById("skipIntros");
  const skipRecaps = document.getElementById("skipRecaps");
  const status = document.getElementById("status");

  function saveSettings() {
    const settings = {
      skipIntros: skipIntros.checked,
      skipRecaps: skipRecaps.checked
    };
    chrome.storage.sync.set(settings, () => {
      status.textContent = chrome.runtime.lastError
        ? "Could not save settings."
        : "Settings saved.";
    });
  }

  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    skipIntros.checked = settings.skipIntros !== false;
    skipRecaps.checked = settings.skipRecaps !== false;
    skipIntros.disabled = false;
    skipRecaps.disabled = false;
  });

  skipIntros.addEventListener("change", saveSettings);
  skipRecaps.addEventListener("change", saveSettings);
})();
