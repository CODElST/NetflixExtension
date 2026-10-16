(() => {
  "use strict";

  const SKIP_BUTTON_SELECTORS = [
    '[data-uia="player-skip-intro"]',
    '[data-uia="player-skip-recap"]',
    '[data-uia*="skip-intro"]',
    '[data-uia*="skip-recap"]'
  ].join(",");

  const SKIP_LABEL = /\bskip\s+(the\s+)?(intro|recap)\b/i;
  const DEFAULT_SETTINGS = { skipIntros: true, skipRecaps: true };
  const clickedButtons = new WeakSet();
  const watchedVisibility = new Map();
  let settings = { ...DEFAULT_SETTINGS };
  let settingsReady = false;
  let scanQueued = false;
  let stopped = false;
  let observer;
  let episodeKey = getEpisodeKey();

  function getEpisodeKey() {
    return window.location.pathname.match(/\/watch\/([^/]+)/)?.[1] || null;
  }

  function getButtonLabel(element) {
    return [
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
      element.innerText,
      element.textContent
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getSkipType(element) {
    const label = `${element.getAttribute("data-uia") || ""} ${getButtonLabel(element)}`;
    if (/skip[-_\s]+(the[-_\s]+)?intro|\bskip\s+(the\s+)?intro\b/i.test(label)) {
      return "intro";
    }
    if (/skip[-_\s]+(the[-_\s]+)?recap|\bskip\s+(the\s+)?recap\b/i.test(label)) {
      return "recap";
    }
    return null;
  }

  function hasEnabledSkips() {
    return settings.skipIntros || settings.skipRecaps;
  }

  function observePlayer() {
    if (!settingsReady || !hasEnabledSkips() || stopped) return;
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-label", "data-uia", "title", "class"]
    });
    queueScan();
  }

  function clearVisibilityWatches() {
    for (const element of watchedVisibility.keys()) {
      stopWatchingVisibility(element);
    }
  }

  function applySettings(nextSettings) {
    settings = {
      skipIntros: nextSettings.skipIntros !== false,
      skipRecaps: nextSettings.skipRecaps !== false
    };
    settingsReady = true;
    clearVisibilityWatches();

    if (hasEnabledSkips()) {
      stopped = false;
      observePlayer();
    } else {
      observer.disconnect();
    }
  }

  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;

    for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
      const style = window.getComputedStyle(ancestor);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number(style.opacity) <= 0
      ) return false;
    }

    return true;
  }

  function watchForVisibility(element) {
    if (watchedVisibility.has(element)) return;
    const targets = [];
    const onVisibilityChange = () => {
      if (isVisible(element)) queueScan();
    };

    for (let target = element; target; target = target.parentElement) {
      target.addEventListener("transitionend", onVisibilityChange);
      target.addEventListener("animationend", onVisibilityChange);
      targets.push(target);
    }

    watchedVisibility.set(element, { targets, onVisibilityChange });
  }

  function stopWatchingVisibility(element) {
    const watcher = watchedVisibility.get(element);
    if (!watcher) return;

    for (const target of watcher.targets) {
      target.removeEventListener("transitionend", watcher.onVisibilityChange);
      target.removeEventListener("animationend", watcher.onVisibilityChange);
    }
    watchedVisibility.delete(element);
  }

  function findSkipButton() {
    const candidates = document.querySelectorAll(
      `${SKIP_BUTTON_SELECTORS}, button, [role="button"]`
    );
    let hiddenCandidate = null;

    for (const element of candidates) {
      if (element.disabled || element.getAttribute("aria-disabled") === "true") continue;
      if (clickedButtons.has(element)) continue;

      const isNetflixSkipButton = element.matches(SKIP_BUTTON_SELECTORS);
      const skipType = getSkipType(element);
      if (!skipType || (!isNetflixSkipButton && !SKIP_LABEL.test(getButtonLabel(element)))) continue;
      if (skipType === "intro" && !settings.skipIntros) continue;
      if (skipType === "recap" && !settings.skipRecaps) continue;
      if (isVisible(element)) return element;
      if (!hiddenCandidate) hiddenCandidate = element;
    }

    return hiddenCandidate;
  }

  function clickSkipButton(button) {
    const skipType = getSkipType(button);
    clickedButtons.add(button);
    button.click();

    if (skipType === "intro" || (skipType === "recap" && !settings.skipIntros)) {
      stopped = true;
      observer.disconnect();
      clearVisibilityWatches();
    }
  }

  function scanAndSkip() {
    scanQueued = false;
    if (!settingsReady || !hasEnabledSkips() || stopped) return;
    const button = findSkipButton();
    if (!button) return;

    if (isVisible(button)) {
      stopWatchingVisibility(button);
      clickSkipButton(button);
      return;
    }

    watchForVisibility(button);
  }

  function queueScan() {
    if (!settingsReady || !hasEnabledSkips() || stopped || scanQueued) return;
    scanQueued = true;
    window.requestAnimationFrame(scanAndSkip);
  }

  observer = new MutationObserver(queueScan);

  chrome.storage.sync.get(DEFAULT_SETTINGS, applySettings);
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") return;
    if (!changes.skipIntros && !changes.skipRecaps) return;
    applySettings({
      skipIntros: changes.skipIntros?.newValue ?? settings.skipIntros,
      skipRecaps: changes.skipRecaps?.newValue ?? settings.skipRecaps
    });
  });

  window.addEventListener("netflix-auto-skip-route-change-v1", () => {
    const nextEpisodeKey = getEpisodeKey();
    if (!nextEpisodeKey) {
      episodeKey = null;
      return;
    }
    if (nextEpisodeKey === episodeKey) return;

    episodeKey = nextEpisodeKey;
    if (stopped) stopped = false;
    observePlayer();
    queueScan();
  });
})();
