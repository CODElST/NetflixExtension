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
  let scanQueued = false;
  let visibilityPoll = null;

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
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      Number(style.opacity) > 0 &&
      rect.width > 0 &&
      rect.height > 0
    );
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
    clickedButtons.add(button);
    button.click();
    console.info("Netflix Auto Skip: skipped intro or recap.");
  }

  function stopVisibilityPoll() {
    if (visibilityPoll === null) return;
    window.clearInterval(visibilityPoll);
    visibilityPoll = null;
  }

  function scanAndSkip() {
    scanQueued = false;
    const button = findSkipButton();
    if (!button) return;

    if (isVisible(button)) {
      stopVisibilityPoll();
      clickSkipButton(button);
      return;
    }

    // Poll briefly only when Netflix has mounted a matching but hidden button.
    if (visibilityPoll !== null) return;
    let attempts = 0;
    visibilityPoll = window.setInterval(() => {
      attempts += 1;
      const candidate = findSkipButton();
      if (candidate && isVisible(candidate)) {
        stopVisibilityPoll();
        clickSkipButton(candidate);
      } else if (!candidate || attempts >= 20) {
        stopVisibilityPoll();
      }
    }, 100);
  }

  function queueScan() {
    if (scanQueued) return;
    scanQueued = true;
    window.requestAnimationFrame(scanAndSkip);
  }

  const observer = new MutationObserver(queueScan);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-label", "data-uia", "title", "class"]
  });

  queueScan();
})();
