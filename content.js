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

    for (const element of candidates) {
      if (
        !isVisible(element) ||
        element.disabled ||
        element.getAttribute("aria-disabled") === "true" ||
        clickedButtons.has(element)
      ) continue;

      const isNetflixSkipButton = element.matches(SKIP_BUTTON_SELECTORS);
      if (isNetflixSkipButton || SKIP_LABEL.test(getButtonLabel(element))) {
        return element;
      }
    }

    return null;
  }

  function scanAndSkip() {
    scanQueued = false;
    const button = findSkipButton();
    if (!button) return;

    clickedButtons.add(button);
    button.click();
    console.info("Netflix Auto Skip: skipped intro or recap.");
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

  // Netflix can reveal an existing player control through CSS without a DOM
  // mutation, so periodically check as a fallback to the mutation observer.
  window.setInterval(queueScan, 500);
  queueScan();
})();
