(() => {
  "use strict";

  const SKIP_BUTTON_SELECTORS = [
    '[data-uia="player-skip-intro"]',
    '[data-uia="player-skip-recap"]',
    '[data-uia*="skip-intro"]',
    '[data-uia*="skip-recap"]'
  ].join(",");

  const SKIP_LABEL = /\bskip\s+(the\s+)?(intro|recap)\b/i;
  const clickedButtons = new WeakSet();
  const watchedVisibility = new WeakMap();
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
      if (!isNetflixSkipButton && !SKIP_LABEL.test(getButtonLabel(element))) continue;
      if (isVisible(element)) return element;
      if (!hiddenCandidate) hiddenCandidate = element;
    }

    return hiddenCandidate;
  }

  function clickSkipButton(button) {
    const label = `${button.getAttribute("data-uia") || ""} ${getButtonLabel(button)}`;
    clickedButtons.add(button);
    button.click();

    if (/\bintro\b/i.test(label)) {
      stopped = true;
      observer.disconnect();
      stopWatchingVisibility(button);
    }
  }

  function scanAndSkip() {
    scanQueued = false;
    if (stopped) return;
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
    if (stopped || scanQueued) return;
    scanQueued = true;
    window.requestAnimationFrame(scanAndSkip);
  }

  observer = new MutationObserver(queueScan);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-label", "data-uia", "title", "class"]
  });

  window.addEventListener("netflix-auto-skip-route-change-v1", () => {
    const nextEpisodeKey = getEpisodeKey();
    if (!nextEpisodeKey) {
      episodeKey = null;
      return;
    }
    if (nextEpisodeKey === episodeKey) return;

    episodeKey = nextEpisodeKey;
    if (stopped) {
      stopped = false;
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["aria-label", "data-uia", "title", "class"]
      });
    }
    queueScan();
  });

  queueScan();
})();
