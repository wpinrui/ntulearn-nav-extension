(function () {
  "use strict";

  // === Constants ===
  const EXPAND_DELAY = 0; // ms between folder clicks (tune as needed)
  const FOLDER_BTN_SELECTOR =
    'button[data-analytics-id="content.item.folder.toggleFolder.button"][aria-expanded="false"]';
  const OUTLINE_RE = /\/ultra\/courses\/[^/]+\/outline$/;

  // === State ===
  const clicked = new WeakSet();
  let observer = null;
  let debounceTimer = null;

  // === Core ===
  function expandAllFolders() {
    const buttons = document.querySelectorAll(FOLDER_BTN_SELECTOR);
    let delay = 0;
    buttons.forEach(function (btn) {
      if (clicked.has(btn)) return;
      clicked.add(btn);
      if (EXPAND_DELAY === 0) {
        btn.click();
      } else {
        setTimeout(function () { btn.click(); }, delay);
        delay += EXPAND_DELAY;
      }
    });
  }

  function scheduleExpand() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(expandAllFolders, 100);
  }

  // === Observer lifecycle ===
  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver(scheduleExpand);
    observer.observe(document.body, { childList: true, subtree: true });
    expandAllFolders();
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    clearTimeout(debounceTimer);
  }

  // === SPA Navigation Detection ===
  function isOutlinePage() {
    return OUTLINE_RE.test(location.pathname);
  }

  function onNavigate() {
    if (isOutlinePage()) {
      startObserver();
    } else {
      stopObserver();
    }
  }

  const _pushState = history.pushState;
  history.pushState = function () {
    const result = _pushState.apply(this, arguments);
    onNavigate();
    return result;
  };

  const _replaceState = history.replaceState;
  history.replaceState = function () {
    const result = _replaceState.apply(this, arguments);
    onNavigate();
    return result;
  };

  window.addEventListener("popstate", onNavigate);

  // === Bootstrap ===
  function start() {
    onNavigate();
  }

  if (document.body) {
    start();
  } else {
    document.addEventListener("DOMContentLoaded", start);
  }
})();
